# MonarchMoney MCP Server

[![npm version](https://badge.fury.io/js/monarchmoney.svg)](https://badge.fury.io/js/monarchmoney)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A powerful **Model Context Protocol (MCP) server** that provides AI assistants with seamless access to MonarchMoney personal finance data. This server dynamically discovers and exposes **ALL** available methods from the [MonarchMoney TypeScript SDK](https://github.com/keithah/monarchmoney-ts), enabling comprehensive financial data analysis through natural language queries.

## 🌟 **Key Features**

### 🔄 **Dynamic Method Discovery**
- **Automatically discovers ALL functions** from the MonarchMoney TypeScript SDK
- **70+ tools available** across accounts, transactions, budgets, categories, cashflow, recurring, institutions, and insights
- **No hardcoded limitations** - if it's in the SDK, it's available as a tool
- **Future-proof** - automatically includes new methods as the SDK evolves

### 🚀 **One-Click Installation**
- **MCPB Bundle Format** (`.mcpb` files) for instant deployment
- **Automated installation** with dependency management
- **GitHub Releases** with ready-to-download bundles
- **Zero configuration** for standard setups

### 🔐 **Enterprise-Grade Security**
- **Local credential storage** with environment variables
- **MFA/TOTP support** for two-factor authentication
- **Session encryption** using AES-256
- **No data transmitted** to third parties

### 🎯 **Claude Desktop Ready**
- **Native MCP integration** with Claude Desktop
- **Real-time data access** without API delays
- **Natural language queries** for complex financial analysis
- **Professional query examples** and documentation

## 📦 **Quick Install**

### Option 1: One-Click MCPB Bundle (Recommended)

1. **Download** the latest `.mcpb` file from [Releases](https://github.com/keithah/monarchmoney-ts-mcp/releases)
2. **Extract and install**:
   ```bash
   unzip monarchmoney-mcp-v1.0.0.mcpb -d monarchmoney-mcp
   cd monarchmoney-mcp
   node install.js
   ```
3. **Configure credentials**:
   ```bash
   cp .env.example .env
   # Edit .env with your MonarchMoney credentials
   ```

### Option 2: Manual Installation

```bash
git clone https://github.com/keithah/monarchmoney-ts-mcp.git
cd monarchmoney-ts-mcp
npm install
npm run build
```

## ⚙️ **Claude Desktop Configuration**

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Windows**: `%APPDATA%\\Claude\\claude_desktop_config.json`  
**Linux**: `~/.config/claude-desktop/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "monarchmoney": {
      "command": "node",
      "args": ["/full/path/to/monarchmoney-ts-mcp/dist/index.js"],
      "env": {
        "MONARCH_EMAIL": "your-email@example.com",
        "MONARCH_PASSWORD": "your-password",
        "MONARCH_MFA_SECRET": "your-mfa-secret-key"
      }
    }
  }
}
```

## 🛠️ **Available Tools**

The MCP server **dynamically exposes ALL methods** from the MonarchMoney SDK:

### 📊 **Accounts (15+ tools)**
- `accounts_getAll` - Get all accounts
- `accounts_getById` - Get account by ID
- `accounts_getBalanceHistory` - Account balance over time
- `accounts_getNetWorthHistory` - Net worth trends
- `accounts_updateAccount` - Update account details
- `accounts_createManualAccount` - Create manual accounts
- `accounts_deleteAccount` - Remove accounts
- And more...

### 💳 **Transactions (25+ tools)**
- `transactions_getTransactions` - Get filtered transactions
- `transactions_getTransactionDetails` - Detailed transaction info
- `transactions_createTransaction` - Add new transactions
- `transactions_updateTransaction` - Modify transactions
- `transactions_deleteTransaction` - Remove transactions
- `transactions_getTransactionRules` - Transaction rules
- `transactions_createTransactionRule` - Create automation rules
- And more...

### 💰 **Budgets (10+ tools)**
- `budgets_getBudgets` - Budget information
- `budgets_createBudget` - Create new budgets
- `budgets_updateBudget` - Modify budgets
- `budgets_getBudgetSummary` - Budget performance
- And more...

### 🏷️ **Categories (8+ tools)**
- `categories_getCategories` - All transaction categories
- `categories_createCategory` - Create categories
- `categories_updateCategory` - Modify categories
- And more...

### 💸 **Cashflow (5+ tools)**
- `cashflow_getCashflowSummary` - Income vs expenses
- `cashflow_getCashflowWidget` - Cashflow visualization data
- And more...

### 🔄 **Recurring (6+ tools)**
- `recurring_getRecurringStreams` - Recurring transactions
- `recurring_createRecurringStream` - Set up recurring items
- And more...

### 🏦 **Institutions (4+ tools)**
- `institutions_getInstitutions` - Financial institutions
- `institutions_getInstitutionAccounts` - Institution-specific accounts
- And more...

### 📈 **Insights (5+ tools)**
- `insights_getNetWorthHistory` - Wealth tracking over time
- `insights_getSpendingByCategory` - Spending breakdown
- `insights_getIncomeVsExpenses` - Income analysis
- And more...

### 👤 **User Profile**
- `get_me` - Current user information

## 💬 **Example Queries**

Once configured with Claude Desktop, you can ask:

**Account Analysis:**
- "What's my current net worth across all accounts?"
- "Show me the balance history for my checking account"
- "Which investment accounts have grown the most this year?"

**Transaction Insights:**
- "Find all transactions over $500 from last month"
- "Show me my restaurant spending trends over the past 6 months"
- "What are my largest recurring expenses?"

**Budget Management:**
- "How am I performing against my monthly budget?"
- "Which categories am I consistently overspending in?"
- "Show me budget vs actual for each category this quarter"

**Financial Planning:**
- "What's my average monthly cashflow?"
- "Compare my spending patterns: this year vs last year"
- "Show me my net worth growth over the past 2 years"

## 🔧 **Development**

### Build and Test
```bash
npm run build        # Compile TypeScript
npm test            # Run tests
npm run bundle      # Create MCPB bundle
npm start           # Start MCP server
```

### Project Structure
```
monarchmoney-ts-mcp/
├── src/
│   └── index.ts              # Main MCP server with dynamic discovery
├── scripts/
│   └── create-mcpb.js        # MCPB bundle creation
├── .github/workflows/
│   └── release.yml           # Automated releases
├── examples/
│   └── query-examples.md     # Query examples
├── bundle.json               # MCP bundle metadata
├── INSTALLATION.md           # Detailed setup guide
└── README.md                 # This file
```

## 🏗️ **Architecture**

### Dynamic Method Discovery
The MCP server uses **runtime reflection** to discover all available methods:

```typescript
// Automatically discovers all API modules and methods
const apiModules = [
  { name: 'accounts', client: this.monarchClient.accounts },
  { name: 'transactions', client: this.monarchClient.transactions },
  // ... all modules
];

// Dynamically creates MCP tools for each method
apiModules.forEach(({ name: moduleName, client }) => {
  const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
    .filter(name => typeof client[name] === 'function');
  // Create tools for each method...
});
```

### Smart Parameter Handling
Automatically generates appropriate input schemas based on method names:

```typescript
// Transaction methods get comprehensive filtering options
if (methodName.includes('Transactions')) {
  return {
    properties: {
      limit: { type: 'number', description: 'Maximum results' },
      startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
      accountIds: { type: 'array', description: 'Filter by accounts' },
      // ... more filters
    }
  };
}
```

## 🚀 **Release Process**

Releases are **fully automated** via GitHub Actions:

1. **Create a tag**: `git tag v1.0.0 && git push --tags`
2. **GitHub Action triggers** and:
   - Runs tests and builds the project
   - Creates MCPB bundle automatically
   - Publishes GitHub release with downloadable `.mcpb` file
   - Includes comprehensive release notes

## 🔒 **Security & Privacy**

- **Local-only processing** - no data sent to external services
- **Encrypted session storage** using industry-standard AES-256
- **Environment-based credential management**
- **MFA support** for enhanced account security
- **Open source** - fully auditable codebase

## 🌍 **Contributing**

1. **Fork** the repository
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **MonarchMoney TypeScript SDK**: Built on the comprehensive [monarchmoney](https://npmjs.com/package/monarchmoney) package
- **Inspired by**: [hammem's MonarchMoney Python library](https://github.com/hammem/monarchmoney) and [keithah's enhanced version](https://github.com/keithah/monarchmoney-enhanced)
- **MCP Protocol**: Powered by Anthropic's Model Context Protocol for seamless AI integration

## 📊 **Project Stats**

- **70+ Dynamic Tools** - Complete MonarchMoney API coverage
- **Zero Hardcoded Methods** - Future-proof dynamic discovery
- **One-Click Installation** - MCPB bundle system
- **Enterprise Security** - AES-256 encryption, MFA support
- **Production Ready** - Comprehensive error handling, logging
- **Fully Automated** - CI/CD pipeline with automated releases

---

**Made with ❤️ for the MonarchMoney community**

*Transform your financial data into actionable insights through natural language with AI assistants.*