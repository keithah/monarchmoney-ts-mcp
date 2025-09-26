#!/usr/bin/env node

// Test script to run MCP server locally for debugging
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing MCP Server Locally');
console.log('================================');
console.log('');
console.log('📋 Instructions:');
console.log('1. Copy .env.test to .env and add your real MonarchMoney credentials');
console.log('2. Make sure you have run: npm run build');
console.log('3. This will start the MCP server in local mode');
console.log('');

// Check if .env exists
const fs = require('fs');
if (!fs.existsSync('.env')) {
  console.log('❌ No .env file found!');
  console.log('   Please copy .env.test to .env and add your MonarchMoney credentials:');
  console.log('   cp .env.test .env');
  console.log('   # Then edit .env with your real credentials');
  process.exit(1);
}

console.log('✅ Found .env file, starting MCP server...');
console.log('');

// Start the MCP server
const serverProcess = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'inherit'], // stdin, stdout, stderr
  env: { ...process.env }
});

console.log('🚀 MCP Server started. Watch for authentication messages above.');
console.log('');
console.log('📨 Testing MCP protocol messages...');

// Send MCP initialization
setTimeout(() => {
  console.log('📤 Sending initialize message...');

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

// Send tools/list after initialization
setTimeout(() => {
  console.log('📤 Sending tools/list request...');

  const toolsMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };

  serverProcess.stdin.write(JSON.stringify(toolsMessage) + '\n');
}, 3000);

// Handle server output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString().trim();
  if (output) {
    console.log('📥 Server response:', output);

    // Try to parse as JSON
    try {
      const parsed = JSON.parse(output);
      if (parsed.error) {
        console.log('❌ Error received:', parsed.error.message);
      } else if (parsed.result) {
        console.log('✅ Success! Result keys:', Object.keys(parsed.result));
      }
    } catch (e) {
      // Not JSON, just regular output
    }
  }
});

serverProcess.on('error', (err) => {
  console.error('💥 Server process error:', err);
});

serverProcess.on('close', (code) => {
  console.log(`🔚 Server process exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🛑 Terminating test...');
  serverProcess.kill();
  process.exit(0);
});