#!/usr/bin/env node

// Test auth without MFA to isolate the issue
require('dotenv').config();

const { MonarchClient } = require('monarchmoney');

async function testAuthNoMFA() {
  console.log('🔐 Testing MonarchMoney Authentication WITHOUT MFA');
  console.log('==================================================');
  console.log('');
  console.log('📋 Using credentials:');
  console.log('  Email:', process.env.MONARCH_EMAIL);
  console.log('  Password: [SET]');
  console.log('  MFA: [DISABLED FOR THIS TEST]');
  console.log('');

  const client = new MonarchClient({
    baseURL: 'https://api.monarchmoney.com',
    timeout: 30000,
  });

  try {
    console.log('🔑 Attempting login without MFA...');

    await client.login({
      email: process.env.MONARCH_EMAIL,
      password: process.env.MONARCH_PASSWORD,
      // mfaSecretKey: undefined  // Explicitly not providing MFA
    });

    console.log('🎉 SUCCESS! Login worked without MFA');

    // Test API call
    const me = await client.get_me();
    console.log('✅ API call successful:', me.email);

  } catch (error) {
    console.log('❌ Failed:', error.message);

    if (error.message.includes('MFA') || error.message.includes('two-factor') || error.message.includes('otp')) {
      console.log('');
      console.log('🔍 DIAGNOSIS: MFA is REQUIRED for this account');
      console.log('   The account requires MFA, so we need to fix the MFA implementation');
    } else if (error.message.includes('Forbidden') || error.message.includes('401')) {
      console.log('');
      console.log('🔍 DIAGNOSIS: Basic credentials are invalid');
      console.log('   The email/password combination is incorrect');
    }
  }
}

testAuthNoMFA().catch(console.error);