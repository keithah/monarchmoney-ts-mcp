#!/usr/bin/env node

// Test GraphQL schema discovery and optimization
require('dotenv').config();

const { spawn } = require('child_process');

console.log('🔍 Testing GraphQL Schema Discovery & Optimization');
console.log('================================================');
console.log('');

// Start the MCP server
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env }
});

let testCount = 0;
let results = {};

function sendTest(name, message, delay = 3000) {
  testCount++;
  setTimeout(() => {
    console.log(`\n📤 Test ${testCount}: ${name}`);
    console.log(`   Requesting: ${message.params.name}(${JSON.stringify(message.params.arguments)})`);
    serverProcess.stdin.write(JSON.stringify(message) + '\n');
  }, delay);
}

// Initialize
sendTest('Initialize', {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'graphql-test-client', version: '1.0.0' }
  }
}, 1000);

// Test 1: Standard accounts call (baseline)
sendTest('Accounts (Standard)', {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'accounts_getAll',
    arguments: { verbosity: 'detailed' }
  }
}, 4000);

// Test 2: Brief accounts call (optimized)
sendTest('Accounts (Brief)', {
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'accounts_getAll',
    arguments: { verbosity: 'brief' }
  }
}, 7000);

// Test 3: Standard transactions call (baseline)
sendTest('Transactions (Standard)', {
  jsonrpc: '2.0',
  id: 4,
  method: 'tools/call',
  params: {
    name: 'transactions_getTransactions',
    arguments: {
      limit: 10,
      verbosity: 'detailed'
    }
  }
}, 10000);

// Test 4: Brief transactions call (optimized)
sendTest('Transactions (Brief)', {
  jsonrpc: '2.0',
  id: 5,
  method: 'tools/call',
  params: {
    name: 'transactions_getTransactions',
    arguments: {
      limit: 10,
      verbosity: 'brief'
    }
  }
}, 13000);

// Test 5: Smart query test
sendTest('Smart Query', {
  jsonrpc: '2.0',
  id: 6,
  method: 'tools/call',
  params: {
    name: 'transactions_smartQuery',
    arguments: {
      query: 'last 5 Amazon charges'
    }
  }
}, 16000);

// Test 6: Quick stats (ultra-compact)
sendTest('Quick Stats', {
  jsonrpc: '2.0',
  id: 7,
  method: 'tools/call',
  params: {
    name: 'insights_getQuickStats',
    arguments: {}
  }
}, 19000);

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    try {
      const parsed = JSON.parse(output);
      if (parsed.result && parsed.result.content && parsed.id) {
        const testName = {
          2: 'Accounts (Standard)',
          3: 'Accounts (Brief)',
          4: 'Transactions (Standard)',
          5: 'Transactions (Brief)',
          6: 'Smart Query',
          7: 'Quick Stats'
        }[parsed.id];

        if (testName) {
          const content = parsed.result.content[0].text;
          console.log(`\n✅ ${testName}:`);
          console.log('─'.repeat(60));

          // Show first 200 chars and last 100 chars for large responses
          if (content.length > 300) {
            console.log(content.substring(0, 200) + '\n[...]\n' + content.substring(content.length - 100));
          } else {
            console.log(content);
          }

          console.log('─'.repeat(60));
          console.log(`📏 Length: ${content.length} characters`);

          results[testName] = {
            length: content.length,
            content: content
          };
        }
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
});

// Analysis after all tests
setTimeout(() => {
  console.log('\n🎯 GRAPHQL OPTIMIZATION ANALYSIS');
  console.log('=================================');

  // Calculate optimization percentages
  const accountsStandard = results['Accounts (Standard)']?.length || 0;
  const accountsBrief = results['Accounts (Brief)']?.length || 0;
  const transactionsStandard = results['Transactions (Standard)']?.length || 0;
  const transactionsBrief = results['Transactions (Brief)']?.length || 0;
  const quickStats = results['Quick Stats']?.length || 0;

  console.log('\n📊 Size Comparisons:');
  if (accountsStandard && accountsBrief) {
    const accountReduction = Math.round((1 - accountsBrief / accountsStandard) * 100);
    console.log(`🏦 Accounts: ${accountsStandard} → ${accountsBrief} chars (${accountReduction}% reduction)`);
  }

  if (transactionsStandard && transactionsBrief) {
    const transactionReduction = Math.round((1 - transactionsBrief / transactionsStandard) * 100);
    console.log(`💳 Transactions: ${transactionsStandard} → ${transactionsBrief} chars (${transactionReduction}% reduction)`);
  }

  if (quickStats) {
    console.log(`⚡ Quick Stats: ${quickStats} chars (ultra-compact)`);
  }

  console.log('\n🎨 Context Usage Categories:');
  Object.entries(results).forEach(([test, data]) => {
    const category = data.length < 100 ? '🟢 Ultra-compact' :
                    data.length < 500 ? '🟡 Compact' :
                    data.length < 2000 ? '🟠 Medium' : '🔴 Large';
    console.log(`${category}: ${test} - ${data.length} chars`);
  });

  console.log('\n💡 Optimization Recommendations:');
  console.log('• Use "brief" verbosity for quick overviews');
  console.log('• Use smart queries for natural language requests');
  console.log('• Use quick stats for ultra-compact summaries');
  console.log('• Reserve "detailed" for when comprehensive data is needed');

  if (accountsStandard && accountsBrief && transactionsStandard && transactionsBrief) {
    const avgReduction = Math.round(((1 - accountsBrief / accountsStandard) + (1 - transactionsBrief / transactionsStandard)) / 2 * 100);
    console.log(`\n🎊 Average optimization: ${avgReduction}% size reduction!`);
  }

  console.log('\n🛑 Test complete, shutting down...');
  serverProcess.kill();
  process.exit(0);
}, 25000);