#!/usr/bin/env node

// Simple test to verify MonarchMoney authentication works
require('dotenv').config();

console.log('🔐 Testing MonarchMoney Authentication');
console.log('====================================');
console.log('');

const { MonarchClient } = require('monarchmoney');

async function testAuth() {
  console.log('📋 Environment check:');
  console.log('  MONARCH_EMAIL:', process.env.MONARCH_EMAIL || '❌ NOT SET');
  console.log('  MONARCH_PASSWORD:', process.env.MONARCH_PASSWORD ? '✅ SET' : '❌ NOT SET');
  console.log('  MONARCH_MFA_SECRET:', process.env.MONARCH_MFA_SECRET ? '✅ SET' : '⚠️  NOT SET (optional)');
  console.log('');

  if (!process.env.MONARCH_EMAIL || !process.env.MONARCH_PASSWORD) {
    console.log('❌ Missing required credentials in .env file');
    console.log('   Please set MONARCH_EMAIL and MONARCH_PASSWORD');
    process.exit(1);
  }

  console.log('🚀 Creating MonarchClient...');

  const client = new MonarchClient({
    baseURL: 'https://api.monarchmoney.com',
    timeout: 30000,
  });

  console.log('✅ MonarchClient created');
  console.log('');

  console.log('🔑 Attempting login...');
  console.log(`   Email: ${process.env.MONARCH_EMAIL}`);
  console.log(`   MFA: ${process.env.MONARCH_MFA_SECRET ? 'Yes' : 'No'}`);
  console.log('');

  try {
    await client.login({
      email: process.env.MONARCH_EMAIL,
      password: process.env.MONARCH_PASSWORD,
      mfaSecretKey: process.env.MONARCH_MFA_SECRET,
    });

    console.log('🎉 LOGIN SUCCESSFUL!');
    console.log('');

    // Test a simple API call
    console.log('📊 Testing API call...');
    const me = await client.get_me();
    console.log('✅ API call successful!');
    console.log('   User ID:', me.id);
    console.log('   Email:', me.email);
    console.log('');

    console.log('🎯 CONCLUSION: Authentication is working correctly!');
    console.log('   The issue is likely with Claude Desktop configuration or MCP protocol handling.');

  } catch (error) {
    console.log('❌ LOGIN FAILED!');
    console.log('');
    console.log('Error details:');
    console.log('  Message:', error.message);
    console.log('  Code:', error.code);
    console.log('  Details:', error.details);
    console.log('');

    if (error.message.includes('Forbidden') || error.message.includes('401')) {
      console.log('🔍 DIAGNOSIS: Invalid email/password combination');
      console.log('   - Double-check your email and password');
      console.log('   - Make sure your MonarchMoney account is not locked');
      console.log('   - Try logging into MonarchMoney web app to verify credentials');
    } else if (error.message.includes('MFA') || error.message.includes('totp')) {
      console.log('🔍 DIAGNOSIS: MFA/TOTP issue');
      console.log('   - Make sure MONARCH_MFA_SECRET is set correctly');
      console.log('   - Verify your TOTP secret generates valid codes');
    } else if (error.message.includes('429')) {
      console.log('🔍 DIAGNOSIS: Rate limited');
      console.log('   - Too many login attempts, wait a few minutes');
    } else {
      console.log('🔍 DIAGNOSIS: Unknown error');
      console.log('   - Check your internet connection');
      console.log('   - MonarchMoney servers might be down');
    }

    process.exit(1);
  }
}

testAuth().catch(console.error);