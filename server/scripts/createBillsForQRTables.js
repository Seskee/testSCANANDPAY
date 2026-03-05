require('dotenv').config();
const { connectDB } = require('../config/database');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const Bill = require('../models/Bill');

const createBillsForQRTables = async () => {
  console.log('\n========================================');
  console.log('Creating Test Bills for QR Code Tables');
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
    console.log(`Creating bills for ${restaurant.tableCount} tables\n`);

    // Sample menu items
    const sampleItems = [
      { name: 'Grilled Salmon', price: 24.99, category: 'Main Course' },
      { name: 'Caesar Salad', price: 12.50, category: 'Appetizer' },
      { name: 'Margherita Pizza', price: 16.99, category: 'Main Course' },
      { name: 'Chicken Alfredo', price: 18.50, category: 'Main Course' },
      { name: 'French Fries', price: 5.99, category: 'Side Dish' },
      { name: 'Onion Rings', price: 6.99, category: 'Appetizer' },
      { name: 'Coca Cola', price: 3.50, category: 'Beverage' },
      { name: 'Lemonade', price: 3.99, category: 'Beverage' },
      { name: 'Chocolate Cake', price: 7.99, category: 'Dessert' },
      { name: 'Ice Cream', price: 5.50, category: 'Dessert' },
      { name: 'Beef Burger', price: 14.99, category: 'Main Course' },
      { name: 'Vegetable Soup', price: 8.50, category: 'Appetizer' },
      { name: 'Tiramisu', price: 8.99, category: 'Dessert' },
      { name: 'Espresso', price: 3.50, category: 'Beverage' },
      { name: 'Garlic Bread', price: 4.99, category: 'Side Dish' }
    ];

    let createdCount = 0;
    let skippedCount = 0;

    // Create bills for each table
    for (let tableNum = 1; tableNum <= restaurant.tableCount; tableNum++) {
      try {
        // Check if bill already exists for this table
        const existingBill = await Bill.findOne({
          restaurant: restaurant._id,
          tableNumber: tableNum,
          status: { $in: ['active', 'partially_paid'] }
        });

        if (existingBill) {
          console.log(`⊘ Table ${tableNum}: Bill already exists (ID: ${existingBill._id})`);
          skippedCount++;
          continue;
        }

        // Randomly select 2-5 items for this table
        const numItems = Math.floor(Math.random() * 4) + 2; // 2-5 items
        const selectedItems = [];
        const usedIndexes = new Set();

        while (selectedItems.length < numItems) {
          const randomIndex = Math.floor(Math.random() * sampleItems.length);
          if (!usedIndexes.has(randomIndex)) {
            usedIndexes.add(randomIndex);
            const item = sampleItems[randomIndex];
            selectedItems.push({
              name: item.name,
              price: item.price,
              quantity: Math.floor(Math.random() * 2) + 1, // 1-2 quantity
            });
          }
        }

        // Calculate totals
        const subtotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.08; // 8% tax
        const totalAmount = subtotal + tax;

        // Create the bill
        const bill = new Bill({
          restaurant: restaurant._id,
          tableNumber: tableNum,
          items: selectedItems,
          subtotal: subtotal,
          tax: tax,
          totalAmount: totalAmount,
          status: 'active',
          createdAt: new Date()
        });

        await bill.save();

        const total = bill.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        console.log(`✓ Table ${tableNum}: Bill created (ID: ${bill._id})`);
        console.log(`  Items: ${bill.items.length}, Total: $${total.toFixed(2)}`);
        createdCount++;

      } catch (error) {
        console.error(`✗ Table ${tableNum}: Failed - ${error.message}`);
      }
    }

    console.log('\n========================================');
    console.log('Bill Creation Complete!');
    console.log('========================================');
    console.log(`Created: ${createdCount} bills`);
    console.log(`Skipped: ${skippedCount} bills (already exist)`);
    console.log(`Total Tables: ${restaurant.tableCount}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Script failed with error:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
};

// Run script
createBillsForQRTables();
