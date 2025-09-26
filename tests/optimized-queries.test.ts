/**
 * Unit tests for optimized GraphQL queries and context management
 */

import {
  GET_ACCOUNTS_ULTRA_LIGHT,
  GET_ACCOUNTS_LIGHT,
  GET_TRANSACTIONS_ULTRA_LIGHT,
  GET_TRANSACTIONS_LIGHT,
  GET_QUICK_FINANCIAL_OVERVIEW,
  SMART_TRANSACTION_SEARCH,
  getOptimizedQueries,
  calculateOptimalVerbosity,
  RESPONSE_SIZE_ESTIMATES,
  OptimizedResponseFormatter,
  VerbosityLevel
} from '../src/optimized-queries';

describe('Optimized GraphQL Queries', () => {
  describe('Query Structure', () => {
    test('ultra-light accounts query has minimal fields', () => {
      expect(GET_ACCOUNTS_ULTRA_LIGHT).toContain('id');
      expect(GET_ACCOUNTS_ULTRA_LIGHT).toContain('displayName');
      expect(GET_ACCOUNTS_ULTRA_LIGHT).toContain('currentBalance');
      expect(GET_ACCOUNTS_ULTRA_LIGHT).toContain('type');

      // Should NOT contain verbose fields
      expect(GET_ACCOUNTS_ULTRA_LIGHT).not.toContain('credential');
      expect(GET_ACCOUNTS_ULTRA_LIGHT).not.toContain('institution');
      expect(GET_ACCOUNTS_ULTRA_LIGHT).not.toContain('syncDisabled');
    });

    test('light accounts query has moderate fields', () => {
      expect(GET_ACCOUNTS_LIGHT).toContain('id');
      expect(GET_ACCOUNTS_LIGHT).toContain('displayName');
      expect(GET_ACCOUNTS_LIGHT).toContain('currentBalance');
      expect(GET_ACCOUNTS_LIGHT).toContain('institution');
      expect(GET_ACCOUNTS_LIGHT).toContain('updatedAt');

      // Should NOT contain the most verbose fields
      expect(GET_ACCOUNTS_LIGHT).not.toContain('credential');
      expect(GET_ACCOUNTS_LIGHT).not.toContain('syncDisabled');
    });

    test('ultra-light transactions query has minimal fields', () => {
      expect(GET_TRANSACTIONS_ULTRA_LIGHT).toContain('id');
      expect(GET_TRANSACTIONS_ULTRA_LIGHT).toContain('amount');
      expect(GET_TRANSACTIONS_ULTRA_LIGHT).toContain('date');
      expect(GET_TRANSACTIONS_ULTRA_LIGHT).toContain('merchant');
      expect(GET_TRANSACTIONS_ULTRA_LIGHT).toContain('account');

      // Should NOT contain verbose fields
      expect(GET_TRANSACTIONS_ULTRA_LIGHT).not.toContain('attachments');
      expect(GET_TRANSACTIONS_ULTRA_LIGHT).not.toContain('splits');
      expect(GET_TRANSACTIONS_ULTRA_LIGHT).not.toContain('reviewStatus');
    });

    test('smart transaction search has proper variables', () => {
      expect(SMART_TRANSACTION_SEARCH).toContain('$search: String');
      expect(SMART_TRANSACTION_SEARCH).toContain('$limit: Int');
      expect(SMART_TRANSACTION_SEARCH).toContain('$minAmount: Float');
      expect(SMART_TRANSACTION_SEARCH).toContain('$maxAmount: Float');
      expect(SMART_TRANSACTION_SEARCH).toContain('$accountIds: [ID!]');
      expect(SMART_TRANSACTION_SEARCH).toContain('$categoryIds: [ID!]');
    });
  });

  describe('Query Selection', () => {
    test('getOptimizedQueries returns correct queries for each verbosity', () => {
      const ultraLight = getOptimizedQueries('ultra-light');
      expect(ultraLight.accounts).toBe(GET_ACCOUNTS_ULTRA_LIGHT);
      expect(ultraLight.transactions).toBe(GET_TRANSACTIONS_ULTRA_LIGHT);

      const light = getOptimizedQueries('light');
      expect(light.accounts).toBe(GET_ACCOUNTS_LIGHT);
      expect(light.transactions).toBe(GET_TRANSACTIONS_LIGHT);

      const standard = getOptimizedQueries('standard');
      expect(standard.accounts).toBe('GET_ACCOUNTS');
      expect(standard.transactions).toBe('GET_TRANSACTIONS');
    });
  });

  describe('Size Estimation', () => {
    test('calculateOptimalVerbosity selects correct level for different sizes', () => {
      // Small dataset should allow standard
      expect(calculateOptimalVerbosity('accounts', 5, 10000)).toBe('standard');

      // Medium dataset should use light
      expect(calculateOptimalVerbosity('accounts', 20, 5000)).toBe('light');

      // Large dataset should use ultra-light
      expect(calculateOptimalVerbosity('accounts', 100, 2000)).toBe('ultra-light');
    });

    test('response size estimates are realistic', () => {
      const estimates = RESPONSE_SIZE_ESTIMATES;

      // Ultra-light should be smallest
      expect(estimates['ultra-light'].accounts).toBeLessThan(estimates['light'].accounts);
      expect(estimates['light'].accounts).toBeLessThan(estimates['standard'].accounts);

      // Check realistic ranges
      expect(estimates['ultra-light'].accounts).toBeLessThanOrEqual(100);
      expect(estimates['standard'].accounts).toBeGreaterThan(500);
    });
  });
});

