require('dotenv').config();
const { connectDB } = require('../config/database');
const Restaurant = require('../models/Restaurant');

const enableTestPayments = async () => {
  console.log('\n========================================');
  console.log('Enabling Test Payment Processing');
  console.log('========================================\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✓ Database connected\n');

    // Find all active restaurants
    const restaurants = await Restaurant.find({ isActive: true });
    if (restaurants.length === 0) {
      console.error('No active restaurants found.');
      process.exit(1);
    }

    console.log(`Found ${restaurants.length} active restaurants\n`);

    let updatedCount = 0;

    for (const restaurant of restaurants) {
      // Check if already has test Stripe setup
      if (restaurant.stripeAccountId && restaurant.stripeChargesEnabled) {
        console.log(`  ⊘ ${restaurant.name}: Already has payment processing enabled`);
        continue;
      }

      // Enable test Stripe Connect settings
      restaurant.stripeAccountId = `acct_test_${restaurant._id}`;
      restaurant.stripeAccountStatus = 'enabled';
      restaurant.stripeOnboardingComplete = true;
      restaurant.stripeChargesEnabled = true;
      restaurant.stripePayoutsEnabled = true;
      restaurant.stripeDetailsSubmitted = true;

      await restaurant.save();

      console.log(`  ✓ ${restaurant.name}: Test payment processing enabled`);
      console.log(`    Stripe Account ID: ${restaurant.stripeAccountId}`);
      updatedCount++;
    }

    console.log('\n========================================');
    console.log('Test Payment Setup Complete!');
    console.log('========================================');
    console.log(`Total restaurants: ${restaurants.length}`);
    console.log(`Updated: ${updatedCount}`);
    console.log(`Already enabled: ${restaurants.length - updatedCount}`);
    console.log('========================================\n');

    console.log('NOTE: These are TEST accounts for development only.');
    console.log('Real Stripe Connect setup is required for production.\n');

  } catch (error) {
    console.error('Script failed with error:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
};

// Run script
enableTestPayments();
