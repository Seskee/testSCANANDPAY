const axios = require('axios');

async function testLogin() {
  try {
    // Try to register a new user
    const email = 'test-dashboard-' + Date.now() + '@example.com';
    const password = 'TestPass123!';
    
    console.log('Registering user:', email);
    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', {
      email,
      password,
      restaurantName: 'Test Dashboard Restaurant',
      numberOfTables: 10
    });
    
    console.log('Registration successful');
    console.log('Token:', registerResponse.data.token);
    console.log('User ID:', registerResponse.data.user._id);
    console.log('Restaurant ID:', registerResponse.data.restaurant._id);
    
    return registerResponse.data;
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testLogin().then(() => process.exit(0));
