#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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
// This must be done before importing MonarchClient
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

// Keep console redirected for the entire lifecycle to prevent any stdout pollution
// Don't restore console methods

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
      console.error('🔍 Client requesting tools list...');

      try {
        await this.ensureAuthenticated();
        console.error('✅ Authentication successful, discovering tools...');

        // Dynamically discover all available methods from the MonarchMoney client
        const tools = this.discoverAvailableTools();
        console.error(`🛠️ Discovered ${tools.length} tools`);

        return { tools };
      } catch (error) {
        console.error('❌ Failed to authenticate for tools list');
        throw error; // Re-throw to let MCP handle it
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      console.error(`🔧 Executing tool: ${name}`);

      try {
        await this.ensureAuthenticated();

        // Dynamically call the method based on tool name
        const result = await this.callDynamicMethod(name, args || {});
        console.error(`✅ Tool ${name} executed successfully`);

        return {
          content: [
            {
              type: 'text',
              text: this.formatResult(name, result),
            },
          ],
        };
      } catch (error) {
        console.error(`💥 Tool ${name} failed: ${error instanceof Error ? error.message : String(error)}`);
        throw new McpError(
          ErrorCode.InternalError,
          `🔧 Tool Error (${name}): ${error instanceof Error ? error.message : String(error)}`
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
          limit: { type: 'number', description: 'Maximum number of results (default: 25, max: 100)', default: 25 },
          offset: { type: 'number', description: 'Pagination offset', default: 0 },
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD, defaults to 30 days ago)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD, defaults to today)' },
          accountIds: { type: 'array', items: { type: 'string' }, description: 'Filter by account IDs' },
          categoryIds: { type: 'array', items: { type: 'string' }, description: 'Filter by category IDs' },
          search: { type: 'string', description: 'Search term for merchant names or descriptions' },
          absAmountRange: { type: 'array', items: { type: 'number' }, description: 'Filter by amount range [min, max]' },
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
      return await this.monarchClient[toolName](...this.adaptArguments(toolName, args));
    }

    // Handle module methods (e.g., "accounts_getAll")
    const parts = toolName.split('_');
    if (parts.length >= 2) {
      const moduleName = parts[0];
      const methodName = parts.slice(1).join('_');

      const module = this.monarchClient[moduleName];
      if (module && typeof module[methodName] === 'function') {
        return await module[methodName](...this.adaptArguments(toolName, args));
      }
    }

    throw new McpError(
      ErrorCode.MethodNotFound,
      `Unknown tool: ${toolName}`
    );
  }

  private formatResult(toolName: string, result: any): string {
    if (!result) {
      return `No data returned for ${toolName}`;
    }

    // Handle arrays (like accounts, transactions)
    if (Array.isArray(result)) {
      return this.formatArrayResult(toolName, result);
    }

    // Handle objects (like summaries, single items)
    if (typeof result === 'object') {
      return this.formatObjectResult(toolName, result);
    }

    // Handle primitives
    return String(result);
  }

  private formatArrayResult(toolName: string, data: any[]): string {
    if (data.length === 0) {
      return `No ${toolName.replace(/.*_/, '')} found.`;
    }

    // Format based on data type
    if (toolName.includes('accounts')) {
      return this.formatAccounts(data);
    } else if (toolName.includes('transactions')) {
      return this.formatTransactions(data);
    } else if (toolName.includes('categories')) {
      return this.formatCategories(data);
    } else if (toolName.includes('budgets')) {
      return this.formatBudgets(data);
    }

    // Default formatting for other arrays
    return `Found ${data.length} items:\n` +
           data.slice(0, 10).map((item, i) =>
             `${i + 1}. ${JSON.stringify(item, null, 2)}`
           ).join('\n') +
           (data.length > 10 ? `\n... and ${data.length - 10} more items` : '');
  }

  private formatObjectResult(toolName: string, data: any): string {
    // Handle specific object types
    if (data.totalIncome !== undefined || data.totalExpenses !== undefined) {
      return this.formatSummary(data);
    }

    if (data.currentBalance !== undefined) {
      return this.formatAccount(data);
    }

    // Default object formatting - show key fields only
    const relevantFields = this.getRelevantFields(data);
    return Object.entries(relevantFields)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');
  }

  private formatAccounts(accounts: any[]): string {
    const summary = `📊 **Account Summary** (${accounts.length} accounts)\n\n`;

    let totalBalance = 0;
    const formatted = accounts.map(acc => {
      const balance = acc.currentBalance || acc.displayBalance || 0;
      totalBalance += balance;

      return `• **${acc.displayName || acc.name}**
  Type: ${acc.type?.display || acc.subtype?.display || 'Unknown'}
  Balance: $${balance.toLocaleString()}
  Institution: ${acc.institution?.name || 'Manual'}
  ${acc.mask ? `Account: ***${acc.mask}` : ''}`;
    }).join('\n\n');

    return summary + formatted + `\n\n**Total Balance: $${totalBalance.toLocaleString()}**`;
  }

  private formatTransactions(transactions: any[]): string {
    const summary = `💳 **Transaction Summary** (${transactions.length} transactions)\n\n`;

    let totalAmount = 0;
    const formatted = transactions.slice(0, 20).map(txn => {
      const amount = txn.amount || 0;
      totalAmount += Math.abs(amount);

      const date = txn.date ? new Date(txn.date).toLocaleDateString() : 'Unknown date';
      const merchant = txn.merchantName || txn.description || 'Unknown merchant';
      const category = txn.category?.name || 'Uncategorized';

      return `• ${date} - **${merchant}**
  Amount: ${amount >= 0 ? '+' : '-'}$${Math.abs(amount).toLocaleString()}
  Category: ${category}
  Account: ${txn.account?.displayName || 'Unknown'}`;
    }).join('\n\n');

    return summary + formatted +
           (transactions.length > 20 ? `\n\n... and ${transactions.length - 20} more transactions` : '') +
           `\n\n**Total Transaction Volume: $${totalAmount.toLocaleString()}**`;
  }

  private formatCategories(categories: any[]): string {
    return `🏷️ **Categories** (${categories.length} total)\n\n` +
           categories.slice(0, 15).map(cat =>
             `• **${cat.name}** ${cat.group ? `(${cat.group.name})` : ''}`
           ).join('\n') +
           (categories.length > 15 ? `\n... and ${categories.length - 15} more categories` : '');
  }

  private formatBudgets(budgets: any[]): string {
    return `💰 **Budget Summary** (${budgets.length} categories)\n\n` +
           budgets.slice(0, 10).map(budget => {
             const spent = budget.actual || budget.spent || 0;
             const budgeted = budget.budgeted || budget.limit || 0;
             const remaining = budgeted - spent;
             const percentage = budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0;

             return `• **${budget.category?.name || budget.name}**
  Budgeted: $${budgeted.toLocaleString()}
  Spent: $${spent.toLocaleString()} (${percentage}%)
  Remaining: $${remaining.toLocaleString()}`;
           }).join('\n\n') +
           (budgets.length > 10 ? `\n\n... and ${budgets.length - 10} more budget categories` : '');
  }

  private formatSummary(data: any): string {
    const lines = [];

    if (data.totalIncome !== undefined) lines.push(`💰 Total Income: $${data.totalIncome.toLocaleString()}`);
    if (data.totalExpenses !== undefined) lines.push(`💸 Total Expenses: $${data.totalExpenses.toLocaleString()}`);
    if (data.netIncome !== undefined) lines.push(`📈 Net Income: $${data.netIncome.toLocaleString()}`);
    if (data.totalTransactions !== undefined) lines.push(`📊 Total Transactions: ${data.totalTransactions.toLocaleString()}`);

    return lines.join('\n');
  }

  private formatAccount(account: any): string {
    return `📊 **${account.displayName || account.name}**
Type: ${account.type?.display || account.subtype?.display || 'Unknown'}
Balance: $${(account.currentBalance || account.displayBalance || 0).toLocaleString()}
Institution: ${account.institution?.name || 'Manual'}
Updated: ${account.displayLastUpdatedAt ? new Date(account.displayLastUpdatedAt).toLocaleDateString() : 'Unknown'}`;
  }

  private getRelevantFields(obj: any): any {
    const relevant: any = {};
    const importantKeys = [
      'id', 'name', 'displayName', 'amount', 'balance', 'currentBalance', 'displayBalance',
      'date', 'description', 'category', 'type', 'status', 'total', 'count'
    ];

    importantKeys.forEach(key => {
      if (obj[key] !== undefined) {
        relevant[key] = obj[key];
      }
    });

    return relevant;
  }

  private adaptArguments(toolName: string, args: any): any[] {
    // Methods that take no parameters
    const noParamMethods = [
      'accounts_getAll',
      'accounts_getBalances',
      'accounts_getTypeOptions',
      'transactions_getTransactionsSummary',
      'transactions_getTransactionsSummaryCard',
      'budgets_getBudgets',
      'categories_getCategories',
      'cashflow_getCashflowSummary',
      'recurring_getRecurringStreams',
      'institutions_getInstitutions',
      'insights_getInsights',
      'get_me'
    ];

    if (noParamMethods.includes(toolName)) {
      return [];
    }

    // Methods that take a single ID parameter
    if (toolName.includes('getById') || toolName.includes('ById')) {
      return [args.id];
    }

    // Methods that take date range parameters
    if (toolName.includes('History') || toolName.includes('NetWorth')) {
      const params = [];
      if (args.startDate) params.push(args.startDate);
      if (args.endDate) params.push(args.endDate);
      return params.length > 0 ? [{ startDate: args.startDate, endDate: args.endDate }] : [];
    }

    // Transaction methods with filtering options
    if (toolName.includes('Transactions') || toolName.includes('transactions_get')) {
      // Apply smart defaults to prevent massive data returns
      const transactionArgs = { ...args };

      // Default limit for transactions to prevent context overflow
      if (!transactionArgs.limit) {
        transactionArgs.limit = 25; // Default to 25 transactions
      }

      // If no date range specified, default to last 30 days
      if (!transactionArgs.startDate && !transactionArgs.endDate) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);

        transactionArgs.startDate = startDate.toISOString().split('T')[0];
        transactionArgs.endDate = endDate.toISOString().split('T')[0];
      }

      // Cap limit to reasonable maximum
      if (transactionArgs.limit && transactionArgs.limit > 100) {
        transactionArgs.limit = 100;
      }

      return [transactionArgs];
    }

    // Create/update methods that expect data object
    if (toolName.includes('create') || toolName.includes('update')) {
      return [args.data];
    }

    // Apply smart defaults for data-heavy operations
    const safeArgs = { ...args };

    // For methods that might return lots of data, add reasonable limits
    if (toolName.includes('getAll') && toolName.includes('accounts')) {
      // Accounts are usually not too many, keep as-is
      return Object.keys(safeArgs || {}).length === 0 ? [] : [safeArgs];
    }

    // Default: if args is empty object, pass no parameters; otherwise pass as single object
    return Object.keys(safeArgs || {}).length === 0 ? [] : [safeArgs];
  }

  private async ensureAuthenticated() {
    if (this.isAuthenticated) {
      return;
    }

    try {
      const config = ConfigSchema.parse(process.env);
    } catch (configError) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `❌ Configuration Error: Please configure your MonarchMoney credentials in Claude Desktop extension settings. Missing or invalid: ${configError instanceof Error ? configError.message : String(configError)}`
      );
    }

    try {
      const config = ConfigSchema.parse(process.env);

      console.error(`🔐 Attempting authentication for: ${config.MONARCH_EMAIL}`);

      await this.monarchClient.login({
        email: config.MONARCH_EMAIL,
        password: config.MONARCH_PASSWORD,
        mfaSecretKey: config.MONARCH_MFA_SECRET,
      });

      this.isAuthenticated = true;
      console.error(`✅ Successfully authenticated: ${config.MONARCH_EMAIL}`);
    } catch (error: any) {
      // Enhanced error messages based on MonarchMoney API responses
      let userFriendlyMessage = '';

      if (error.message?.includes('Forbidden')) {
        userFriendlyMessage = '🚫 AUTH ERROR: Invalid email/password combination. Please check your MonarchMoney credentials in Claude Desktop extension settings.';
      } else if (error.message?.includes('401')) {
        userFriendlyMessage = '🔑 AUTH ERROR: Unauthorized - Please verify your MonarchMoney email and password are correct.';
      } else if (error.message?.includes('429')) {
        userFriendlyMessage = '⏳ RATE LIMITED: Too many login attempts. Please wait a few minutes before trying again.';
      } else if (error.message?.includes('MFA') || error.message?.includes('totp')) {
        userFriendlyMessage = '🔐 MFA ERROR: Multi-Factor Authentication required. Please configure your TOTP secret in Claude Desktop extension settings.';
      } else if (error.message?.includes('network') || error.message?.includes('timeout')) {
        userFriendlyMessage = '🌐 NETWORK ERROR: Unable to connect to MonarchMoney servers. Check your internet connection.';
      } else if (error.code === 'AUTH_ERROR') {
        userFriendlyMessage = `🚫 MONARCH AUTH ERROR: ${error.message}`;
      } else {
        userFriendlyMessage = `❌ LOGIN FAILED: ${error.message || 'Unknown authentication error'}`;
      }

      // Log detailed error to stderr for debugging
      console.error(`💥 Authentication Error Details: ${JSON.stringify({
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack?.split('\n')[0]  // Just first line
      }, null, 2)}`);

      throw new McpError(
        ErrorCode.InternalError,
        userFriendlyMessage
      );
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 MonarchMoney MCP server running on stdio');
    console.error('📋 Waiting for client connection...');
  }
}

const server = new MonarchMcpServer();
server.run().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});