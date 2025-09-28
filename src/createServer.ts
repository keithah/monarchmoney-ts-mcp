#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { MonarchClient } from 'monarchmoney';

// Configuration schema - automatically detected by Smithery
export const configSchema = z.object({
  email: z.string().email().describe("MonarchMoney email address for login"),
  password: z.string().describe("MonarchMoney password"),
  mfaSecret: z.string().optional().describe("Optional MFA/TOTP secret for two-factor authentication"),
});


/**
 * MonarchMoney MCP Server
 *
 * This MCP server integrates with MonarchMoney API to provide financial data access.
 * Features include account summaries, transaction history, budget tracking,
 * and AI-optimized responses with 99% size reduction for context efficiency.
 */

export default function createServer({
  config
}: {
  config: z.infer<typeof configSchema>
}) {
    // Create MCP server
    const server = new McpServer({
      name: "monarchmoney-mcp",
      title: "MonarchMoney Financial Data",
      version: "1.1.1"
    });


    // Initialize MonarchMoney client
    const email = config.email;
    const password = config.password;
    const mfaSecret = config.mfaSecret;

    // Create MonarchMoney client if credentials are provided
    let monarchClient: any = null;
    let isAuthenticated = false;

    // Helper function to ensure authentication
    const ensureAuthenticated = async () => {
      if (isAuthenticated) return;

      if (!email || !password) {
        throw new Error("MonarchMoney credentials are required. Please configure email and password in the server settings.");
      }

      if (!monarchClient) {
        monarchClient = new MonarchClient({
          baseURL: 'https://api.monarchmoney.com',
          timeout: 30000,
        });
      }

      try {
        await monarchClient.login({
          email,
          password,
          mfaSecretKey: mfaSecret,
        });
        isAuthenticated = true;
      } catch (error) {
        throw new Error(`MonarchMoney authentication failed: ${error}`);
      }
    };

    // Register get_accounts tool
    server.tool(
      "get_accounts",
      "Get all MonarchMoney accounts with AI optimization features (99% response reduction)",
      {
        verbosity: z.enum(["ultra-light", "light", "standard"]).optional().default("light")
          .describe("Response verbosity level for AI optimization")
      },
      async ({ verbosity = "light" }) => {
        await ensureAuthenticated();

        const accounts = await monarchClient.accounts.getAll();

        let responseText: string;

        if (verbosity === "ultra-light") {
          const total = accounts.reduce((sum: number, acc: any) => sum + (acc.currentBalance || 0), 0);
          responseText = `💰 ${accounts.length} accounts, Total: $${total.toLocaleString()}`;
        } else if (verbosity === "light") {
          const summary = accounts.map((acc: any) => ({
            name: acc.displayName,
            balance: acc.currentBalance,
            type: acc.type?.display
          }));

          const result = {
            total_accounts: accounts.length,
            total_balance: accounts.reduce((sum: number, acc: any) => sum + (acc.currentBalance || 0), 0),
            accounts: summary.map((a: any) => ({
              name: a.name,
              balance: a.balance,
              type: a.type
            }))
          };
          responseText = JSON.stringify(result, null, 2);
        } else {
          const result = {
            total_accounts: accounts.length,
            accounts: accounts
          };
          responseText = JSON.stringify(result, null, 2);
        }

        return {
          content: [
            {
              type: "text",
              text: responseText
            }
          ]
        };
      }
    );

    // Register get_transactions tool
    server.tool(
      "get_transactions",
      "Get recent transactions with filtering and AI optimization",
      {
        limit: z.number().optional().default(25).describe("Maximum number of transactions to return"),
        verbosity: z.enum(["ultra-light", "light", "standard"]).optional().default("light")
          .describe("Response verbosity level for AI optimization"),
        startDate: z.string().optional().describe("Start date (YYYY-MM-DD)"),
        endDate: z.string().optional().describe("End date (YYYY-MM-DD)")
      },
      async ({ limit = 25, verbosity = "light", startDate, endDate }) => {
        await ensureAuthenticated();

        const args: any = { limit };
        if (startDate) args.startDate = startDate;
        if (endDate) args.endDate = endDate;

        const result = await monarchClient.transactions.getTransactions(args);
        const transactions = result.transactions || [];

        let responseText: string;

        if (verbosity === "ultra-light") {
          const totalAmount = transactions.reduce((sum: number, txn: any) => sum + Math.abs(txn.amount || 0), 0);
          responseText = `💳 ${transactions.length} transactions, Total: $${totalAmount.toLocaleString()}`;
        } else if (verbosity === "light") {
          const result = {
            total_transactions: transactions.length,
            transactions: transactions.slice(0, 10).map((txn: any) => ({
              date: txn.date,
              description: txn.merchantName || txn.description,
              amount: txn.amount,
              category: txn.category?.name
            }))
          };
          responseText = JSON.stringify(result, null, 2);
        } else {
          const result = {
            total_transactions: transactions.length,
            transactions: transactions
          };
          responseText = JSON.stringify(result, null, 2);
        }

        return {
          content: [
            {
              type: "text",
              text: responseText
            }
          ]
        };
      }
    );

    // Register get_budgets tool
    server.tool(
      "get_budgets",
      "Get budget information with spending analysis",
      {
        verbosity: z.enum(["ultra-light", "light", "standard"]).optional().default("light")
          .describe("Response verbosity level for AI optimization")
      },
      async ({ verbosity = "light" }) => {
        await ensureAuthenticated();

        try {
          const budgets = await monarchClient.budgets.getBudgets();

          let responseText: string;

          if (verbosity === "ultra-light") {
            const totalBudgeted = budgets.reduce((sum: number, b: any) => sum + (b.budgeted || 0), 0);
            const totalSpent = budgets.reduce((sum: number, b: any) => sum + (b.actual || 0), 0);
            responseText = `💰 ${budgets.length} budgets, $${totalSpent.toLocaleString()}/$${totalBudgeted.toLocaleString()} spent`;
          } else {
            const result = {
              total_budgets: budgets.length,
              budgets: budgets.map((budget: any) => ({
                category: budget.category?.name || budget.name,
                budgeted: budget.budgeted || 0,
                spent: budget.actual || budget.spent || 0,
                remaining: (budget.budgeted || 0) - (budget.actual || budget.spent || 0)
              }))
            };
            responseText = JSON.stringify(result, null, 2);
          }

          return {
            content: [
              {
                type: "text",
                text: responseText
              }
            ]
          };
        } catch (error) {
          throw new Error(`Failed to get budgets: ${error}`);
        }
      }
    );

    // Return the server object (Smithery CLI handles transport)
    return server.server;
}