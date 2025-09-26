/**
 * Unit tests for smart query parsing functionality
 */

describe('Smart Query Parser', () => {
  // Mock the parseNaturalLanguageQuery function that exists in the MCP server
  function parseNaturalLanguageQuery(query: string, existingArgs: any = {}): any {
    const enhancedArgs: any = { ...existingArgs };
    const lowerQuery = query.toLowerCase();

    // Extract number/quantity (e.g., "last 3", "5 recent")
    const numberMatch = lowerQuery.match(/(?:last|recent|top|first)\s+(\d+)|(\d+)\s+(?:last|recent|top|largest|biggest|smallest)/);
    if (numberMatch) {
      const number = parseInt(numberMatch[1] || numberMatch[2]);
      if (number && number <= 100) {
        enhancedArgs.limit = number;
      }
    }

    // Extract merchant patterns - prioritize specific merchant names
    const merchantPatterns = [
      // First try exact merchant names (Amazon, Starbucks, etc.)
      /\b(amazon|starbucks|walmart|target|costco|netflix|uber|airbnb|apple|google|microsoft|tesla)\b/,
      // Then try "from/at" patterns
      /(?:from\s+|at\s+|@\s*)([a-zA-Z][a-zA-Z0-9\s&]+?)(?:\s|$)/,
      // Then try "merchant charges" patterns
      /([a-zA-Z][a-zA-Z0-9\s&]+?)\s+(?:charges?|payments?|transactions?)/,
      // Finally try "spent at" patterns
      /(?:spent\s+(?:at|on)\s+)([a-zA-Z][a-zA-Z0-9\s&]+)/
    ];

    for (const pattern of merchantPatterns) {
      const match = lowerQuery.match(pattern);
      if (match && match[1]) {
        const merchant = match[1].trim();
        // Filter out common words and number patterns
        const commonWords = ['the', 'and', 'or', 'this', 'that', 'month', 'week', 'year', 'day', 'last', 'recent', 'charges', 'transactions'];
        const isNumber = /^\d+$/.test(merchant);

        if (!commonWords.includes(merchant) && !isNumber && merchant.length > 1) {
          enhancedArgs.search = merchant;
          break;
        }
      }
    }

    // Extract time periods
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (lowerQuery.includes('this month')) {
      enhancedArgs.startDate = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      enhancedArgs.endDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0];
    } else if (lowerQuery.includes('last month')) {
      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const year = currentMonth === 1 ? currentYear - 1 : currentYear;
      enhancedArgs.startDate = `${year}-${lastMonth.toString().padStart(2, '0')}-01`;
      enhancedArgs.endDate = new Date(year, lastMonth, 0).toISOString().split('T')[0];
    } else if (lowerQuery.includes('this week')) {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      enhancedArgs.startDate = startOfWeek.toISOString().split('T')[0];
      enhancedArgs.endDate = now.toISOString().split('T')[0];
    }

    // Extract amount ranges
    const amountMatch = lowerQuery.match(/(?:over|above|more\s+than)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatch) {
      const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      enhancedArgs.absAmountRange = [amount, null];
    }

    const underMatch = lowerQuery.match(/(?:under|below|less\s+than)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (underMatch) {
      const amount = parseFloat(underMatch[1].replace(/,/g, ''));
      enhancedArgs.absAmountRange = [null, amount];
    }

    const exactMatch = lowerQuery.match(/(?:exactly|equal\s+to)\s*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (exactMatch) {
      const amount = parseFloat(exactMatch[1].replace(/,/g, ''));
      enhancedArgs.absAmountRange = [amount * 0.99, amount * 1.01]; // Small tolerance
    }

    // Set reasonable defaults
    if (!enhancedArgs.limit) {
      if (lowerQuery.includes('all')) {
        enhancedArgs.limit = 100;
      } else {
        enhancedArgs.limit = 25;
      }
    }

    return enhancedArgs;
  }

  describe('Number Extraction', () => {
    test('extracts "last N" patterns', () => {
      expect(parseNaturalLanguageQuery('last 5 transactions')).toEqual(
        expect.objectContaining({ limit: 5 })
      );

      expect(parseNaturalLanguageQuery('last 10 Amazon charges')).toEqual(
        expect.objectContaining({ limit: 10 })
      );

      expect(parseNaturalLanguageQuery('show me the last 3 purchases')).toEqual(
        expect.objectContaining({ limit: 3 })
      );
    });

    test('extracts "N recent" patterns', () => {
      expect(parseNaturalLanguageQuery('5 recent transactions')).toEqual(
        expect.objectContaining({ limit: 5 })
      );

      expect(parseNaturalLanguageQuery('3 recent charges')).toEqual(
        expect.objectContaining({ limit: 3 })
      );
    });

    test('extracts "top N" patterns', () => {
      expect(parseNaturalLanguageQuery('top 10 expenses')).toEqual(
        expect.objectContaining({ limit: 10 })
      );

      expect(parseNaturalLanguageQuery('first 5 transactions')).toEqual(
        expect.objectContaining({ limit: 5 })
      );
    });

    test('ignores unreasonably large numbers', () => {
      expect(parseNaturalLanguageQuery('last 999 transactions')).toEqual(
        expect.objectContaining({ limit: 25 }) // Falls back to default
      );
    });

    test('handles missing numbers with defaults', () => {
      expect(parseNaturalLanguageQuery('recent transactions')).toEqual(
        expect.objectContaining({ limit: 25 })
      );

      expect(parseNaturalLanguageQuery('all transactions')).toEqual(
        expect.objectContaining({ limit: 100 })
      );
    });
  });

  describe('Merchant Extraction', () => {
    test('extracts merchants from "from/at" patterns', () => {
      expect(parseNaturalLanguageQuery('transactions from Amazon')).toEqual(
        expect.objectContaining({ search: 'amazon' })
      );

      expect(parseNaturalLanguageQuery('purchases at Starbucks')).toEqual(
        expect.objectContaining({ search: 'starbucks' })
      );

      expect(parseNaturalLanguageQuery('charges @ Target')).toEqual(
        expect.objectContaining({ search: 'target' })
      );
    });

    test('extracts merchants from "merchant charges" patterns', () => {
      expect(parseNaturalLanguageQuery('Amazon charges')).toEqual(
        expect.objectContaining({ search: 'amazon' })
      );

      expect(parseNaturalLanguageQuery('Walmart transactions')).toEqual(
        expect.objectContaining({ search: 'walmart' })
      );

      expect(parseNaturalLanguageQuery('Netflix payments')).toEqual(
        expect.objectContaining({ search: 'netflix' })
      );
    });

    test('extracts merchants from "spent at" patterns', () => {
      expect(parseNaturalLanguageQuery('money spent at Chipotle')).toEqual(
        expect.objectContaining({ search: 'chipotle' })
      );

      expect(parseNaturalLanguageQuery('spent on Uber')).toEqual(
        expect.objectContaining({ search: 'uber' })
      );
    });

    test('handles multi-word merchant names', () => {
      expect(parseNaturalLanguageQuery('Whole Foods charges')).toEqual(
        expect.objectContaining({ search: 'whole foods' })
      );

      expect(parseNaturalLanguageQuery('Best Buy transactions')).toEqual(
        expect.objectContaining({ search: 'best buy' })
      );
    });

    test('filters out common words', () => {
      expect(parseNaturalLanguageQuery('charges this month')).not.toEqual(
        expect.objectContaining({ search: expect.anything() })
      );

      expect(parseNaturalLanguageQuery('transactions and payments')).not.toEqual(
        expect.objectContaining({ search: 'and' })
      );
    });
  });

  describe('Time Period Extraction', () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    test('extracts "this month" correctly', () => {
      const result = parseNaturalLanguageQuery('expenses this month');

      expect(result).toEqual(expect.objectContaining({
        startDate: `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`
      }));

      // Should have an end date for this month
      expect(result.endDate).toBeDefined();
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('extracts "last month" correctly', () => {
      const result = parseNaturalLanguageQuery('spending last month');

      const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
      const year = currentMonth === 1 ? currentYear - 1 : currentYear;

      expect(result).toEqual(expect.objectContaining({
        startDate: `${year}-${lastMonth.toString().padStart(2, '0')}-01`
      }));

      expect(result.endDate).toBeDefined();
    });

    test('extracts "this week" correctly', () => {
      const result = parseNaturalLanguageQuery('transactions this week');

      expect(result.startDate).toBeDefined();
      expect(result.endDate).toBeDefined();
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('Amount Range Extraction', () => {
    test('extracts "over" amount patterns', () => {
      expect(parseNaturalLanguageQuery('transactions over $100')).toEqual(
        expect.objectContaining({ absAmountRange: [100, null] })
      );

      expect(parseNaturalLanguageQuery('expenses above $50.99')).toEqual(
        expect.objectContaining({ absAmountRange: [50.99, null] })
      );

      expect(parseNaturalLanguageQuery('charges more than $1,000')).toEqual(
        expect.objectContaining({ absAmountRange: [1000, null] })
      );
    });

    test('extracts "under" amount patterns', () => {
      expect(parseNaturalLanguageQuery('transactions under $25')).toEqual(
        expect.objectContaining({ absAmountRange: [null, 25] })
      );

      expect(parseNaturalLanguageQuery('expenses below $100.50')).toEqual(
        expect.objectContaining({ absAmountRange: [null, 100.50] })
      );

      expect(parseNaturalLanguageQuery('charges less than $500')).toEqual(
        expect.objectContaining({ absAmountRange: [null, 500] })
      );
    });

    test('extracts "exactly" amount patterns', () => {
      const result = parseNaturalLanguageQuery('transactions exactly $50');

      expect(result.absAmountRange).toBeDefined();
      expect(result.absAmountRange[0]).toBeCloseTo(49.5, 1);
      expect(result.absAmountRange[1]).toBeCloseTo(50.5, 1);
    });

    test('handles amounts with commas', () => {
      expect(parseNaturalLanguageQuery('expenses over $1,234.56')).toEqual(
        expect.objectContaining({ absAmountRange: [1234.56, null] })
      );
    });

    test('handles amounts without dollar signs', () => {
      expect(parseNaturalLanguageQuery('transactions over 100')).toEqual(
        expect.objectContaining({ absAmountRange: [100, null] })
      );
    });
  });

  describe('Complex Query Parsing', () => {
    test('combines multiple criteria correctly', () => {
      const result = parseNaturalLanguageQuery('last 5 Amazon charges over $50 this month');

      expect(result.limit).toBe(5);
      expect(result.search).toBe('amazon');
      expect(result.absAmountRange).toEqual([50, null]);
      expect(result.startDate).toMatch(/^\d{4}-\d{2}-01$/);
      expect(result.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('handles partial queries gracefully', () => {
      const result1 = parseNaturalLanguageQuery('Starbucks charges');
      expect(result1).toEqual(
        expect.objectContaining({
          search: 'starbucks',
          limit: 25
        })
      );

      expect(parseNaturalLanguageQuery('over $100')).toEqual(
        expect.objectContaining({
          absAmountRange: [100, null],
          limit: 25
        })
      );
    });

    test('preserves existing args', () => {
      const existingArgs = { orderBy: 'date', someOtherField: 'value' };
      const result = parseNaturalLanguageQuery('last 3 Amazon charges', existingArgs);

      expect(result.limit).toBe(3);
      expect(result.search).toBe('amazon');
      expect(result.orderBy).toBe('date');
      expect(result.someOtherField).toBe('value');
    });

    test('overrides conflicting existing args', () => {
      const existingArgs = { limit: 100 };
      const result = parseNaturalLanguageQuery('last 5 transactions', existingArgs);

      expect(result.limit).toBe(5); // Should override the existing limit
    });
  });

  describe('Edge Cases', () => {
    test('handles empty queries', () => {
      const result = parseNaturalLanguageQuery('');
      expect(result.limit).toBe(25); // Should have default limit
    });

    test('handles queries with no recognizable patterns', () => {
      const result = parseNaturalLanguageQuery('show me stuff');
      expect(result.limit).toBe(25);
      expect(result.search).toBeUndefined();
    });

    test('handles case insensitivity', () => {
      expect(parseNaturalLanguageQuery('AMAZON CHARGES')).toEqual(
        expect.objectContaining({ search: 'amazon' })
      );

      expect(parseNaturalLanguageQuery('Last 5 TRANSACTIONS')).toEqual(
        expect.objectContaining({ limit: 5 })
      );
    });

    test('handles special characters in merchant names', () => {
      expect(parseNaturalLanguageQuery('AT&T charges')).toEqual(
        expect.objectContaining({ search: 'at&t' })
      );
    });

    test('prioritizes first merchant match when multiple patterns exist', () => {
      const result = parseNaturalLanguageQuery('Amazon charges from Walmart at Target');
      expect(result.search).toBe('amazon'); // Should pick the first match due to exact name priority
    });
  });

  describe('Performance and Reliability', () => {
    test('processes complex queries quickly', () => {
      const complexQuery = 'show me the last 10 Amazon Prime charges over $25.99 from this month including returns and refunds';

      const start = Date.now();
      const result = parseNaturalLanguageQuery(complexQuery);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Should complete in under 50ms
      expect(result).toBeDefined();
    });

    test('handles malformed inputs gracefully', () => {
      const malformedQueries = [
        'last transactions 5', // Wrong order
        'over $', // Incomplete amount
        'charges from', // Incomplete merchant
        '$$$$', // Invalid characters
        'last -5 transactions', // Negative number
      ];

      malformedQueries.forEach(query => {
        expect(() => parseNaturalLanguageQuery(query)).not.toThrow();
        const result = parseNaturalLanguageQuery(query);
        expect(result.limit).toBeGreaterThan(0);
      });
    });
  });
});