require('dotenv').config();
const { connectDB } = require('../config/database');
const Bill = require('../models/Bill');
const Restaurant = require('../models/Restaurant');

async function verifyBill() {
  try {
    await connectDB();
    console.log('Connected to MongoDB\n');

    const bills = await Bill.find({ tableNumber: 1 }).populate('restaurant');
    console.log(`Found ${bills.length} bill(s) for table 1\n`);

    bills.forEach(bill => {
      console.log('Bill ID:', bill._id.toString());
      console.log('Restaurant:', bill.restaurant.name);
      console.log('Restaurant ID:', bill.restaurant._id.toString());
      console.log('Table:', bill.tableNumber);
      console.log('Status:', bill.status);
      console.log('Total:', bill.totalAmount);
      console.log('Items:', bill.items.length);
      console.log('---\n');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

verifyBill();
