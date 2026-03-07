// server/services/emailService.js
const nodemailer = require('nodemailer');

// 🔒 XSS Zaštita za HTML emailove
const escapeHTML = (str) => {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// 🔒 Validacija email adrese
const isValidEmail = (email) => {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
};

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'noreply@scanandpay.com';
    this.initialized = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      const emailConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };

      if (!emailConfig.host || !emailConfig.auth.user) {
        console.log('No email configuration found, running in test mode (emails will not be sent)');
        this.initialized = false;
        return;
      }

      this.transporter = nodemailer.createTransport(emailConfig);
      this.initialized = true;
      console.log('Email service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize email service:', error.message);
      this.initialized = false;
    }
  }

  async sendReceiptEmail(receiptData) {
    try {
      // 🔒 Validacija email adrese prije slanja
      if (!isValidEmail(receiptData.customerEmail)) {
        console.error(`Invalid customer email address: ${receiptData.customerEmail}`);
        return { success: false, error: 'Invalid email address' };
      }

      console.log(`Preparing to send receipt email to: ${receiptData.customerEmail}`);

      if (!this.initialized) {
        console.log('Email service not initialized - simulating email send');
        return {
          success: true,
          messageId: `test-${Date.now()}`,
          simulated: true
        };
      }

      const emailHtml = this.generateReceiptEmailHTML(receiptData);
      const emailText = this.generateReceiptEmailText(receiptData);

      const mailOptions = {
        from: `Scan&Pay <${this.from}>`,
        to: receiptData.customerEmail,
        subject: `Receipt #${receiptData.receiptNumber} - ${receiptData.restaurantName}`,
        text: emailText,
        html: emailHtml
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Receipt email sent successfully: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        simulated: false
      };
    } catch (error) {
      console.error('Error sending receipt email:', error);
      // 🔒 ISPRAVAK: Ne bacamo exception — vracamo failure objekt
      // da crash emaila ne rusi cijeli payment flow (receipt je vec kreiran u bazi)
      return { success: false, error: error.message };
    }
  }

  generateReceiptEmailHTML(receiptData) {
    const {
      receiptNumber,
      restaurantName,
      tableNumber,
      items = [],
      subtotal = 0,
      tipAmount = 0,
      tipPercentage,
      totalAmount = 0,
      paymentMethod,
      transactionId,
      createdAt
    } = receiptData;

    // 🔒 SIGURNO: Escapeanje korisničkih inputa prije ubacivanja u HTML
    const safeRestaurantName = escapeHTML(restaurantName);
    const safeTableNumber    = escapeHTML(tableNumber);
    const safeTransactionId  = escapeHTML(transactionId);
    const safeReceiptNumber  = escapeHTML(receiptNumber);

    // 🔒 ISPRAVAK: Null-safe na svakom itemu — price/total mogu biti undefined
    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHTML(item.name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${Number(item.quantity || 0)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${Number(item.price || 0).toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${Number(item.total || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    // 🔒 ISPRAVAK: tipAmount moze biti null/undefined — Number() garantira 0
    const safeTipAmount = Number(tipAmount || 0);
    const tipDisplay = tipPercentage
      ? `€${safeTipAmount.toFixed(2)} (${tipPercentage}%)`
      : `€${safeTipAmount.toFixed(2)}`;

    const formattedDate = createdAt
      ? new Date(createdAt).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' })
      : new Date().toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' });

    return `
      <!DOCTYPE html>
      <html lang="hr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt #${safeReceiptNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Scan&amp;Pay</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your payment!</p>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="margin-bottom: 30px;">
            <h2 style="color: #667eea; margin-bottom: 10px;">Receipt Details</h2>
            <p style="margin: 5px 0;"><strong>Receipt Number:</strong> ${safeReceiptNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${formattedDate}</p>
            <p style="margin: 5px 0;"><strong>Restaurant:</strong> ${safeRestaurantName}</p>
            ${safeTableNumber ? `<p style="margin: 5px 0;"><strong>Table:</strong> ${safeTableNumber}</p>` : ''}
            <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${safeTransactionId}</p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #667eea; margin-bottom: 15px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #667eea;">Item</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #667eea;">Qty</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Price</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #667eea;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
            </table>
          </div>

          <div style="margin-bottom: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Subtotal:</span>
              <span>€${Number(subtotal || 0).toFixed(2)}</span>
            </div>
            ${safeTipAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Tip:</span>
              <span>${tipDisplay}</span>
            </div>` : ''}
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #667eea; font-size: 18px; font-weight: bold;">
              <span>Total:</span>
              <span style="color: #667eea;">€${Number(totalAmount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${this.formatPaymentMethod(paymentMethod)}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Paid ✓</span></p>
          </div>

          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
            <p style="margin: 0; color: #666; font-size: 14px;">Thank you for choosing Scan&amp;Pay</p>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">If you have any questions about this receipt, please contact the restaurant directly.</p>
          </div>
        </div>

        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p style="margin: 0;">This is an automated receipt from Scan&amp;Pay</p>
          <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Scan&amp;Pay. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;
  }

  generateReceiptEmailText(receiptData) {
    const {
      receiptNumber,
      restaurantName,
      tableNumber,
      items = [],
      subtotal = 0,
      tipAmount = 0,
      tipPercentage,
      totalAmount = 0,
      paymentMethod,
      transactionId,
      createdAt
    } = receiptData;

    // 🔒 ISPRAVAK: Null-safe na svim brojevnim poljima
    const itemsText = items.map(item =>
      `${item.name} x${Number(item.quantity || 0)} - €${Number(item.price || 0).toFixed(2)} = €${Number(item.total || 0).toFixed(2)}`
    ).join('\n');

    const safeTipAmount = Number(tipAmount || 0);
    const tipDisplay = tipPercentage
      ? `€${safeTipAmount.toFixed(2)} (${tipPercentage}%)`
      : `€${safeTipAmount.toFixed(2)}`;

    const formattedDate = createdAt
      ? new Date(createdAt).toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' })
      : new Date().toLocaleString('hr-HR', { timeZone: 'Europe/Zagreb' });

    return `
SCAN&PAY RECEIPT
================

Receipt Number: ${receiptNumber}
Date: ${formattedDate}
Restaurant: ${restaurantName}
${tableNumber ? `Table: ${tableNumber}` : ''}
Transaction ID: ${transactionId}

ORDER ITEMS
-----------
${itemsText}

PAYMENT SUMMARY
---------------
Subtotal: €${Number(subtotal || 0).toFixed(2)}
${safeTipAmount > 0 ? `Tip: ${tipDisplay}` : ''}
Total: €${Number(totalAmount || 0).toFixed(2)}

Payment Method: ${this.formatPaymentMethod(paymentMethod)}
Status: PAID ✓

Thank you for choosing Scan&Pay!

If you have any questions about this receipt, please contact the restaurant directly.

---
This is an automated receipt from Scan&Pay
© ${new Date().getFullYear()} Scan&Pay. All rights reserved.
    `.trim();
  }

  formatPaymentMethod(method) {
    const methodMap = {
      'apple_pay':  'Apple Pay',
      'google_pay': 'Google Pay',
      'paypal':     'PayPal',
      'aircash':    'AirCash',
      'card':       'Credit Card'
    };
    return methodMap[method] || (method ? String(method) : 'Card');
  }

  async verifyConnection() {
    if (!this.initialized) {
      return { success: false, message: 'Email service not initialized' };
    }

    try {
      await this.transporter.verify();
      return { success: true, message: 'Email service is ready' };
    } catch (error) {
      console.error('Email service verification failed:', error);
      return { success: false, message: error.message };
    }
  }
}

// Export singleton instance
module.exports = new EmailService();