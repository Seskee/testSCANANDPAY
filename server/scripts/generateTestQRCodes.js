require('dotenv').config();
const { connectDB } = require('../config/database');
const qrCodeService = require('../services/qrCodeService');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

const generateTestQRCodes = async () => {
  console.log('\n========================================');
  console.log('Generating Test QR Codes');
  console.log('========================================\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✓ Database connected\n');

    // Find the most recent user
    const user = await User.findOne().sort({ createdAt: -1 });
    if (!user) {
      console.error('No users found. Please create a user first.');
      process.exit(1);
    }

    console.log(`Using user: ${user.email} (${user._id})`);

    // Find the most recent restaurant for this user
    const restaurant = await Restaurant.findOne({ ownerId: user._id }).sort({ createdAt: -1 });
    if (!restaurant) {
      console.error('No restaurants found for this user. Please create a restaurant first.');
      process.exit(1);
    }

    console.log(`Using restaurant: ${restaurant.name} (${restaurant._id})`);
    console.log(`Table count: ${restaurant.tableCount}\n`);

    console.log('Generating QR codes for all tables...\n');

    // Generate QR codes for all tables
    for (let i = 1; i <= restaurant.tableCount; i++) {
      try {
        const qrCode = await qrCodeService.generateQRCode(
          restaurant._id.toString(),
          i,
          user._id.toString()
        );

        console.log(`✓ Table ${i}: QR Code generated`);
        console.log(`  ID: ${qrCode._id}`);
        console.log(`  URL: ${qrCode.paymentUrl}`);
      } catch (error) {
        console.error(`✗ Table ${i}: Failed - ${error.message}`);
      }
    }

    console.log('\n========================================');
    console.log('QR Code Generation Complete!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Script failed with error:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
};

// Run script
generateTestQRCodes();
