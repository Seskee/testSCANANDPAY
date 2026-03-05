require('dotenv').config();
const { connectDB } = require('../config/database');
const Bill = require('../models/Bill');
const Restaurant = require('../models/Restaurant');

async function createTestBill() {
  try {
    console.log('\n========================================');
    console.log('Creating Test Bill');
    console.log('========================================\n');

    // Connect to database
    await connectDB();
    console.log('✅ Database connected\n');

    // Find the most recent restaurant
    const restaurant = await Restaurant.findOne().sort({ createdAt: -1 });

    if (!restaurant) {
      console.log('❌ No restaurant found. Please register a restaurant first.');
      process.exit(1);
    }

    console.log(`Found restaurant: ${restaurant.name} (ID: ${restaurant._id})\n`);

    // Create a test bill for table 1
    const bill = new Bill({
      restaurant: restaurant._id,
      tableNumber: 1,
      items: [
        {
          name: 'Grilled Salmon',
          price: 24.99,
          quantity: 1,
          isPaid: false
        },
        {
          name: 'Caesar Salad',
          price: 12.99,
          quantity: 1,
          isPaid: false
        },
        {
          name: 'Spaghetti Carbonara',
          price: 18.99,
          quantity: 1,
          isPaid: false
        },
        {
          name: 'Tiramisu',
          price: 8.99,
          quantity: 1,
          isPaid: false
        },
        {
          name: 'Red Wine',
          price: 15.00,
          quantity: 2,
          isPaid: false
        }
      ],
      status: 'active',
      payments: []
    });

    await bill.save();

    console.log('✅ Test bill created successfully!\n');
    console.log('Bill Details:');
    console.log(`  Bill ID: ${bill._id}`);
    console.log(`  Restaurant: ${restaurant.name}`);
    console.log(`  Table Number: ${bill.tableNumber}`);
    console.log(`  Total Items: ${bill.items.length}`);
    console.log(`  Total Amount: $${bill.totalAmount.toFixed(2)}`);
    console.log(`  Status: ${bill.status}\n`);

    console.log('Items:');
    bill.items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.name} - $${item.price.toFixed(2)} x ${item.quantity}`);
    });

    console.log('\n========================================');
    console.log('✅ TEST BILL CREATED SUCCESSFULLY');
    console.log('========================================\n');
    console.log(`You can now test payments at:`);
    console.log(`https://preview-10skelzj.ui.pythagora.ai/pay?restaurant=${restaurant._id}&table=1\n`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error creating test bill:');
    console.error(`   ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

createTestBill();
