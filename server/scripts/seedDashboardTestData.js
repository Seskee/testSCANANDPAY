const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const seedDashboardData = async () => {
  try {
    await connectDB();

    console.log('Starting dashboard data seeding...');

    // Find the most recent user and restaurant
    const user = await User.findOne().sort({ createdAt: -1 });
    if (!user) {
      console.error('No user found. Please create a user first.');
      process.exit(1);
    }

    const restaurant = await Restaurant.findOne({ ownerId: user._id }).sort({ createdAt: -1 });
    if (!restaurant) {
      console.error('No restaurant found for user. Please create a restaurant first.');
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`Found restaurant: ${restaurant.name}`);

    // Clear existing bills and payments for this restaurant
    await Bill.deleteMany({ restaurant: restaurant._id });
    await Payment.deleteMany({ restaurant: restaurant._id });
    console.log('Cleared existing bills and payments');

    // Menu items to use for bills
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

    // Generate data for the past 60 days
    const now = new Date();
    const daysToGenerate = 60;
    let totalBillsCreated = 0;
    let totalPaymentsCreated = 0;

    for (let daysAgo = daysToGenerate; daysAgo >= 0; daysAgo--) {
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);

      // More transactions on recent days and weekends
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const isRecent = daysAgo < 7;
      const baseTransactions = isWeekend ? 8 : 5;
      const recentBonus = isRecent ? 3 : 0;
      const transactionsForDay = Math.floor(Math.random() * 5) + baseTransactions + recentBonus;

      for (let i = 0; i < transactionsForDay; i++) {
        // Random table number
        const tableNumber = Math.floor(Math.random() * restaurant.tableCount) + 1;

        // Random number of items (1-5)
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
            total: itemTotal,
            paid: true
          });
        }

        // Add tax (10%)
        const tax = billTotal * 0.1;
        billTotal += tax;

        // Create bill with timestamp from that day
        const billDate = new Date(date);
        billDate.setHours(Math.floor(Math.random() * 12) + 10); // Between 10 AM and 10 PM
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

        // Create payment for this bill
        const tipPercentages = [0, 0.05, 0.10, 0.15, 0.18, 0.20];
        const tipPercentage = tipPercentages[Math.floor(Math.random() * tipPercentages.length)];
        const tipAmount = billTotal * tipPercentage;
        const totalAmount = billTotal + tipAmount;

        const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

        const payment = await Payment.create({
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

    console.log('\n=== Seeding Complete ===');
    console.log(`Total Bills Created: ${totalBillsCreated}`);
    console.log(`Total Payments Created: ${totalPaymentsCreated}`);
    console.log(`Restaurant: ${restaurant.name} (ID: ${restaurant._id})`);
    console.log(`User Email: ${user.email}`);

    // Calculate some stats
    const totalRevenue = await Payment.aggregate([
      { $match: { restaurant: restaurant._id, status: 'succeeded' } },
      { $group: { _id: null, total: { $sum: '$amount' }, tips: { $sum: '$tip' } } }
    ]);

    if (totalRevenue.length > 0) {
      console.log(`\nTotal Revenue: $${totalRevenue[0].total.toFixed(2)}`);
      console.log(`Total Tips: $${totalRevenue[0].tips.toFixed(2)}`);
      console.log(`Grand Total: $${(totalRevenue[0].total + totalRevenue[0].tips).toFixed(2)}`);
    }

    console.log('\nYou can now log in with:');
    console.log(`Email: ${user.email}`);
    console.log('Password: (the password you used during registration)');

  } catch (error) {
    console.error('Error seeding dashboard data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

seedDashboardData();
