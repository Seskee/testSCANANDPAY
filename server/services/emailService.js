const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.from = process.env.EMAIL_FROM || 'noreply@scanandpay.com';
    this.initialized = false;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      // Check if we have email configuration
      const emailConfig = {
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        }
      };

      // If no email configuration, use ethereal for testing
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
      throw new Error(`Failed to send receipt email: ${error.message}`);
    }
  }

  generateReceiptEmailHTML(receiptData) {
    const {
      receiptNumber,
      restaurantName,
      tableNumber,
      items,
      subtotal,
      tipAmount,
      tipPercentage,
      totalAmount,
      paymentMethod,
      transactionId,
      createdAt
    } = receiptData;

    const itemsHTML = items.map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${item.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">€${item.total.toFixed(2)}</td>
      </tr>
    `).join('');

    const tipDisplay = tipPercentage
      ? `€${tipAmount.toFixed(2)} (${tipPercentage}%)`
      : `€${tipAmount.toFixed(2)}`;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt #${receiptNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">Scan&Pay</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Thank you for your payment!</p>
        </div>

        <div style="background: white; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
          <div style="margin-bottom: 30px;">
            <h2 style="color: #667eea; margin-bottom: 10px;">Receipt Details</h2>
            <p style="margin: 5px 0;"><strong>Receipt Number:</strong> ${receiptNumber}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(createdAt).toLocaleString()}</p>
            <p style="margin: 5px 0;"><strong>Restaurant:</strong> ${restaurantName}</p>
            <p style="margin: 5px 0;"><strong>Table:</strong> ${tableNumber}</p>
            <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${transactionId}</p>
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
              <span>€${subtotal.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span>Tip:</span>
              <span>${tipDisplay}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 2px solid #667eea; font-size: 18px; font-weight: bold;">
              <span>Total:</span>
              <span style="color: #667eea;">€${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>Payment Method:</strong> ${this.formatPaymentMethod(paymentMethod)}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: #28a745; font-weight: bold;">Paid</span></p>
          </div>

          <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-top: 30px;">
            <p style="margin: 0; color: #666; font-size: 14px;">Thank you for choosing Scan&Pay</p>
            <p style="margin: 10px 0 0 0; color: #999; font-size: 12px;">If you have any questions about this receipt, please contact the restaurant directly.</p>
          </div>
        </div>

        <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
          <p style="margin: 0;">This is an automated receipt from Scan&Pay</p>
          <p style="margin: 5px 0 0 0;">&copy; ${new Date().getFullYear()} Scan&Pay. All rights reserved.</p>
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
      items,
      subtotal,
      tipAmount,
      tipPercentage,
      totalAmount,
      paymentMethod,
      transactionId,
      createdAt
    } = receiptData;

    const itemsText = items.map(item =>
      `${item.name} x${item.quantity} - €${item.price.toFixed(2)} = €${item.total.toFixed(2)}`
    ).join('\n');

    const tipDisplay = tipPercentage
      ? `€${tipAmount.toFixed(2)} (${tipPercentage}%)`
      : `€${tipAmount.toFixed(2)}`;

    return `
SCAN&PAY RECEIPT
================

Receipt Number: ${receiptNumber}
Date: ${new Date(createdAt).toLocaleString()}
Restaurant: ${restaurantName}
Table: ${tableNumber}
Transaction ID: ${transactionId}

ORDER ITEMS
-----------
${itemsText}

PAYMENT SUMMARY
---------------
Subtotal: €${subtotal.toFixed(2)}
Tip: ${tipDisplay}
Total: €${totalAmount.toFixed(2)}

Payment Method: ${this.formatPaymentMethod(paymentMethod)}
Status: PAID

Thank you for choosing Scan&Pay!

If you have any questions about this receipt, please contact the restaurant directly.

---
This is an automated receipt from Scan&Pay
© ${new Date().getFullYear()} Scan&Pay. All rights reserved.
    `.trim();
  }

  formatPaymentMethod(method) {
    const methodMap = {
      'apple_pay': 'Apple Pay',
      'google_pay': 'Google Pay',
      'paypal': 'PayPal',
      'aircash': 'AirCash',
      'card': 'Credit Card'
    };
    return methodMap[method] || method;
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
