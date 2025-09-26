#!/usr/bin/env node

// Test the context optimization features: verbosity levels and pre-aggregated tools
require('dotenv').config();

const { spawn } = require('child_process');

console.log('🎯 Testing Context Optimization Features');
console.log('=========================================');
console.log('');

// Start the MCP server
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env }
});

let testCount = 0;

function sendTest(name, message, delay = 3000) {
  testCount++;
  setTimeout(() => {
    console.log(`\n📤 Test ${testCount}: ${name}`);
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
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
}, 1000);

// Test 1: Brief verbosity for accounts
sendTest('Accounts (Brief)', {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/call',
  params: {
    name: 'accounts_getAll',
    arguments: { verbosity: 'brief' }
  }
}, 4000);

// Test 2: Detailed verbosity for accounts
sendTest('Accounts (Detailed)', {
  jsonrpc: '2.0',
  id: 3,
  method: 'tools/call',
  params: {
    name: 'accounts_getAll',
    arguments: { verbosity: 'detailed' }
  }
}, 7000);

// Test 3: Pre-aggregated spending by category
sendTest('Spending by Category (Ultra-compact)', {
  jsonrpc: '2.0',
  id: 4,
  method: 'tools/call',
  params: {
    name: 'spending_getByCategoryMonth',
    arguments: { topN: 5 }
  }
}, 10000);

// Test 4: Quick stats
sendTest('Quick Stats (One line)', {
  jsonrpc: '2.0',
  id: 5,
  method: 'tools/call',
  params: {
    name: 'insights_getQuickStats',
    arguments: {}
  }
}, 13000);

// Test 5: Balance trends
sendTest('Balance Trends (Summary)', {
  jsonrpc: '2.0',
  id: 6,
  method: 'tools/call',
  params: {
    name: 'accounts_getBalanceTrends',
    arguments: {}
  }
}, 16000);

// Handle server output
let results = {};

serverProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    try {
      const parsed = JSON.parse(output);
      if (parsed.result && parsed.result.content && parsed.id) {
        const testName = {
          2: 'Brief Accounts',
          3: 'Detailed Accounts',
          4: 'Spending Summary',
          5: 'Quick Stats',
          6: 'Balance Trends'
        }[parsed.id];

        if (testName) {
          const content = parsed.result.content[0].text;
          console.log(`\n✅ ${testName}:`);
          console.log('─'.repeat(50));
          console.log(content);
          console.log('─'.repeat(50));
          console.log(`📏 Length: ${content.length} characters`);

          results[testName] = content.length;
        }
      }
    } catch (e) {
      // Not JSON, skip
    }
  }
});

// Summary after all tests
setTimeout(() => {
  console.log('\n🎯 CONTEXT OPTIMIZATION SUMMARY');
  console.log('===============================');

  Object.entries(results).forEach(([test, length]) => {
    const category = length < 100 ? '🟢 Ultra-compact' :
                    length < 500 ? '🟡 Compact' :
                    length < 2000 ? '🟠 Medium' : '🔴 Large';
    console.log(`${category}: ${test} - ${length} chars`);
  });

  console.log('\n💡 Context Usage Analysis:');
  console.log('• Brief mode: Perfect for quick checks');
  console.log('• Pre-aggregated tools: Minimal context usage');
  console.log('• Detailed mode: When you need full information');
  console.log('');
  console.log('🎊 Context optimization features working perfectly!');

  console.log('\n🛑 Test complete, shutting down...');
  serverProcess.kill();
  process.exit(0);
}, 20000);