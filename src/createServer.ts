import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { z } from 'zod';

config();

// Globally redirect ALL console output to stderr to prevent JSON-RPC protocol issues
const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  debug: console.debug
};

console.log = (...args: any[]) => console.error(...args);
console.info = (...args: any[]) => console.error(...args);
console.warn = (...args: any[]) => console.error(...args);
console.debug = (...args: any[]) => console.error(...args);

const { MonarchClient } = require('monarchmoney');

const ConfigSchema = z.object({
  MONARCH_EMAIL: z.string().email(),
  MONARCH_PASSWORD: z.string().min(1),
  MONARCH_MFA_SECRET: z.string().optional(),
});

export interface ServerConfig {
  email?: string;
  password?: string;
  mfaSecret?: string;
}

export default function createServer(config?: { config?: ServerConfig }) {
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
      // Use config from parameter if provided, otherwise from environment
      let credentials: any;

      if (config?.config) {
        credentials = config.config;
      } else {
        credentials = ConfigSchema.parse(process.env);
      }

      const email = credentials.email || credentials.MONARCH_EMAIL;
      const password = credentials.password || credentials.MONARCH_PASSWORD;
      const mfaSecretKey = credentials.mfaSecret || credentials.MONARCH_MFA_SECRET;

      console.error(`🔐 Attempting authentication for: ${email}`);

      await monarchClient.login({
        email,
        password,
        mfaSecretKey,
      });

      isAuthenticated = true;
      console.error(`✅ Successfully authenticated`);
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
          description: "Get all MonarchMoney accounts with optimization features",
          inputSchema: {
            type: "object",
            properties: {
              verbosity: {
                type: "string",
                enum: ["ultra-light", "light", "standard"],
                description: "Response verbosity level",
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