require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Receipt = require('../models/Receipt');
const receiptService = require('../services/receiptService');

async function testReceiptGeneration() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.DATABASE_URL);
    console.log('Connected to database');

    // Find the most recent successful payment
    const payment = await Payment.findOne({ status: 'succeeded' })
      .sort({ createdAt: -1 })
      .populate('bill')
      .populate('restaurant');

    if (!payment) {
      console.log('No successful payment found. Please complete a payment first.');
      process.exit(0);
    }

    console.log('\n=== Payment Details ===');
    console.log(`Payment ID: ${payment._id}`);
    console.log(`Restaurant: ${payment.restaurant.name}`);
    console.log(`Table: ${payment.bill.tableNumber}`);
    console.log(`Amount: $${payment.amount.toFixed(2)}`);
    console.log(`Tip: $${payment.tip.toFixed(2)}`);
    console.log(`Total: $${payment.totalAmount.toFixed(2)}`);
    console.log(`Status: ${payment.status}`);

    // Check if receipt already exists
    const existingReceipt = await Receipt.findOne({ payment: payment._id });
    if (existingReceipt) {
      console.log('\n=== Existing Receipt Found ===');
      console.log(`Receipt Number: ${existingReceipt.receiptNumber}`);
      console.log(`Email Sent: ${existingReceipt.emailSent}`);
      console.log(`Created At: ${existingReceipt.createdAt}`);
    } else {
      console.log('\n=== Generating Receipt ===');
      const receipt = await receiptService.generateReceipt(
        payment._id,
        'test@example.com'
      );

      console.log('\n=== Receipt Generated Successfully ===');
      console.log(`Receipt Number: ${receipt.receiptNumber}`);
      console.log(`Receipt ID: ${receipt._id}`);
      console.log(`Total Amount: $${receipt.totalAmount.toFixed(2)}`);
      console.log(`Items: ${receipt.items.length}`);
      console.log(`Customer Email: ${receipt.customerEmail}`);
      console.log(`Email Sent: ${receipt.emailSent}`);
    }

    // Test sending email
    if (existingReceipt || true) {
      console.log('\n=== Testing Email Send ===');
      try {
        const receiptToSend = existingReceipt || await Receipt.findOne({ payment: payment._id });
        const result = await receiptService.sendReceiptEmail(receiptToSend._id);
        console.log('Email send result:', result);
      } catch (emailError) {
        console.log('Email send test (expected to fail without email config):', emailError.message);
      }
    }

    console.log('\n=== Test Complete ===');
    process.exit(0);
  } catch (error) {
    console.error('Error testing receipt generation:', error);
    process.exit(1);
  }
}

testReceiptGeneration();
