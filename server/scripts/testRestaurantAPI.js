require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test credentials - will create a new test user
const TEST_USER = {
  email: 'apitest@restaurant.com',
  password: 'testpassword123',
  restaurantName: 'API Test Owner',
  tableCount: 10
};

let authToken = '';
let createdRestaurantId = '';
let userExists = false;

// Helper function to make authenticated requests
const apiCall = async (method, endpoint, data = null, params = null) => {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    }
  };

  if (data) config.data = data;
  if (params) config.params = params;

  try {
    const response = await axios(config);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || error.message);
  }
};

// Test 0: Register (if needed)
const testRegister = async () => {
  console.log('\n📝 Test 0: Register User (if needed)');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/register`, TEST_USER);
    authToken = response.data.token;
    console.log('✅ User registered successfully');
    console.log('   Email:', TEST_USER.email);
    userExists = false;
    return true;
  } catch (error) {
    if (error.response?.data?.error?.includes('already exists')) {
      console.log('ℹ️  User already exists, will try to login');
      userExists = true;
      return true;
    }
    console.error('❌ Registration failed:', error.response?.data?.error || error.message);
    return false;
  }
};

// Test 1: Login
const testLogin = async () => {
  console.log('\n📝 Test 1: Login');
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, TEST_USER);
    authToken = response.data.token;
    console.log('✅ Login successful');
    console.log('   Token:', authToken.substring(0, 20) + '...');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error || error.message);
    return false;
  }
};

// Test 2: Create Restaurant
const testCreateRestaurant = async () => {
  console.log('\n📝 Test 2: Create Restaurant');
  try {
    const restaurantData = {
      name: 'Test Restaurant API',
      description: 'Created via API test script',
      phone: '+1-555-TEST-001',
      email: 'test@apirestaurant.com',
      tableCount: 12,
      address: {
        street: '123 API Test Street',
        city: 'Test City',
        state: 'TC',
        zipCode: '12345',
        country: 'USA'
      }
    };

    const result = await apiCall('POST', '/api/restaurants', restaurantData);
    createdRestaurantId = result.restaurant._id;
    console.log('✅ Restaurant created successfully');
    console.log('   ID:', result.restaurant._id);
    console.log('   Name:', result.restaurant.name);
    console.log('   Tables:', result.restaurant.tableCount);
    return true;
  } catch (error) {
    console.error('❌ Create restaurant failed:', error.message);
    return false;
  }
};

// Test 3: Get All Restaurants
const testGetRestaurants = async () => {
  console.log('\n📝 Test 3: Get All Restaurants');
  try {
    const result = await apiCall('GET', '/api/restaurants', null, { myRestaurants: true });
    console.log('✅ Retrieved restaurants successfully');
    console.log('   Total count:', result.restaurants.length);
    result.restaurants.forEach((r, i) => {
      console.log(`   ${i + 1}. ${r.name} (${r.tableCount} tables)`);
    });
    return true;
  } catch (error) {
    console.error('❌ Get restaurants failed:', error.message);
    return false;
  }
};

// Test 4: Get Single Restaurant
const testGetRestaurantById = async () => {
  console.log('\n📝 Test 4: Get Single Restaurant by ID');
  try {
    const result = await apiCall('GET', `/api/restaurants/${createdRestaurantId}`);
    console.log('✅ Retrieved restaurant successfully');
    console.log('   Name:', result.restaurant.name);
    console.log('   Description:', result.restaurant.description);
    console.log('   Phone:', result.restaurant.phone);
    console.log('   Email:', result.restaurant.email);
    console.log('   Address:', `${result.restaurant.address?.city}, ${result.restaurant.address?.state}`);
    return true;
  } catch (error) {
    console.error('❌ Get restaurant by ID failed:', error.message);
    return false;
  }
};

// Test 5: Update Restaurant
const testUpdateRestaurant = async () => {
  console.log('\n📝 Test 5: Update Restaurant');
  try {
    const updateData = {
      name: 'Updated Test Restaurant',
      description: 'Updated via API test script',
      tableCount: 20
    };

    const result = await apiCall('PUT', `/api/restaurants/${createdRestaurantId}`, updateData);
    console.log('✅ Restaurant updated successfully');
    console.log('   New name:', result.restaurant.name);
    console.log('   New description:', result.restaurant.description);
    console.log('   New table count:', result.restaurant.tableCount);
    return true;
  } catch (error) {
    console.error('❌ Update restaurant failed:', error.message);
    return false;
  }
};

// Test 6: Delete Restaurant (Soft Delete)
const testDeleteRestaurant = async () => {
  console.log('\n📝 Test 6: Delete Restaurant (Soft Delete)');
  try {
    const result = await apiCall('DELETE', `/api/restaurants/${createdRestaurantId}`);
    console.log('✅ Restaurant soft deleted successfully');
    console.log('   Message:', result.message);

    // Verify it's marked as inactive
    const verifyResult = await apiCall('GET', `/api/restaurants/${createdRestaurantId}`);
    console.log('   Status after delete:', verifyResult.restaurant.isActive ? 'Active' : 'Inactive');
    return true;
  } catch (error) {
    console.error('❌ Delete restaurant failed:', error.message);
    return false;
  }
};

// Test 7: Permanent Delete (Optional - cleanup)
const testPermanentDelete = async () => {
  console.log('\n📝 Test 7: Permanent Delete Restaurant');
  try {
    const result = await apiCall('DELETE', `/api/restaurants/${createdRestaurantId}`, null, { permanent: true });
    console.log('✅ Restaurant permanently deleted');
    console.log('   Message:', result.message);
    return true;
  } catch (error) {
    console.error('❌ Permanent delete failed:', error.message);
    return false;
  }
};

// Run all tests
const runAllTests = async () => {
  console.log('🚀 Starting Restaurant API Tests...');
  console.log('=====================================');

  const results = {
    register: await testRegister()
  };

  // Only continue if registration was successful
  if (!results.register) {
    console.log('\n❌ Tests aborted: Registration failed');
    console.log('\nPlease make sure the server is running on http://localhost:3000');
    process.exit(1);
  }

  // If user exists, need to login
  if (userExists) {
    results.login = await testLogin();
    if (!results.login) {
      console.log('\n❌ Tests aborted: Login failed');
      process.exit(1);
    }
  }

  results.create = await testCreateRestaurant();
  results.getAll = await testGetRestaurants();
  results.getById = await testGetRestaurantById();
  results.update = await testUpdateRestaurant();
  results.delete = await testDeleteRestaurant();
  results.permanentDelete = await testPermanentDelete();

  console.log('\n=====================================');
  console.log('📊 Test Results Summary:');
  console.log('=====================================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test.toUpperCase()}`);
  });

  const passedCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;
  console.log(`\nTotal: ${passedCount}/${totalCount} tests passed`);

  if (passedCount === totalCount) {
    console.log('\n🎉 All tests passed successfully!');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the logs above.');
  }
};

// Run tests
runAllTests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
