#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
const { MonarchClient } = require('monarchmoney');
import { config } from 'dotenv';
import { z } from 'zod';

config();

const ConfigSchema = z.object({
  MONARCH_EMAIL: z.string().email(),
  MONARCH_PASSWORD: z.string().min(1),
  MONARCH_MFA_SECRET: z.string().optional(),
});

class MonarchMcpServer {
  private server: Server;
  private monarchClient: any;
  private isAuthenticated = false;

  constructor() {
    this.server = new Server(
      {
        name: 'monarchmoney-mcp',
        version: '1.0.0',
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
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      await this.ensureAuthenticated();
      
      // Dynamically discover all available methods from the MonarchMoney client
      const tools = this.discoverAvailableTools();
      
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      await this.ensureAuthenticated();

      const { name, arguments: args } = request.params;

      try {
        // Dynamically call the method based on tool name
        const result = await this.callDynamicMethod(name, args || {});
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  private discoverAvailableTools() {
    const tools: any[] = [];
    
    // Dynamically discover all API modules and their methods
    const apiModules = [
      { name: 'accounts', client: this.monarchClient.accounts },
      { name: 'transactions', client: this.monarchClient.transactions },
      { name: 'budgets', client: this.monarchClient.budgets },
      { name: 'categories', client: this.monarchClient.categories },
      { name: 'cashflow', client: this.monarchClient.cashflow },
      { name: 'recurring', client: this.monarchClient.recurring },
      { name: 'institutions', client: this.monarchClient.institutions },
      { name: 'insights', client: this.monarchClient.insights },
    ];

    apiModules.forEach(({ name: moduleName, client }) => {
      if (!client) return;
      
      // Get all method names from the client
      const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
        .filter(name => 
          name !== 'constructor' && 
          typeof client[name] === 'function' &&
          !name.startsWith('_') // Skip private methods
        );

      methodNames.forEach(methodName => {
        const toolName = `${moduleName}_${methodName}`;
        
        tools.push({
          name: toolName,
          description: `${this.generateMethodDescription(moduleName, methodName)}`,
          inputSchema: this.generateInputSchema(moduleName, methodName),
        });
      });
    });

    // Add direct client methods (like get_me)
    const directMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(this.monarchClient))
      .filter(name => 
        name !== 'constructor' && 
        typeof this.monarchClient[name] === 'function' &&
        !name.startsWith('_') &&
        name !== 'login' && // Skip auth methods
        name !== 'interactiveLogin'
      );

    directMethods.forEach(methodName => {
      tools.push({
        name: methodName,
        description: `${this.generateMethodDescription('client', methodName)}`,
        inputSchema: this.generateInputSchema('client', methodName),
      });
    });

    return tools;
  }

  private generateMethodDescription(moduleName: string, methodName: string): string {
    const descriptions: { [key: string]: string } = {
      // Accounts
      'accounts_getAll': 'Get all MonarchMoney accounts',
      'accounts_getById': 'Get account by ID',
      'accounts_getBalanceHistory': 'Get account balance history',
      'accounts_getNetWorthHistory': 'Get net worth history',
      'accounts_updateAccount': 'Update account information',
      'accounts_createManualAccount': 'Create a manual account',
      'accounts_deleteAccount': 'Delete an account',
      
      // Transactions
      'transactions_getTransactions': 'Get transactions with filtering options',
      'transactions_getTransactionDetails': 'Get detailed transaction information',
      'transactions_createTransaction': 'Create a new transaction',
      'transactions_updateTransaction': 'Update transaction details',
      'transactions_deleteTransaction': 'Delete a transaction',
      'transactions_getTransactionsSummary': 'Get transactions summary',
      'transactions_getTransactionRules': 'Get transaction rules',
      'transactions_createTransactionRule': 'Create transaction rule',
      'transactions_updateTransactionRule': 'Update transaction rule',
      'transactions_deleteTransactionRule': 'Delete transaction rule',
      
      // Budgets
      'budgets_getBudgets': 'Get budget information',
      'budgets_createBudget': 'Create a new budget',
      'budgets_updateBudget': 'Update budget details',
      'budgets_deleteBudget': 'Delete a budget',
      'budgets_getBudgetSummary': 'Get budget summary',
      
      // Categories
      'categories_getCategories': 'Get all transaction categories',
      'categories_createCategory': 'Create a new category',
      'categories_updateCategory': 'Update category details',
      'categories_deleteCategory': 'Delete a category',
      
      // Cashflow
      'cashflow_getCashflowSummary': 'Get cashflow summary',
      'cashflow_getCashflowWidget': 'Get cashflow widget data',
      
      // Recurring
      'recurring_getRecurringStreams': 'Get recurring income/expense streams',
      'recurring_createRecurringStream': 'Create recurring stream',
      'recurring_updateRecurringStream': 'Update recurring stream',
      'recurring_deleteRecurringStream': 'Delete recurring stream',
      
      // Institutions
      'institutions_getInstitutions': 'Get financial institutions',
      'institutions_getInstitutionAccounts': 'Get accounts for specific institution',
      
      // Insights
      'insights_getNetWorthHistory': 'Get net worth over time',
      'insights_getSpendingByCategory': 'Get spending breakdown by category',
      'insights_getIncomeVsExpenses': 'Get income vs expenses analysis',
      
      // Direct client methods
      'get_me': 'Get current user profile information',
    };

    const key = moduleName === 'client' ? methodName : `${moduleName}_${methodName}`;
    return descriptions[key] || `Execute ${methodName} on ${moduleName} module`;
  }

  private generateInputSchema(moduleName: string, methodName: string): any {
    // Common schema patterns based on method names
    if (methodName.includes('getById') || methodName.includes('ById')) {
      return {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The ID of the item to retrieve' },
        },
        required: ['id'],
      };
    }

    if (methodName.includes('Transactions') || methodName === 'getTransactions') {
      return {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Maximum number of results', default: 50 },
          offset: { type: 'number', description: 'Pagination offset', default: 0 },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          accountIds: { type: 'array', items: { type: 'string' }, description: 'Filter by account IDs' },
          categoryIds: { type: 'array', items: { type: 'string' }, description: 'Filter by category IDs' },
          search: { type: 'string', description: 'Search term' },
        },
      };
    }

    if (methodName.includes('History') || methodName.includes('OverTime')) {
      return {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
        },
      };
    }

    if (methodName.includes('create') || methodName.includes('update')) {
      return {
        type: 'object',
        properties: {
          data: { type: 'object', description: 'Data for the operation' },
        },
        required: ['data'],
      };
    }

    // Default schema for methods without specific parameters
    return {
      type: 'object',
      properties: {},
    };
  }

  private async callDynamicMethod(toolName: string, args: any): Promise<any> {
    // Handle direct client methods
    if (typeof this.monarchClient[toolName] === 'function') {
      return await this.monarchClient[toolName](args);
    }

    // Handle module methods (e.g., "accounts_getAll")
    const parts = toolName.split('_');
    if (parts.length >= 2) {
      const moduleName = parts[0];
      const methodName = parts.slice(1).join('_');
      
      const module = this.monarchClient[moduleName];
      if (module && typeof module[methodName] === 'function') {
        return await module[methodName](args);
      }
    }

    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${toolName}`
    );
  }

  private async ensureAuthenticated() {
    if (this.isAuthenticated) {
      return;
    }

    try {
      const config = ConfigSchema.parse(process.env);
      
      await this.monarchClient.login({
        email: config.MONARCH_EMAIL,
        password: config.MONARCH_PASSWORD,
        mfaSecretKey: config.MONARCH_MFA_SECRET,
      });

      this.isAuthenticated = true;
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Authentication failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MonarchMoney MCP server running on stdio');
  }
}

const server = new MonarchMcpServer();
server.run().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});