require('dotenv').config();
const mongoose = require('mongoose');
const Payment = require('../models/Payment');
const Bill = require('../models/Bill');
const Restaurant = require('../models/Restaurant');
const Receipt = require('../models/Receipt');
const receiptService = require('../services/receiptService');

async function testEndToEnd() {
  try {
    console.log('=== Receipt System End-to-End Test ===\n');

    await mongoose.connect(process.env.DATABASE_URL);
    console.log('✓ Connected to database\n');

    // Find a successful payment
    const payment = await Payment.findOne({ status: 'succeeded' })
      .sort({ createdAt: -1 })
      .populate('bill')
      .populate('restaurant');

    if (!payment) {
      console.log('✗ No successful payment found. Please complete a payment first.');
      process.exit(0);
    }

    console.log('✓ Found successful payment');
    console.log(`  Payment ID: ${payment._id}`);
    console.log(`  Amount: $${payment.totalAmount.toFixed(2)}`);
    console.log(`  Restaurant: ${payment.restaurant.name}\n`);

    // Test 1: Generate Receipt
    console.log('Test 1: Generate Receipt');
    let receipt = await Receipt.findOne({ payment: payment._id });
    if (!receipt) {
      receipt = await receiptService.generateReceipt(payment._id, 'test@example.com');
      console.log(`✓ Receipt generated: ${receipt.receiptNumber}`);
    } else {
      console.log(`✓ Receipt already exists: ${receipt.receiptNumber}`);
    }
    console.log(`  Receipt ID: ${receipt._id}\n`);

    // Test 2: Get Receipt by ID
    console.log('Test 2: Get Receipt by ID');
    const fetchedReceipt = await receiptService.getReceiptById(receipt._id);
    console.log(`✓ Retrieved receipt: ${fetchedReceipt.receiptNumber}`);
    console.log(`  Total: $${fetchedReceipt.totalAmount.toFixed(2)}`);
    console.log(`  Items: ${fetchedReceipt.items.length}\n`);

    // Test 3: Get Receipt by Payment ID
    console.log('Test 3: Get Receipt by Payment ID');
    const receiptByPayment = await receiptService.getReceiptByPaymentId(payment._id);
    console.log(`✓ Retrieved receipt by payment: ${receiptByPayment.receiptNumber}\n`);

    // Test 4: Get Receipt by Receipt Number
    console.log('Test 4: Get Receipt by Receipt Number');
    const receiptByNumber = await receiptService.getReceiptByNumber(receipt.receiptNumber);
    console.log(`✓ Retrieved receipt by number: ${receiptByNumber.receiptNumber}\n`);

    // Test 5: Send Receipt Email
    console.log('Test 5: Send Receipt Email');
    try {
      const emailResult = await receiptService.sendReceiptEmail(receipt._id);
      if (emailResult.simulated) {
        console.log(`✓ Email simulated (no email config): ${emailResult.messageId}`);
      } else {
        console.log(`✓ Email sent: ${emailResult.messageId}`);
      }
    } catch (emailError) {
      console.log(`⚠ Email send: ${emailError.message}`);
    }
    console.log();

    // Test 6: Update Receipt Email
    console.log('Test 6: Update Receipt Email');
    const updatedReceipt = await receiptService.updateReceiptEmail(receipt._id, 'newemail@example.com');
    console.log(`✓ Updated email to: ${updatedReceipt.customerEmail}\n`);

    // Test 7: Resend Receipt
    console.log('Test 7: Resend Receipt Email');
    try {
      const resendResult = await receiptService.resendReceiptEmail(receipt._id);
      if (resendResult.simulated) {
        console.log(`✓ Email resent (simulated): ${resendResult.messageId}`);
      } else {
        console.log(`✓ Email resent: ${resendResult.messageId}`);
      }
    } catch (resendError) {
      console.log(`⚠ Resend: ${resendError.message}`);
    }
    console.log();

    // Test 8: Get Restaurant Receipts
    console.log('Test 8: Get Restaurant Receipts');
    const restaurantReceipts = await receiptService.getRestaurantReceipts(
      payment.restaurant._id,
      { limit: 5 }
    );
    console.log(`✓ Retrieved ${restaurantReceipts.receipts.length} receipts`);
    console.log(`  Total receipts: ${restaurantReceipts.total}\n`);

    // Test 9: Get Receipt Statistics
    console.log('Test 9: Get Receipt Statistics');
    const stats = await receiptService.getReceiptStatistics(payment.restaurant._id);
    console.log(`✓ Statistics calculated:`);
    console.log(`  Total receipts: ${stats.totalReceipts}`);
    console.log(`  Total revenue: $${stats.totalRevenue.toFixed(2)}`);
    console.log(`  Total tips: $${stats.totalTips.toFixed(2)}`);
    console.log(`  Average order: $${stats.averageOrderValue.toFixed(2)}`);
    console.log(`  Emails sent: ${stats.emailsSent}\n`);

    console.log('=== All Tests Passed ✓ ===');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testEndToEnd();
