require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
let authToken = '';
let testRestaurantId = '';
let testBillId = '';

// Test user credentials
const testUser = {
  email: 'billtest@restaurant.com',
  password: 'Test123!',
  restaurantName: 'Bill Test Restaurant',
  tableCount: 10
};

const testResults = {
  passed: 0,
  failed: 0,
  total: 0
};

const logTest = (testName, passed, message = '') => {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`✅ ${testName}`);
  } else {
    testResults.failed++;
    console.log(`❌ ${testName}`);
    if (message) console.log(`   Error: ${message}`);
  }
};

const logSection = (sectionName) => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${sectionName}`);
  console.log(`${'='.repeat(50)}`);
};

// Helper to make authenticated requests
const authRequest = (config) => {
  return axios({
    ...config,
    headers: {
      ...config.headers,
      'Authorization': `Bearer ${authToken}`
    }
  });
};

const runTests = async () => {
  try {
    console.log('🚀 Starting Bill API Tests...\n');

    // Test 1: Register test user
    logSection('1. User Registration');
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/register`, testUser);
      authToken = response.data.token;
      logTest('User registration', response.status === 201, response.data.message);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('already exists')) {
        // User exists, try to login
        try {
          const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            email: testUser.email,
            password: testUser.password
          });
          authToken = loginResponse.data.token;
          logTest('User login (already exists)', true);
        } catch (loginError) {
          logTest('User registration/login', false, loginError.message);
          process.exit(1);
        }
      } else {
        logTest('User registration', false, error.message);
        process.exit(1);
      }
    }

    // Test 2: Create a test restaurant
    logSection('2. Restaurant Creation');
    try {
      const restaurantData = {
        name: 'Bill Test Restaurant',
        address: '456 Test Street, Test City',
        phone: '+1-555-0123',
        email: 'billtest@restaurant.com',
        tableCount: 10,
        cuisine: 'International'
      };

      const response = await authRequest({
        method: 'post',
        url: `${BASE_URL}/api/restaurants`,
        data: restaurantData
      });

      testRestaurantId = response.data.restaurant._id;
      logTest('Restaurant creation', response.status === 201 && testRestaurantId, response.data.message);
    } catch (error) {
      logTest('Restaurant creation', false, error.response?.data?.error || error.message);
      process.exit(1);
    }

    // Test 3: Create a new bill
    logSection('3. Bill Creation (POST /api/bills)');
    try {
      const billData = {
        restaurant: testRestaurantId,
        tableNumber: 5,
        items: [
          { name: 'Test Item 1', quantity: 2, price: 15.00 },
          { name: 'Test Item 2', quantity: 1, price: 25.50 }
        ],
        tax: 4.50,
        notes: 'Test bill'
      };

      const response = await authRequest({
        method: 'post',
        url: `${BASE_URL}/api/bills`,
        data: billData
      });

      testBillId = response.data.bill._id;
      const bill = response.data.bill;

      logTest('Create bill', response.status === 201 && testBillId);
      logTest('Bill has correct restaurant', bill.restaurant.toString() === testRestaurantId);
      logTest('Bill has correct table number', bill.tableNumber === 5);
      logTest('Bill has correct items count', bill.items.length === 2);
      logTest('Bill subtotal calculated correctly', bill.subtotal === 55.50);
      logTest('Bill total calculated correctly', bill.totalAmount === 60.00);
      logTest('Bill status is active', bill.status === 'active');

      console.log(`   Created bill ID: ${testBillId}`);
    } catch (error) {
      logTest('Create bill', false, error.response?.data?.error || error.message);
    }

    // Test 4: Get bill by ID
    logSection('4. Get Bill by ID (GET /api/bills/:id)');
    try {
      const response = await axios.get(`${BASE_URL}/api/bills/${testBillId}`);
      const bill = response.data.bill;

      logTest('Get bill by ID', response.status === 200);
      logTest('Bill ID matches', bill._id === testBillId);
      logTest('Bill has restaurant populated', bill.restaurant && bill.restaurant.name);

      console.log(`   Restaurant: ${bill.restaurant.name}`);
      console.log(`   Table: ${bill.tableNumber}`);
      console.log(`   Total: $${bill.totalAmount.toFixed(2)}`);
    } catch (error) {
      logTest('Get bill by ID', false, error.response?.data?.error || error.message);
    }

    // Test 5: Get bill by restaurant and table
    logSection('5. Get Bill by Restaurant and Table (GET /api/bills/restaurant/:id/table/:number)');
    try {
      const response = await axios.get(`${BASE_URL}/api/bills/restaurant/${testRestaurantId}/table/5`);
      const bill = response.data.bill;

      logTest('Get bill by restaurant and table', response.status === 200);
      logTest('Bill ID matches', bill._id === testBillId);
      logTest('Table number matches', bill.tableNumber === 5);

      console.log(`   Found bill: ${bill._id}`);
    } catch (error) {
      logTest('Get bill by restaurant and table', false, error.response?.data?.error || error.message);
    }

    // Test 6: Get all bills
    logSection('6. Get All Bills (GET /api/bills)');
    try {
      const response = await authRequest({
        method: 'get',
        url: `${BASE_URL}/api/bills?restaurant=${testRestaurantId}`
      });

      logTest('Get all bills', response.status === 200);
      logTest('Bills array returned', Array.isArray(response.data.bills));
      logTest('Bills contain our test bill', response.data.bills.some(b => b._id === testBillId));

      console.log(`   Found ${response.data.bills.length} bills`);
    } catch (error) {
      logTest('Get all bills', false, error.response?.data?.error || error.message);
    }

    // Test 7: Update bill
    logSection('7. Update Bill (PUT /api/bills/:id)');
    try {
      const updateData = {
        notes: 'Updated test bill',
        tax: 5.00
      };

      const response = await authRequest({
        method: 'put',
        url: `${BASE_URL}/api/bills/${testBillId}`,
        data: updateData
      });

      const bill = response.data.bill;

      logTest('Update bill', response.status === 200);
      logTest('Notes updated', bill.notes === 'Updated test bill');
      logTest('Tax updated', bill.tax === 5.00);
      logTest('Total recalculated', bill.totalAmount === 60.50);

      console.log(`   Updated total: $${bill.totalAmount.toFixed(2)}`);
    } catch (error) {
      logTest('Update bill', false, error.response?.data?.error || error.message);
    }

    // Test 8: Add payment to bill
    logSection('8. Add Payment to Bill (PUT /api/bills/:id)');
    try {
      const itemIds = (await axios.get(`${BASE_URL}/api/bills/${testBillId}`)).data.bill.items.map(item => item._id);

      const paymentData = {
        payment: {
          amount: 30.00,
          tip: 5.00,
          paymentMethod: 'apple_pay',
          transactionId: 'test_tx_001',
          paidAt: new Date(),
          itemIds: [itemIds[0]] // Pay for first item
        }
      };

      const response = await authRequest({
        method: 'put',
        url: `${BASE_URL}/api/bills/${testBillId}`,
        data: paymentData
      });

      const bill = response.data.bill;

      logTest('Add payment', response.status === 200);
      logTest('Payment recorded', bill.payments.length === 1);
      logTest('Bill status updated', bill.status === 'partially_paid');
      logTest('First item marked as paid', bill.items[0].isPaid === true);

      console.log(`   Payment amount: $${bill.payments[0].amount.toFixed(2)}`);
      console.log(`   Bill status: ${bill.status}`);
    } catch (error) {
      logTest('Add payment', false, error.response?.data?.error || error.message);
    }

    // Test 9: Test invalid bill ID
    logSection('9. Error Handling');
    try {
      await axios.get(`${BASE_URL}/api/bills/invalid_id`);
      logTest('Invalid bill ID rejected', false, 'Should have thrown error');
    } catch (error) {
      logTest('Invalid bill ID rejected', error.response?.status === 400);
    }

    // Test 10: Test non-existent bill
    try {
      await axios.get(`${BASE_URL}/api/bills/507f1f77bcf86cd799439011`);
      logTest('Non-existent bill returns 404', false, 'Should have thrown error');
    } catch (error) {
      logTest('Non-existent bill returns 404', error.response?.status === 404);
    }

    // Test 11: Delete bill
    logSection('10. Delete Bill (DELETE /api/bills/:id)');
    try {
      const response = await authRequest({
        method: 'delete',
        url: `${BASE_URL}/api/bills/${testBillId}`
      });

      logTest('Delete bill', response.status === 200);

      // Verify bill is cancelled (not deleted because it has payments)
      try {
        const checkResponse = await axios.get(`${BASE_URL}/api/bills/${testBillId}`);
        const isCancelled = checkResponse.data.bill && checkResponse.data.bill.status === 'cancelled';
        logTest('Bill marked as cancelled', isCancelled);
        if (!isCancelled) {
          console.log(`   Current status: ${checkResponse.data.bill ? checkResponse.data.bill.status : 'undefined'}`);
        }
      } catch (error) {
        logTest('Bill verification after delete', false, error.response?.data?.error || error.message);
      }
    } catch (error) {
      logTest('Delete bill', false, error.response?.data?.error || error.message);
    }

    // Final results
    logSection('Test Results Summary');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed} ✅`);
    console.log(`Failed: ${testResults.failed} ❌`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);

    if (testResults.failed === 0) {
      console.log('\n🎉 All tests passed! Bill API is working correctly.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please review the errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
};

// Run the tests
runTests();
