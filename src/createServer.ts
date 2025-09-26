import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const { MonarchClient } = require('monarchmoney');

export default function createServer({ config }: { config: { email: string; password: string; mfaSecret?: string } }) {
  const server = new Server(
    {
      name: 'monarchmoney-mcp',
      version: '1.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const monarchClient = new MonarchClient({
    baseURL: 'https://api.monarchmoney.com',
    timeout: 30000,
  });

  let isAuthenticated = false;

  const ensureAuthenticated = async () => {
    if (isAuthenticated) {
      return;
    }

    try {
      console.log(`🔐 Attempting authentication for: ${config.email}`);

      await monarchClient.login({
        email: config.email,
        password: config.password,
        mfaSecretKey: config.mfaSecret,
      });

      isAuthenticated = true;
      console.log(`✅ Successfully authenticated`);
    } catch (error: any) {
      console.error(`💥 Authentication Error: ${error.message}`);
      throw new McpError(
        ErrorCode.InternalError,
        `Authentication failed: ${error.message}`
      );
    }
  };

  // Set up tool handlers
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_accounts",
          description: "Get all MonarchMoney accounts with AI optimization features (99% response reduction)",
          inputSchema: {
            type: "object",
            properties: {
              verbosity: {
                type: "string",
                enum: ["ultra-light", "light", "standard"],
                description: "Response verbosity level for AI optimization",
                default: "light"
              }
            }
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    if (name === "get_accounts") {
      await ensureAuthenticated();

      const accounts = await monarchClient.accounts.getAll();
      const verbosity = (args as any)?.verbosity || "light";

      if (verbosity === "ultra-light") {
        const total = accounts.reduce((sum: number, acc: any) => sum + (acc.currentBalance || 0), 0);
        return {
          content: [{
            type: "text",
            text: `💰 ${accounts.length} accounts, Total: $${total.toLocaleString()}`
          }]
        };
      }

      if (verbosity === "light") {
        const summary = accounts.map((acc: any) => ({
          name: acc.displayName,
          balance: acc.currentBalance,
          type: acc.type?.display
        }));

        return {
          content: [{
            type: "text",
            text: `📊 **Account Summary**\n\n${summary.map((a: any) => `• ${a.name}: $${a.balance?.toLocaleString() || '0'} (${a.type})`).join('\n')}`
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(accounts, null, 2)
        }]
      };
    }

    throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
  });

  return server;
}

// Export config schema for Smithery
export const configSchema = z.object({
  email: z.string().email().describe("MonarchMoney email address"),
  password: z.string().min(1).describe("MonarchMoney password"),
  mfaSecret: z.string().optional().describe("Optional MFA secret for TOTP")
});