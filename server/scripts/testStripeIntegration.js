require('dotenv').config();
const axios = require('axios');
const { connectDB } = require('../config/database');

const BASE_URL = 'http://localhost:3000';

// Test user credentials
const testUser = {
  email: `stripe_test_${Date.now()}@test.com`,
  password: 'Test123!@#',
  restaurantName: 'Stripe Test Restaurant',
  tableCount: 10
};

let authToken = '';
let restaurantId = '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(config => {
  if (authToken) {
    config.headers.Authorization = `Bearer ${authToken}`;
  }
  return config;
});

async function testStripeIntegration() {
  console.log('\n========================================');
  console.log('Testing Stripe Connect Integration');
  console.log('========================================\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✅ Database connected\n');

    // Step 1: Register a new user
    console.log('1. Registering new user...');
    const registerResponse = await api.post('/api/auth/register', testUser);
    authToken = registerResponse.data.token;
    console.log('✅ User registered successfully');
    console.log(`   Email: ${testUser.email}\n`);

    // Step 2: Get user profile to get restaurant ID
    console.log('2. Fetching user profile...');
    const profileResponse = await api.get('/api/auth/me');
    restaurantId = profileResponse.data.user.restaurantId;
    console.log('✅ Profile fetched');
    console.log(`   Restaurant ID: ${restaurantId}\n`);

    // Step 3: Check initial Stripe status
    console.log('3. Checking initial Stripe Connect status...');
    const initialStatusResponse = await api.get(`/api/stripe/connect/status/${restaurantId}`);
    console.log('✅ Initial status retrieved');
    console.log(`   Account ID: ${initialStatusResponse.data.accountId || 'Not set'}`);
    console.log(`   Onboarding Complete: ${initialStatusResponse.data.onboardingComplete}`);
    console.log(`   Charges Enabled: ${initialStatusResponse.data.chargesEnabled}`);
    console.log(`   Payouts Enabled: ${initialStatusResponse.data.payoutsEnabled}\n`);

    // Step 4: Start Stripe Connect onboarding
    console.log('4. Starting Stripe Connect onboarding...');
    const onboardingResponse = await api.post('/api/stripe/connect/onboard', {
      restaurantId: restaurantId,
      refreshUrl: 'http://localhost:5173/restaurant/settings',
      returnUrl: 'http://localhost:5173/restaurant/settings'
    });
    console.log('✅ Onboarding link created');
    console.log(`   Stripe Account ID: ${onboardingResponse.data.accountId}`);
    console.log(`   Onboarding URL: ${onboardingResponse.data.url.substring(0, 80)}...\n`);

    // Step 5: Check updated Stripe status
    console.log('5. Checking updated Stripe Connect status...');
    const updatedStatusResponse = await api.get(`/api/stripe/connect/status/${restaurantId}`);
    console.log('✅ Updated status retrieved');
    console.log(`   Account ID: ${updatedStatusResponse.data.accountId}`);
    console.log(`   Onboarding Complete: ${updatedStatusResponse.data.onboardingComplete}`);
    console.log(`   Charges Enabled: ${updatedStatusResponse.data.chargesEnabled}`);
    console.log(`   Payouts Enabled: ${updatedStatusResponse.data.payoutsEnabled}\n`);

    console.log('========================================');
    console.log('✅ ALL STRIPE CONNECT TESTS PASSED');
    console.log('========================================\n');
    console.log('⚠️  NOTE: To complete onboarding and test payments:');
    console.log('1. Open the onboarding URL in a browser');
    console.log('2. Complete the Stripe Connect setup');
    console.log('3. Create a bill using the seedBills script');
    console.log('4. Test payment processing through the UI\n');

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, error.response.data);
    }
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the test
testStripeIntegration();
