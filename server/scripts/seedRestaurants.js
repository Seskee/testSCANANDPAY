require('dotenv').config();
const mongoose = require('mongoose');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { connectDB } = require('../config/database');

const seedRestaurants = async () => {
  try {
    console.log('Starting restaurant seed script...');

    // Connect to database
    await connectDB();

    // Find the first user to be the owner (or create a test user if none exists)
    let user = await User.findOne();

    if (!user) {
      console.log('No users found, creating a test user...');
      user = new User({
        email: 'testowner@example.com',
        password: 'password123',
        restaurantName: 'Test Owner Restaurant',
        tableCount: 15
      });
      await user.save();
      console.log('Test user created:', user.email);
    } else {
      console.log('Using existing user:', user.email);
    }

    // Clear existing restaurants
    const deleteCount = await Restaurant.deleteMany({});
    console.log(`Deleted ${deleteCount.deletedCount} existing restaurants`);

    // Sample restaurants data
    const restaurants = [
      {
        name: 'Seaside Grill',
        description: 'Fresh seafood and stunning ocean views',
        address: {
          street: '123 Beach Road',
          city: 'Miami',
          state: 'FL',
          zipCode: '33139',
          country: 'USA'
        },
        phone: '+1-305-555-0101',
        email: 'info@seasidegrill.com',
        tableCount: 25,
        ownerId: user._id,
        isActive: true
      },
      {
        name: 'Mountain Peak Cafe',
        description: 'Cozy mountain retreat with farm-to-table cuisine',
        address: {
          street: '456 Summit Drive',
          city: 'Aspen',
          state: 'CO',
          zipCode: '81611',
          country: 'USA'
        },
        phone: '+1-970-555-0202',
        email: 'hello@mountainpeakcafe.com',
        tableCount: 15,
        ownerId: user._id,
        isActive: true
      },
      {
        name: 'Urban Bistro',
        description: 'Contemporary dining in the heart of downtown',
        address: {
          street: '789 Main Street',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          country: 'USA'
        },
        phone: '+1-212-555-0303',
        email: 'contact@urbanbistro.com',
        tableCount: 30,
        ownerId: user._id,
        isActive: true
      },
      {
        name: 'La Bella Italia',
        description: 'Authentic Italian cuisine with traditional recipes',
        address: {
          street: '321 Venice Boulevard',
          city: 'Los Angeles',
          state: 'CA',
          zipCode: '90291',
          country: 'USA'
        },
        phone: '+1-310-555-0404',
        email: 'info@labellaitalia.com',
        tableCount: 20,
        ownerId: user._id,
        isActive: true
      },
      {
        name: 'Sunset Beach Bar',
        description: 'Tropical drinks and light bites by the beach',
        address: {
          street: '555 Coastal Highway',
          city: 'Honolulu',
          state: 'HI',
          zipCode: '96815',
          country: 'USA'
        },
        phone: '+1-808-555-0505',
        email: 'hello@sunsetbeachbar.com',
        tableCount: 40,
        ownerId: user._id,
        isActive: true
      },
      {
        name: 'The Golden Spoon',
        description: 'Fine dining experience with seasonal menu',
        address: {
          street: '777 Luxury Lane',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          country: 'USA'
        },
        phone: '+1-415-555-0606',
        email: 'reservations@goldenspoon.com',
        tableCount: 18,
        ownerId: user._id,
        isActive: true
      }
    ];

    // Insert restaurants
    const createdRestaurants = await Restaurant.insertMany(restaurants);
    console.log(`✅ Successfully created ${createdRestaurants.length} restaurants:`);

    createdRestaurants.forEach((restaurant, index) => {
      console.log(`   ${index + 1}. ${restaurant.name} (ID: ${restaurant._id})`);
    });

    console.log('\n✅ Seed script completed successfully!');
    console.log(`\nTest user credentials:`);
    console.log(`Email: ${user.email}`);
    console.log(`Password: password123`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding restaurants:', error);
    console.error(error.stack);
    process.exit(1);
  }
};

// Run the seed script
seedRestaurants();
