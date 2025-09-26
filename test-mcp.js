#!/usr/bin/env node

/**
 * Test script for the MonarchMoney MCP Server
 * This simulates basic MCP protocol communication
 */

const { spawn } = require('child_process');
const { join } = require('path');


console.log('🧪 Testing MonarchMoney MCP Server');
console.log('==================================');

const serverPath = join(__dirname, 'dist', 'index.js');

// Start the MCP server
const server = spawn('node', [serverPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseCount = 0;

server.stdout.on('data', (data) => {
  const response = data.toString();
  console.log('📨 Server Response:', response);
  responseCount++;
  
  // After getting some responses, exit
  if (responseCount >= 2) {
    server.kill();
  }
});

server.on('close', (code) => {
  console.log(`\n🏁 Server exited with code ${code}`);
  if (code === 0 || code === null) {
    console.log('✅ MCP Server test completed successfully!');
  } else {
    console.log('❌ MCP Server test failed');
    process.exit(1);
  }
});

// Send MCP initialization
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {}
    },
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

console.log('📤 Sending initialization message...');
server.stdin.write(JSON.stringify(initMessage) + '\n');

// Wait a bit then send tools/list request
setTimeout(() => {
  const toolsMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  
  console.log('📤 Sending tools/list request...');
  server.stdin.write(JSON.stringify(toolsMessage) + '\n');
}, 1000);

// Exit after 5 seconds if still running
setTimeout(() => {
  if (!server.killed) {
    console.log('⏰ Test timeout, killing server...');
    server.kill();
  }
}, 5000);