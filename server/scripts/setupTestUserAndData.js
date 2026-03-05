const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');

const TEST_EMAIL = 'test@restaurant.com';
const TEST_PASSWORD = 'test1234';
const TEST_RESTAURANT_NAME = 'Test Restaurant & Bar';
const TEST_TABLE_COUNT = 20;

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const setupTestUserAndData = async () => {
  try {
    await connectDB();

    console.log('=== Setting up Test User and Data ===\n');

    // Check if user already exists
    let user = await User.findOne({ email: TEST_EMAIL });
    let restaurant;

    if (user) {
      console.log(`User already exists: ${TEST_EMAIL}`);
      console.log(`Resetting password to: ${TEST_PASSWORD}`);

      // Reset password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(TEST_PASSWORD, salt);
      await user.save();

      console.log('Password reset successfully!\n');

      // Get restaurant
      restaurant = await Restaurant.findOne({ ownerId: user._id });

      // Update user with restaurant reference if found
      if (restaurant && user.restaurant?.toString() !== restaurant._id.toString()) {
        user.restaurant = restaurant._id;
        await user.save();
        console.log('User-restaurant link updated\n');
      }
    } else {
      console.log(`Creating new user: ${TEST_EMAIL}`);

      // Create user
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, salt);

      user = await User.create({
        email: TEST_EMAIL,
        password: hashedPassword
      });

      console.log('User created successfully!\n');

      // Create restaurant
      console.log(`Creating restaurant: ${TEST_RESTAURANT_NAME}`);
      restaurant = await Restaurant.create({
        name: TEST_RESTAURANT_NAME,
        tableCount: TEST_TABLE_COUNT,
        ownerId: user._id,
        isActive: true
      });

      // Update user with restaurant reference
      user.restaurant = restaurant._id;
      await user.save();

      console.log('Restaurant created successfully!\n');
    }

    if (!restaurant) {
      console.log('Creating restaurant for existing user...');
      restaurant = await Restaurant.create({
        name: TEST_RESTAURANT_NAME,
        tableCount: TEST_TABLE_COUNT,
        ownerId: user._id,
        isActive: true
      });

      user.restaurant = restaurant._id;
      await user.save();

      console.log('Restaurant created successfully!\n');
    }

    // Clear existing data for this restaurant
    console.log('Clearing existing bills and payments...');
    await Bill.deleteMany({ restaurant: restaurant._id });
    await Payment.deleteMany({ restaurant: restaurant._id });
    console.log('Existing data cleared!\n');

    // Generate test data
    console.log('Generating test transaction data...\n');

    const menuItems = [
      { name: 'Caesar Salad', price: 12.99 },
      { name: 'Margherita Pizza', price: 18.50 },
      { name: 'Spaghetti Carbonara', price: 16.99 },
      { name: 'Grilled Salmon', price: 24.99 },
      { name: 'Beef Burger', price: 14.50 },
      { name: 'Fish and Chips', price: 15.99 },
      { name: 'Chicken Wings', price: 11.99 },
      { name: 'French Fries', price: 5.99 },
      { name: 'Onion Rings', price: 6.50 },
      { name: 'Coca Cola', price: 3.50 },
      { name: 'Orange Juice', price: 4.50 },
      { name: 'Coffee', price: 3.00 },
      { name: 'Beer', price: 6.00 },
      { name: 'Wine Glass', price: 8.50 },
      { name: 'Chocolate Cake', price: 7.50 }
    ];

    const paymentMethods = ['apple_pay', 'google_pay', 'paypal', 'card'];

    const now = new Date();
    const daysToGenerate = 60;
    let totalBillsCreated = 0;
    let totalPaymentsCreated = 0;

    for (let daysAgo = daysToGenerate; daysAgo >= 0; daysAgo--) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isRecent = daysAgo < 7;
      const baseTransactions = isWeekend ? 8 : 5;
      const recentBonus = isRecent ? 3 : 0;
      const transactionsForDay = Math.floor(Math.random() * 5) + baseTransactions + recentBonus;

      for (let i = 0; i < transactionsForDay; i++) {
        const tableNumber = Math.floor(Math.random() * restaurant.tableCount) + 1;
        const itemCount = Math.floor(Math.random() * 5) + 1;
        const billItems = [];
        let billTotal = 0;

        for (let j = 0; j < itemCount; j++) {
          const item = menuItems[Math.floor(Math.random() * menuItems.length)];
          const quantity = Math.floor(Math.random() * 2) + 1;
          const itemTotal = item.price * quantity;
          billTotal += itemTotal;

          billItems.push({
            name: item.name,
            quantity: quantity,
            price: item.price,
            isPaid: true
          });
        }

        const tax = billTotal * 0.1;
        billTotal += tax;

        const billDate = new Date(date);
        billDate.setHours(Math.floor(Math.random() * 12) + 10);
        billDate.setMinutes(Math.floor(Math.random() * 60));

        const bill = await Bill.create({
          restaurant: restaurant._id,
          tableNumber: tableNumber,
          items: billItems,
          subtotal: billTotal - tax,
          tax: tax,
          totalAmount: billTotal,
          status: 'fully_paid',
          createdAt: billDate,
          updatedAt: billDate
        });

        totalBillsCreated++;

        const tipPercentages = [0, 0.05, 0.10, 0.15, 0.18, 0.20];
        const tipPercentage = tipPercentages[Math.floor(Math.random() * tipPercentages.length)];
        const tipAmount = billTotal * tipPercentage;
        const totalAmount = billTotal + tipAmount;

        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

        await Payment.create({
          bill: bill._id,
          restaurant: restaurant._id,
          amount: billTotal,
          tip: tipAmount,
          totalAmount: totalAmount,
          currency: 'usd',
          paymentMethod: paymentMethod,
          status: 'succeeded',
          items: billItems,
          stripePaymentIntentId: `pi_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: billDate,
          updatedAt: billDate
        });

        totalPaymentsCreated++;
      }

      if (daysAgo % 10 === 0 || daysAgo < 7) {
        console.log(`Generated ${transactionsForDay} transactions for ${date.toDateString()}`);
      }
    }

    const totalRevenue = await Payment.aggregate([
      { $match: { restaurant: restaurant._id, status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' }, tips: { $sum: '$tip' } } }
    ]);

    console.log('\n=== Setup Complete! ===\n');
    console.log('LOGIN CREDENTIALS:');
    console.log(`Email: ${TEST_EMAIL}`);
    console.log(`Password: ${TEST_PASSWORD}`);
    console.log('');
    console.log('RESTAURANT DETAILS:');
    console.log(`Name: ${restaurant.name}`);
    console.log(`Tables: ${restaurant.tableCount}`);
    console.log(`ID: ${restaurant._id}`);
    console.log('');
    console.log('TEST DATA GENERATED:');
    console.log(`Total Bills: ${totalBillsCreated}`);
    console.log(`Total Payments: ${totalPaymentsCreated}`);

    if (totalRevenue.length > 0) {
      console.log(`Total Revenue: $${totalRevenue[0].total.toFixed(2)}`);
      console.log(`Total Tips: $${totalRevenue[0].tips.toFixed(2)}`);
      console.log(`Grand Total: $${(totalRevenue[0].total + totalRevenue[0].tips).toFixed(2)}`);
    }

    console.log('\nYou can now log in to the dashboard at:');
    console.log('https://preview-17glr9fr.ui.pythagora.ai/restaurant/login');

  } catch (error) {
    console.error('Error setting up test user and data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

setupTestUserAndData();
