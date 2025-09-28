import pkg from 'monarchmoney';
const { MonarchClient } = pkg;

async function testAuth() {
  console.log('Testing MonarchMoney authentication...');
  
  // Create client
  const client = new MonarchClient({
    baseURL: 'https://api.monarchmoney.com',
    timeout: 30000,
  });
  
  try {
    // Test with dummy credentials first
    await client.login({
      email: 'test@example.com',
      password: 'testpass',
    });
    console.log('Authentication successful!');
    
    // Try to get accounts
    const accounts = await client.accounts.getAll();
    console.log('Accounts retrieved:', accounts.length);
  } catch (error) {
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    if (error.response) {
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
    }
  }
}

testAuth();
