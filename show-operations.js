#!/usr/bin/env node

// Script to show all available MonarchMoney MCP operations
// Run this to see what you can ask Claude to do

console.log('🏦 MonarchMoney MCP Operations Available');
console.log('=====================================');
console.log('');

const operations = [
  // Accounts
  '📊 ACCOUNTS',
  '  • Get all accounts (checking, savings, credit cards, investments)',
  '  • Get account by ID',
  '  • Get account balances',
  '  • Get account history (with date range)',
  '  • Get net worth history',
  '  • Create manual account',
  '  • Update account information',
  '  • Delete account',
  '  • Request account refresh',
  '  • Check if refresh is complete',
  '',

  // Transactions
  '💳 TRANSACTIONS',
  '  • Get transactions (with filtering: dates, accounts, categories, search)',
  '  • Get transaction details',
  '  • Create new transaction',
  '  • Update transaction',
  '  • Delete transaction',
  '  • Get transactions summary',
  '  • Get transaction splits',
  '  • Update transaction splits',
  '  • Get/create/update/delete transaction rules',
  '  • Get/create/update/delete transaction categories',
  '  • Get/create/set transaction tags',
  '  • Get merchant information',
  '  • Get recurring transactions',
  '  • Bulk update/hide/unhide transactions',
  '',

  // Budgets
  '💰 BUDGETS',
  '  • Get budget information',
  '  • Set budget amounts',
  '  • Get/create/update/delete goals',
  '  • Get cash flow data',
  '  • Get cash flow summary',
  '  • Get bills',
  '',

  // Categories
  '🏷️  CATEGORIES',
  '  • Get all categories',
  '  • Get category by ID',
  '  • Create/update/delete categories',
  '  • Get category groups',
  '  • Get/create/update/delete tags',
  '  • Add/remove tags from transactions',
  '',

  // Cash Flow
  '💸 CASH FLOW',
  '  • Get current month dates',
  '  • Get cash flow data',
  '  • Get cash flow summary',
  '',

  // Recurring
  '🔄 RECURRING',
  '  • Get recurring income/expense streams',
  '  • Get upcoming recurring items',
  '  • Mark streams as not recurring',
  '',

  // Institutions
  '🏛️  INSTITUTIONS',
  '  • Get financial institutions',
  '  • Get institution settings',
  '',

  // Insights
  '📈 INSIGHTS',
  '  • Get insights',
  '  • Get net worth history (with date range)',
  '  • Get credit score',
  '  • Get notifications',
  '  • Get subscription details',
  '  • Dismiss insights',
  '',

  // Client Operations
  '⚙️  CLIENT',
  '  • Get user profile (get_me)',
  '  • Session management',
  '  • Cache operations',
  '  • Version info'
];

operations.forEach(op => console.log(op));

console.log('');
console.log('🎯 EXAMPLE QUERIES YOU CAN ASK CLAUDE:');
console.log('=====================================');
console.log('');
console.log('• "Show me all my account balances"');
console.log('• "What transactions did I have this month?"');
console.log('• "Get my spending by category for the last 30 days"');
console.log('• "What\'s my net worth trend over the last year?"');
console.log('• "Show me all transactions over $500 from last week"');
console.log('• "What are my recurring expenses?"');
console.log('• "Get my budget status for this month"');
console.log('• "Show me my cash flow summary"');
console.log('• "What categories am I overspending in?"');
console.log('• "Get my credit score"');
console.log('');
console.log('✨ The extension is fully functional despite the UI connection warning!');
console.log('   Just ask Claude natural language questions about your finances.');