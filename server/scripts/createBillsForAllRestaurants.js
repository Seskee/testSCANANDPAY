require('dotenv').config();
const { connectDB } = require('../config/database');
const Restaurant = require('../models/Restaurant');
const Bill = require('../models/Bill');

const createBillsForAllRestaurants = async () => {
  console.log('\n========================================');
  console.log('Creating Test Bills for All Restaurants');
  console.log('========================================\n');

  try {
    // Connect to database
    await connectDB();
    console.log('✓ Database connected\n');

    // Find all restaurants
    const restaurants = await Restaurant.find({ isActive: true });
    if (restaurants.length === 0) {
      console.error('No active restaurants found.');
      process.exit(1);
    }

    console.log(`Found ${restaurants.length} active restaurants\n`);

    // Sample menu items
    const sampleItems = [
      { name: 'Grilled Salmon', price: 24.99 },
      { name: 'Caesar Salad', price: 12.50 },
      { name: 'Margherita Pizza', price: 16.99 },
      { name: 'Chicken Alfredo', price: 18.50 },
      { name: 'French Fries', price: 5.99 },
      { name: 'Onion Rings', price: 6.99 },
      { name: 'Coca Cola', price: 3.50 },
      { name: 'Lemonade', price: 3.99 },
      { name: 'Chocolate Cake', price: 7.99 },
      { name: 'Ice Cream', price: 5.50 },
      { name: 'Beef Burger', price: 14.99 },
      { name: 'Vegetable Soup', price: 8.50 },
      { name: 'Tiramisu', price: 8.99 },
      { name: 'Espresso', price: 3.50 },
      { name: 'Garlic Bread', price: 4.99 }
    ];

    let totalCreated = 0;
    let totalSkipped = 0;

    for (const restaurant of restaurants) {
      console.log(`\n--- Restaurant: ${restaurant.name} (${restaurant._id}) ---`);
      console.log(`Creating bills for ${restaurant.tableCount} tables`);

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
            console.log(`  ⊘ Table ${tableNum}: Bill already exists (ID: ${existingBill._id})`);
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

          console.log(`  ✓ Table ${tableNum}: Bill created (ID: ${bill._id})`);
          console.log(`    Items: ${bill.items.length}, Total: $${totalAmount.toFixed(2)}`);
          createdCount++;

        } catch (error) {
          console.error(`  ✗ Table ${tableNum}: Failed - ${error.message}`);
        }
      }

      console.log(`Restaurant summary: ${createdCount} created, ${skippedCount} skipped`);
      totalCreated += createdCount;
      totalSkipped += skippedCount;
    }

    console.log('\n========================================');
    console.log('Bill Creation Complete!');
    console.log('========================================');
    console.log(`Restaurants processed: ${restaurants.length}`);
    console.log(`Total bills created: ${totalCreated}`);
    console.log(`Total bills skipped: ${totalSkipped}`);
    console.log('========================================\n');

  } catch (error) {
    console.error('Script failed with error:', error);
  } finally {
    // Close database connection
    process.exit(0);
  }
};

// Run script
createBillsForAllRestaurants();
