#!/usr/bin/env node

// Test the new smart transaction query feature
require('dotenv').config();

const { spawn } = require('child_process');

console.log('🧠 Testing Smart Transaction Query');
console.log('==================================');
console.log('');

// Start the MCP server
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: { ...process.env }
});

// Send initialization
setTimeout(() => {
  console.log('📤 Initializing...');

  const initMessage = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  };

  serverProcess.stdin.write(JSON.stringify(initMessage) + '\n');
}, 1000);

// Test smart query: "last 3 Amazon charges"
setTimeout(() => {
  console.log('📤 Testing smart query: "last 3 Amazon charges"...');

  const smartQueryMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'transactions_smartQuery',
      arguments: {
        query: 'last 3 Amazon charges'
      }
    }
  };

  serverProcess.stdin.write(JSON.stringify(smartQueryMessage) + '\n');
}, 3000);

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    try {
      const parsed = JSON.parse(output);
      if (parsed.result && parsed.result.content) {
        console.log('✅ Smart Query Result:');
        console.log('====================');
        console.log(parsed.result.content[0].text);
        console.log('====================');
        console.log(`📏 Length: ${parsed.result.content[0].text.length} characters`);
      }
    } catch (e) {
      console.log('📥 Server output:', output.substring(0, 200) + '...');
    }
  }
});

// Clean up after 15 seconds
setTimeout(() => {
  console.log('\n🛑 Test complete, shutting down...');
  serverProcess.kill();
  process.exit(0);
}, 15000);