describe('Response Formatters', () => {
  const mockAccounts = [
    {
      id: '1',
      displayName: 'Chase Checking',
      currentBalance: 5234.56,
      type: { name: 'checking', display: 'Checking' },
      institution: { name: 'Chase' },
      isHidden: false,
      updatedAt: '2024-01-01T12:00:00Z'
    },
    {
      id: '2',
      displayName: 'Savings Account',
      currentBalance: 15678.90,
      type: { name: 'savings', display: 'Savings' },
      institution: { name: 'Wells Fargo' },
      isHidden: false,
      updatedAt: '2024-01-01T12:00:00Z'
    }
  ];

  const mockTransactions = [
    {
      id: '1',
      amount: -45.67,
      date: '2024-01-15',
      merchant: { name: 'Amazon' },
      category: { name: 'Shopping' },
      account: { displayName: 'Chase Checking', mask: '1234' }
    },
    {
      id: '2',
      amount: -12.34,
      date: '2024-01-14',
      merchant: { name: 'Starbucks' },
      category: { name: 'Dining' },
      account: { displayName: 'Chase Checking', mask: '1234' }
    }
  ];

  describe('Account Formatting', () => {
    test('ultra-light format is very compact', () => {
      const result = OptimizedResponseFormatter.formatAccounts(mockAccounts, 'ultra-light');

      expect(result).toContain('💰');
      expect(result).toContain('2 accounts');
      expect(result).toContain('$20,913'); // Total balance
      expect(result.length).toBeLessThan(100); // Very compact
    });

    test('light format shows account details', () => {
      const result = OptimizedResponseFormatter.formatAccounts(mockAccounts, 'light');

      expect(result).toContain('Chase Checking');
      expect(result).toContain('Savings Account');
      expect(result).toContain('$5,234');
      expect(result).toMatch(/\$15,678[\.,]9?/);
      expect(result).toContain('Total: $20,913');
      expect(result.length).toBeLessThan(500);
    });

    test('standard format shows full details', () => {
      const result = OptimizedResponseFormatter.formatAccounts(mockAccounts, 'standard');

      expect(result).toContain('**Chase Checking**');
      expect(result).toContain('Type: Checking');
      expect(result).toContain('Institution: Chase');
      expect(result).toContain('Updated: 1/1/2024');
      expect(result).toContain('**Total Balance: $20,913');
    });

    test('handles empty accounts array', () => {
      const result = OptimizedResponseFormatter.formatAccounts([], 'ultra-light');
      expect(result).toContain('0 accounts');
      expect(result).toContain('$0');
    });

    test('handles accounts with missing data', () => {
      const incompleteAccounts = [
        { id: '1', displayName: 'Test Account' } // Missing balance, type, etc.
      ];

      const result = OptimizedResponseFormatter.formatAccounts(incompleteAccounts, 'ultra-light');
      expect(result).toContain('1 accounts');
      expect(result).toContain('$0'); // Should handle missing balance
    });
  });

  describe('Transaction Formatting', () => {
    test('ultra-light format is very compact', () => {
      const result = OptimizedResponseFormatter.formatTransactions(mockTransactions, 'ultra-light');

      expect(result).toContain('💳');
      expect(result).toContain('2 transactions');
      expect(result).toContain('Volume: $58'); // Total absolute amounts
      expect(result.length).toBeLessThan(100);
    });

    test('light format shows transaction details', () => {
      const result = OptimizedResponseFormatter.formatTransactions(mockTransactions, 'light');

      expect(result).toMatch(/1\/1[45]\/2024 - Amazon/);
      expect(result).toMatch(/1\/1[34]\/2024 - Starbucks/);
      expect(result).toMatch(/-\$45[\.,]?67?/);
      expect(result).toMatch(/-\$12[\.,]?34?/);
      expect(result).toContain('Shopping');
      expect(result).toContain('Dining');
    });

    test('standard format shows full details with smart query context', () => {
      const result = OptimizedResponseFormatter.formatTransactions(
        mockTransactions,
        'standard',
        'last 2 Amazon charges'
      );

      expect(result).toContain('🧠 **Smart Query**: "last 2 Amazon charges"');
      expect(result).toContain('💳 **Transaction Summary**');
      expect(result).toContain('**Amazon**');
      expect(result).toContain('Account: Chase Checking (...1234)');
      expect(result).toMatch(/\*\*Total Transaction Volume: \$58[\.,]?0?1?\*\*/);
    });

    test('handles empty transactions array', () => {
      const result = OptimizedResponseFormatter.formatTransactions([], 'ultra-light');
      expect(result).toBe('');
    });
  });

  describe('Quick Stats Formatting', () => {
    const mockAccountsForStats = [
      { currentBalance: 1000, includeInNetWorth: true },
      { currentBalance: 500, includeInNetWorth: true },
      { currentBalance: 200, includeInNetWorth: false } // Excluded from net worth
    ];

    const mockRecentTransactions = [
      { amount: -100, date: '2024-01-15' },
      { amount: -50, date: '2024-01-14' },
      { amount: 200, date: '2024-01-13' } // Income
    ];

    test('formats quick stats correctly', () => {
      const result = OptimizedResponseFormatter.formatQuickStats(
        mockAccountsForStats,
        mockRecentTransactions
      );

      expect(result).toContain('💰 $1,500'); // Only accounts included in net worth
      expect(result).toContain('3 accounts'); // Total accounts shown
      expect(result).toMatch(/⬆️|⬇️/); // Should have trend indicator
      expect(result.length).toBeLessThan(150); // Ultra-compact
    });

    test('handles accounts without recent transactions', () => {
      const result = OptimizedResponseFormatter.formatQuickStats(mockAccountsForStats);

      expect(result).toContain('💰 $1,500');
      expect(result).toContain('3 accounts');
    });
  });

  describe('Spending Summary Formatting', () => {
    const mockTransactionsForSpending = [
      { amount: -150, category: { name: 'Dining' } },
      { amount: -100, category: { name: 'Dining' } },
      { amount: -80, category: { name: 'Gas' } },
      { amount: -70, category: { name: 'Shopping' } },
      { amount: 500, category: { name: 'Income' } } // Should be excluded (income)
    ];

    test('aggregates spending by category correctly', () => {
      const result = OptimizedResponseFormatter.formatSpendingSummary(
        mockTransactionsForSpending,
        3
      );

      expect(result).toContain('🍽️ $250'); // Dining total
      expect(result).toContain('⛽ $80'); // Gas
      expect(result).toContain('🛍️ $70'); // Shopping
      expect(result).toContain('(top 3 this month)');
      expect(result.length).toBeLessThan(100);
    });

    test('handles no expenses', () => {
      const incomeOnly = [
        { amount: 1000, category: { name: 'Salary' } }
      ];

      const result = OptimizedResponseFormatter.formatSpendingSummary(incomeOnly, 5);
      expect(result).toBe('💸 No expenses found');
    });

    test('handles uncategorized transactions', () => {
      const uncategorized = [
        { amount: -50, category: null },
        { amount: -30 } // No category property
      ];

      const result = OptimizedResponseFormatter.formatSpendingSummary(uncategorized, 5);
      expect(result).toContain('💸 $80'); // Should sum uncategorized
      // The format is "💸 $80 (top 1 this month)" so we check for this pattern
      expect(result).toMatch(/💸 \$80.*\(top \d+ this month\)/);
    });
  });
});

