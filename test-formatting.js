#!/usr/bin/env node

// Quick test to see the new formatted output
require('dotenv').config();

const { spawn } = require('child_process');

console.log('🧪 Testing New Data Formatting');
console.log('==============================');
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

// Test accounts_getAll with new formatting
setTimeout(() => {
  console.log('📤 Testing accounts_getAll formatting...');

  const accountsMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'accounts_getAll',
      arguments: {}
    }
  };

  serverProcess.stdin.write(JSON.stringify(accountsMessage) + '\n');
}, 3000);

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    try {
      const parsed = JSON.parse(output);
      if (parsed.result && parsed.result.content) {
        console.log('✅ Formatted Output:');
        console.log('==================');
        console.log(parsed.result.content[0].text);
        console.log('==================');
        console.log(`📏 Length: ${parsed.result.content[0].text.length} characters`);
      }
    } catch (e) {
      console.log('📥 Server output:', output.substring(0, 200) + '...');
    }
  }
});

// Clean up after 10 seconds
setTimeout(() => {
  console.log('\n🛑 Test complete, shutting down...');
  serverProcess.kill();
  process.exit(0);
}, 10000);