require('dotenv').config();
const { connectDB } = require('../config/database');
const qrCodeService = require('../services/qrCodeService');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const QRCode = require('../models/QRCode');

const testQRCodeAPI = async () => {
  console.log('\n========================================');
  console.log('Starting QR Code API Test Suite');
  console.log('========================================\n');

  let testResults = {
    passed: 0,
    failed: 0,
    total: 0
  };

  try {
    // Connect to database
    await connectDB();
    console.log('✓ Database connected\n');

    // Clean up test data
    console.log('Cleaning up existing test data...');
    await QRCode.deleteMany({ restaurant: { $exists: true } });
    console.log('✓ Test data cleaned\n');

    // Find or create test user
    let testUser = await User.findOne({ email: 'test@qrcode.com' });
    if (!testUser) {
      testUser = await User.create({
        email: 'test@qrcode.com',
        password: 'testpassword123',
        restaurantName: 'QR Code Test Restaurant',
        tableCount: 5
      });
      console.log('✓ Test user created');
    } else {
      console.log('✓ Test user found');
    }

    // Find or create test restaurant
    let testRestaurant = await Restaurant.findOne({ ownerId: testUser._id });
    if (!testRestaurant) {
      testRestaurant = await Restaurant.create({
        name: 'QR Code Test Restaurant',
        ownerId: testUser._id,
        tableCount: 5,
        email: 'test@qrcode.com',
        phone: '123-456-7890'
      });
      console.log('✓ Test restaurant created');
    } else {
      console.log('✓ Test restaurant found');
    }
    console.log(`Restaurant ID: ${testRestaurant._id}`);
    console.log(`Table Count: ${testRestaurant.tableCount}\n`);

    // Test 1: Generate QR code for table 1
    console.log('Test 1: Generate QR code for table 1');
    testResults.total++;
    try {
      const qrCode1 = await qrCodeService.generateQRCode(
        testRestaurant._id.toString(),
        1,
        testUser._id.toString()
      );

      if (qrCode1 && qrCode1.tableNumber === 1 && qrCode1.qrCodeDataUrl) {
        console.log('✓ Test 1 PASSED');
        console.log(`  QR Code ID: ${qrCode1._id}`);
        console.log(`  Table Number: ${qrCode1.tableNumber}`);
        console.log(`  Payment URL: ${qrCode1.paymentUrl}`);
        console.log(`  Is Active: ${qrCode1.isActive}\n`);
        testResults.passed++;
      } else {
        console.log('✗ Test 1 FAILED: Invalid QR code data\n');
        testResults.failed++;
      }
    } catch (error) {
      console.log(`✗ Test 1 FAILED: ${error.message}\n`);
      testResults.failed++;
    }

    // Test 2: Generate QR code for table 2
    console.log('Test 2: Generate QR code for table 2');
    testResults.total++;
    try {
      const qrCode2 = await qrCodeService.generateQRCode(
        testRestaurant._id.toString(),
        2,
        testUser._id.toString()
      );

      if (qrCode2 && qrCode2.tableNumber === 2) {
        console.log('✓ Test 2 PASSED');
        console.log(`  QR Code ID: ${qrCode2._id}`);
        console.log(`  Table Number: ${qrCode2.tableNumber}\n`);
        testResults.passed++;
      } else {
        console.log('✗ Test 2 FAILED: Invalid QR code data\n');
        testResults.failed++;
      }
    } catch (error) {
      console.log(`✗ Test 2 FAILED: ${error.message}\n`);
      testResults.failed++;
    }

    // Test 3: Try to generate duplicate QR code (should return existing)
    console.log('Test 3: Generate duplicate QR code for table 1');
    testResults.total++;
    try {
      const qrCode1Duplicate = await qrCodeService.generateQRCode(
        testRestaurant._id.toString(),
        1,
        testUser._id.toString()
      );

      if (qrCode1Duplicate && qrCode1Duplicate.tableNumber === 1) {
        console.log('✓ Test 3 PASSED: Returned existing QR code\n');
        testResults.passed++;
      } else {
        console.log('✗ Test 3 FAILED: Did not return existing QR code\n');
        testResults.failed++;
      }
    } catch (error) {
      console.log(`✗ Test 3 FAILED: ${error.message}\n`);
      testResults.failed++;
    }

    // Test 4: Get all QR codes for restaurant
    console.log('Test 4: Get all QR codes for restaurant');
    testResults.total++;
    try {
      const qrCodes = await qrCodeService.getRestaurantQRCodes(
        testRestaurant._id.toString(),
        testUser._id.toString()
      );

      if (qrCodes && qrCodes.length === 2) {
        console.log('✓ Test 4 PASSED');
        console.log(`  Total QR codes: ${qrCodes.length}`);
        qrCodes.forEach(qr => {
          console.log(`  - Table ${qr.tableNumber}: ${qr.isActive ? 'Active' : 'Inactive'}`);
        });
        console.log('');
        testResults.passed++;
      } else {
        console.log(`✗ Test 4 FAILED: Expected 2 QR codes, got ${qrCodes ? qrCodes.length : 0}\n`);
        testResults.failed++;
      }
    } catch (error) {
      console.log(`✗ Test 4 FAILED: ${error.message}\n`);
      testResults.failed++;
    }

    // Test 5: Delete QR code for table 1
    console.log('Test 5: Delete QR code for table 1');
    testResults.total++;
    try {
      await qrCodeService.deleteQRCodeByTable(
        testRestaurant._id.toString(),
        1,
        testUser._id.toString()
      );

      const qrCodesAfterDelete = await qrCodeService.getRestaurantQRCodes(
        testRestaurant._id.toString(),
        testUser._id.toString()
      );

      if (qrCodesAfterDelete.length === 1 && qrCodesAfterDelete[0].tableNumber === 2) {
        console.log('✓ Test 5 PASSED: QR code deleted (marked inactive)\n');
        testResults.passed++;
      } else {
        console.log(`✗ Test 5 FAILED: Expected 1 active QR code, got ${qrCodesAfterDelete.length}\n`);
        testResults.failed++;
      }
    } catch (error) {
      console.log(`✗ Test 5 FAILED: ${error.message}\n`);
      testResults.failed++;
    }

    // Test 6: Regenerate QR code for table 1
    console.log('Test 6: Regenerate QR code for table 1');
    testResults.total++;
    try {
      const regeneratedQR = await qrCodeService.regenerateQRCode(
        testRestaurant._id.toString(),
        1,
        testUser._id.toString()
      );

      if (regeneratedQR && regeneratedQR.tableNumber === 1 && regeneratedQR.isActive) {
        console.log('✓ Test 6 PASSED');
        console.log(`  New QR Code ID: ${regeneratedQR._id}`);
        console.log(`  Is Active: ${regeneratedQR.isActive}\n`);
        testResults.passed++;
      } else {
        console.log('✗ Test 6 FAILED: QR code not regenerated properly\n');
        testResults.failed++;
      }
    } catch (error) {
      console.log(`✗ Test 6 FAILED: ${error.message}\n`);
      testResults.failed++;
    }

    // Test 7: Try to generate QR code for invalid table number
    console.log('Test 7: Generate QR code for invalid table number (table 10)');
    testResults.total++;
    try {
      await qrCodeService.generateQRCode(
        testRestaurant._id.toString(),
        10, // Invalid - restaurant only has 5 tables
        testUser._id.toString()
      );
      console.log('✗ Test 7 FAILED: Should have thrown error for invalid table\n');
      testResults.failed++;
    } catch (error) {
      if (error.message.includes('Invalid table number')) {
        console.log('✓ Test 7 PASSED: Correctly rejected invalid table number\n');
        testResults.passed++;
      } else {
        console.log(`✗ Test 7 FAILED: Wrong error message: ${error.message}\n`);
        testResults.failed++;
      }
    }

    // Test 8: Try to generate QR code with unauthorized user
    console.log('Test 8: Generate QR code with unauthorized user');
    testResults.total++;
    try {
      const fakeUserId = '507f1f77bcf86cd799439011'; // Valid ObjectId but doesn't exist
      await qrCodeService.generateQRCode(
        testRestaurant._id.toString(),
        3,
        fakeUserId
      );
      console.log('✗ Test 8 FAILED: Should have thrown authorization error\n');
      testResults.failed++;
    } catch (error) {
      if (error.message.includes('Unauthorized')) {
        console.log('✓ Test 8 PASSED: Correctly rejected unauthorized user\n');
        testResults.passed++;
      } else {
        console.log(`✗ Test 8 FAILED: Wrong error message: ${error.message}\n`);
        testResults.failed++;
      }
    }

    // Print summary
    console.log('========================================');
    console.log('Test Summary');
    console.log('========================================');
    console.log(`Total Tests: ${testResults.total}`);
    console.log(`Passed: ${testResults.passed}`);
    console.log(`Failed: ${testResults.failed}`);
    console.log(`Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Test suite failed with error:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
};

// Run tests
testQRCodeAPI();
