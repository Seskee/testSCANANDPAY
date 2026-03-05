require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const Bill = require('../models/Bill');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');

const seedBills = async () => {
  try {
    console.log('Starting bill seeding process...');

    // Connect to database
    await connectDB();

    // Find or create a test user
    let testUser = await User.findOne({ email: 'test@restaurant.com' });

    if (!testUser) {
      console.log('Creating test user...');
      testUser = await User.create({
        email: 'test@restaurant.com',
        password: 'Test123!',
        restaurantName: 'Sunset Beach Bar',
        tableCount: 20
      });
      console.log('Test user created successfully');
    } else {
      console.log('Test user already exists');
    }

    // Find or create a test restaurant
    let testRestaurant = await Restaurant.findOne({ ownerId: testUser._id });

    if (!testRestaurant) {
      console.log('Creating test restaurant...');
      testRestaurant = await Restaurant.create({
        ownerId: testUser._id,
        name: 'Sunset Beach Bar',
        address: {
          street: '123 Ocean Drive',
          city: 'Miami Beach',
          state: 'FL',
          zipCode: '33139',
          country: 'USA'
        },
        phone: '+1-305-555-0123',
        email: 'contact@sunsetbeachbar.com',
        tableCount: 20,
        description: 'A beautiful beachfront restaurant with stunning sunset views'
      });
      console.log('Test restaurant created successfully');
    } else {
      console.log('Test restaurant already exists');
    }

    // Clear existing test bills for this restaurant
    const deletedCount = await Bill.deleteMany({ restaurant: testRestaurant._id });
    console.log(`Deleted ${deletedCount.deletedCount} existing bills`);

    // Sample bills data
    const billsData = [
      {
        restaurant: testRestaurant._id,
        tableNumber: 5,
        items: [
          { name: 'Grilled Salmon', quantity: 1, price: 28.50 },
          { name: 'Caesar Salad', quantity: 2, price: 12.00 },
          { name: 'Craft Beer', quantity: 3, price: 6.50 },
          { name: 'Chocolate Cake', quantity: 1, price: 8.75 }
        ],
        tax: 5.25,
        notes: 'Customer requested gluten-free options'
      },
      {
        restaurant: testRestaurant._id,
        tableNumber: 8,
        items: [
          { name: 'Margherita Pizza', quantity: 2, price: 16.00 },
          { name: 'Carbonara Pasta', quantity: 1, price: 18.50 },
          { name: 'House Wine', quantity: 2, price: 9.00 }
        ],
        tax: 4.50,
        notes: 'Celebrating anniversary'
      },
      {
        restaurant: testRestaurant._id,
        tableNumber: 3,
        items: [
          { name: 'Greek Salad', quantity: 1, price: 11.50 },
          { name: 'Grilled Octopus', quantity: 1, price: 24.00 },
          { name: 'Sparkling Water', quantity: 2, price: 3.50 }
        ],
        tax: 3.25
      },
      {
        restaurant: testRestaurant._id,
        tableNumber: 12,
        items: [
          { name: 'Fish Tacos', quantity: 3, price: 14.00 },
          { name: 'Guacamole & Chips', quantity: 1, price: 8.00 },
          { name: 'Margarita', quantity: 3, price: 10.00 }
        ],
        tax: 5.00,
        status: 'partially_paid',
        payments: [
          {
            amount: 28.00,
            tip: 5.00,
            paymentMethod: 'apple_pay',
            transactionId: 'tx_test_001',
            paidAt: new Date(),
            itemIds: []
          }
        ]
      },
      {
        restaurant: testRestaurant._id,
        tableNumber: 15,
        items: [
          { name: 'Ribeye Steak', quantity: 1, price: 45.00, isPaid: true, paidBy: 'tx_test_002', paidAt: new Date() },
          { name: 'Mashed Potatoes', quantity: 1, price: 7.50, isPaid: true, paidBy: 'tx_test_002', paidAt: new Date() },
          { name: 'Red Wine', quantity: 1, price: 12.00, isPaid: true, paidBy: 'tx_test_002', paidAt: new Date() }
        ],
        tax: 6.45,
        status: 'fully_paid',
        payments: [
          {
            amount: 64.50,
            tip: 10.00,
            paymentMethod: 'google_pay',
            transactionId: 'tx_test_002',
            paidAt: new Date(),
            itemIds: []
          }
        ]
      }
    ];

    // Insert bills (using create to trigger pre-save hooks)
    console.log('Creating sample bills...');
    const createdBills = await Promise.all(
      billsData.map(billData => Bill.create(billData))
    );

    console.log(`Successfully created ${createdBills.length} bills:`);
    createdBills.forEach((bill, index) => {
      console.log(`  ${index + 1}. Bill for Table ${bill.tableNumber} - Total: $${bill.totalAmount.toFixed(2)} - Status: ${bill.status}`);
    });

    console.log('\n✅ Bill seeding completed successfully!');
    console.log(`Restaurant ID: ${testRestaurant._id}`);
    console.log(`User email: ${testUser.email}`);
    console.log(`Test URL: /pay?restaurant=${testRestaurant._id}&table=5`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding bills:', error);
    process.exit(1);
  }
};

// Run the seed function
seedBills();