describe('Integration Tests', () => {
  describe('Verbosity Level Integration', () => {
    test('different verbosity levels produce different response sizes', () => {
      const mockAccounts = Array(10).fill(null).map((_, i) => ({
        id: String(i),
        displayName: `Account ${i}`,
        currentBalance: 1000 + i * 100,
        type: { name: 'checking', display: 'Checking' },
        institution: { name: 'Bank' },
        updatedAt: '2024-01-01T12:00:00Z'
      }));

      const ultraLight = OptimizedResponseFormatter.formatAccounts(mockAccounts, 'ultra-light');
      const light = OptimizedResponseFormatter.formatAccounts(mockAccounts, 'light');
      const standard = OptimizedResponseFormatter.formatAccounts(mockAccounts, 'standard');

      expect(ultraLight.length).toBeLessThan(light.length);
      expect(light.length).toBeLessThan(standard.length);

      // Ultra-light should be under 100 chars
      expect(ultraLight.length).toBeLessThan(100);

      // Light should be under 2000 chars
      expect(light.length).toBeLessThan(2000);
    });
  });

  describe('Query Size Validation', () => {
    test('all optimized queries are valid GraphQL', () => {
      const queries = [
        GET_ACCOUNTS_ULTRA_LIGHT,
        GET_ACCOUNTS_LIGHT,
        GET_TRANSACTIONS_ULTRA_LIGHT,
        GET_TRANSACTIONS_LIGHT,
        GET_QUICK_FINANCIAL_OVERVIEW,
        SMART_TRANSACTION_SEARCH
      ];

      queries.forEach(query => {
        // Basic GraphQL syntax validation
        expect(query).toContain('query ');
        expect(query).toContain('{');
        expect(query).toContain('}');

        // Should not have syntax errors
        expect(query).not.toContain('{{');
        expect(query).not.toContain('}}');

        // Should have balanced braces
        const openBraces = (query.match(/\{/g) || []).length;
        const closeBraces = (query.match(/\}/g) || []).length;
        expect(openBraces).toBe(closeBraces);
      });
    });
  });

  describe('Performance Characteristics', () => {
    test('ultra-light formatters should be fast', () => {
      const largeAccountSet = Array(1000).fill(null).map((_, i) => ({
        id: String(i),
        displayName: `Account ${i}`,
        currentBalance: Math.random() * 10000,
        type: { name: 'checking' }
      }));

      const start = Date.now();
      const result = OptimizedResponseFormatter.formatAccounts(largeAccountSet, 'ultra-light');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
      expect(result.length).toBeLessThan(200); // Should remain compact even with large dataset
    });
  });
});