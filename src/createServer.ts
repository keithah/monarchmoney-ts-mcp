import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

const { MonarchClient } = require('monarchmoney');

export const configSchema = z.object({
  email: z.string().email().describe("MonarchMoney email address"),
  password: z.string().min(1).describe("MonarchMoney password"),
  mfaSecret: z.string().optional().describe("Optional MFA secret for TOTP")
});

class MonarchMcpServer {
  private server: Server;
  private monarchClient: any;
  private config: z.infer<typeof configSchema> | null = null;
  private isAuthenticated = false;

  constructor(config?: z.infer<typeof configSchema>) {
    this.config = config || null;
    this.server = new Server(
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

    this.monarchClient = new MonarchClient({
      baseURL: 'https://api.monarchmoney.com',
      timeout: 30000,
    });

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async ensureAuthenticated() {
    if (this.isAuthenticated) {
      return;
    }

    try {
      // Try config first, then environment variables as fallback
      const email = this.config?.email || process.env.MONARCH_EMAIL;
      const password = this.config?.password || process.env.MONARCH_PASSWORD;
      const mfaSecretKey = this.config?.mfaSecret || process.env.MONARCH_MFA_SECRET;

      if (!email || !password) {
        throw new McpError(
          ErrorCode.InvalidRequest,
          'MonarchMoney credentials are required. Please configure email and password.'
        );
      }

      console.log(`🔐 Attempting authentication for: ${email}`);

      await this.monarchClient.login({
        email,
        password,
        mfaSecretKey,
      });

      this.isAuthenticated = true;
      console.log(`✅ Successfully authenticated`);
    } catch (error: any) {
      console.error(`💥 Authentication Error: ${error.message}`);
      throw new McpError(
        ErrorCode.InternalError,
        `Authentication failed: ${error.message}`
      );
    }
  }

  private setupToolHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
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
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get_accounts':
            return await this.handleGetAccounts(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        throw new McpError(ErrorCode.InternalError, `Tool execution failed: ${error}`);
      }
    });
  }

  private async handleGetAccounts(args: any) {
    await this.ensureAuthenticated();

    const accounts = await this.monarchClient.accounts.getAll();
    const verbosity = args?.verbosity || "light";

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

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MonarchMoney MCP server running on stdio');
  }

  getServer(): Server {
    return this.server;
  }
}

// Traditional MCP server run (for local usage)
if (require.main === module) {
  const server = new MonarchMcpServer();
  server.run().catch(console.error);
}

// Smithery-compliant export
export default function createServer({ config }: { config?: z.infer<typeof configSchema> }) {
  const serverInstance = new MonarchMcpServer(config);
  return serverInstance.getServer();
}