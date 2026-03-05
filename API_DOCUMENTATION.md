# QuickPay API Documentation

Complete API reference for the QuickPay payment system.

---

## Base URL

**Development:** `http://localhost:3000`
**Production:** `https://your-domain.com`

---

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Table of Contents

1. [Authentication](#authentication-endpoints)
2. [Restaurants](#restaurant-endpoints)
3. [Bills](#bill-endpoints)
4. [Payments](#payment-endpoints)
5. [Receipts](#receipt-endpoints)
6. [QR Codes](#qr-code-endpoints)
7. [Dashboard](#dashboard-endpoints)
8. [Stripe](#stripe-connect-endpoints)

---

## Authentication Endpoints

### Register User

Create a new restaurant owner account.

**Endpoint:** `POST /api/auth/register`

**Request Body:**
```json
{
  "email": "owner@restaurant.com",
  "password": "SecurePass123",
  "restaurantName": "The Great Restaurant",
  "tableCount": 20
}
```

**Response:** `201 Created`
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "owner@restaurant.com",
    "restaurant": "507f191e810c19729de860ea"
  }
}
```

**Error Responses:**
- `400` - Email already registered
- `400` - Validation error

---

### Login User

Authenticate and receive JWT token.

**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "owner@restaurant.com",
  "password": "SecurePass123"
}
```

**Response:** `200 OK`
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "owner@restaurant.com",
    "restaurant": "507f191e810c19729de860ea"
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `404` - User not found

---

### Logout User

Invalidate current session.

**Endpoint:** `POST /api/auth/logout`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Logout successful"
}
```

---

### Get User Profile

Get current authenticated user profile.

**Endpoint:** `GET /api/auth/profile`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "owner@restaurant.com",
    "restaurant": {
      "_id": "507f191e810c19729de860ea",
      "name": "The Great Restaurant",
      "tableCount": 20,
      "address": "123 Main St",
      "phone": "+1234567890"
    }
  }
}
```

---

## Restaurant Endpoints

### Get All Restaurants

List all restaurants owned by authenticated user.

**Endpoint:** `GET /api/restaurants`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "restaurants": [
    {
      "_id": "507f191e810c19729de860ea",
      "name": "The Great Restaurant",
      "owner": "507f1f77bcf86cd799439011",
      "address": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zipCode": "10001",
      "country": "USA",
      "phone": "+1234567890",
      "email": "info@restaurant.com",
      "tableCount": 20,
      "stripeAccountId": "acct_1234567890",
      "stripeOnboardingComplete": true,
      "stripeChargesEnabled": true,
      "stripePayoutsEnabled": true,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Get Single Restaurant

Get restaurant details by ID.

**Endpoint:** `GET /api/restaurants/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
- `id` - Restaurant ID

**Response:** `200 OK`
```json
{
  "restaurant": {
    "_id": "507f191e810c19729de860ea",
    "name": "The Great Restaurant",
    "tableCount": 20,
    ...
  }
}
```

**Error Responses:**
- `404` - Restaurant not found
- `403` - Not authorized

---

### Create Restaurant

Create a new restaurant.

**Endpoint:** `POST /api/restaurants`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "New Restaurant",
  "tableCount": 15,
  "address": "456 Oak Ave",
  "city": "Los Angeles",
  "state": "CA",
  "zipCode": "90001",
  "country": "USA",
  "phone": "+1987654321",
  "email": "info@newrestaurant.com"
}
```

**Response:** `201 Created`
```json
{
  "restaurant": {
    "_id": "507f191e810c19729de860eb",
    "name": "New Restaurant",
    "owner": "507f1f77bcf86cd799439011",
    ...
  }
}
```

---

### Update Restaurant

Update restaurant details.

**Endpoint:** `PUT /api/restaurants/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "Updated Restaurant Name",
  "tableCount": 25,
  "phone": "+1111111111"
}
```

**Response:** `200 OK`
```json
{
  "restaurant": {
    "_id": "507f191e810c19729de860ea",
    "name": "Updated Restaurant Name",
    ...
  }
}
```

---

### Delete Restaurant

Delete a restaurant.

**Endpoint:** `DELETE /api/restaurants/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Restaurant deleted successfully"
}
```

---

## Bill Endpoints

### Get Bill by Restaurant and Table

Get active bill for a specific table (public endpoint).

**Endpoint:** `GET /api/bills/restaurant/:restaurantId/table/:tableNumber`

**URL Parameters:**
- `restaurantId` - Restaurant ID (or "demo" for demo mode)
- `tableNumber` - Table number

**Response:** `200 OK`
```json
{
  "bill": {
    "_id": "507f191e810c19729de860ec",
    "restaurant": {
      "_id": "507f191e810c19729de860ea",
      "name": "The Great Restaurant",
      "address": "123 Main St",
      "phone": "+1234567890"
    },
    "tableNumber": 5,
    "items": [
      {
        "_id": "507f191e810c19729de860ed",
        "name": "Grilled Salmon",
        "quantity": 1,
        "price": 24.99,
        "isPaid": false
      },
      {
        "_id": "507f191e810c19729de860ee",
        "name": "Caesar Salad",
        "quantity": 2,
        "price": 12.99,
        "isPaid": false
      }
    ],
    "subtotal": 50.97,
    "tax": 5.10,
    "totalAmount": 56.07,
    "paidAmount": 0,
    "status": "active",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

**Special Responses:**
- `410 Gone` - Bill fully paid
  ```json
  {
    "fullyPaid": true,
    "message": "This bill has been fully paid"
  }
  ```
- `404` - No active bill found

---

### Get Bill by ID

Get bill details by ID.

**Endpoint:** `GET /api/bills/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "bill": {
    "_id": "507f191e810c19729de860ec",
    ...
  }
}
```

---

### Get All Bills

Get all bills with optional filters.

**Endpoint:** `GET /api/bills`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `restaurant` - Filter by restaurant ID
- `status` - Filter by status (active, partially_paid, fully_paid, cancelled)
- `tableNumber` - Filter by table number
- `startDate` - Filter by date (ISO 8601)
- `endDate` - Filter by date (ISO 8601)
- `limit` - Limit results (default: 50)

**Example:** `GET /api/bills?restaurant=507f191e810c19729de860ea&status=active&limit=10`

**Response:** `200 OK`
```json
{
  "bills": [
    {
      "_id": "507f191e810c19729de860ec",
      "restaurant": "507f191e810c19729de860ea",
      "tableNumber": 5,
      "totalAmount": 56.07,
      "status": "active",
      ...
    }
  ]
}
```

---

### Create Bill

Create a new bill.

**Endpoint:** `POST /api/bills`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "restaurant": "507f191e810c19729de860ea",
  "tableNumber": 7,
  "items": [
    {
      "name": "Steak",
      "quantity": 1,
      "price": 35.99
    },
    {
      "name": "Wine",
      "quantity": 2,
      "price": 15.00
    }
  ],
  "tax": 6.60,
  "notes": "Table by the window"
}
```

**Response:** `201 Created`
```json
{
  "bill": {
    "_id": "507f191e810c19729de860ef",
    "restaurant": "507f191e810c19729de860ea",
    "tableNumber": 7,
    "items": [...],
    "subtotal": 65.99,
    "tax": 6.60,
    "totalAmount": 72.59,
    "status": "active",
    ...
  }
}
```

---

### Update Bill

Update bill details.

**Endpoint:** `PUT /api/bills/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "items": [
    {
      "name": "Additional Item",
      "quantity": 1,
      "price": 10.00
    }
  ],
  "notes": "Updated notes"
}
```

**Response:** `200 OK`
```json
{
  "bill": {
    "_id": "507f191e810c19729de860ef",
    ...
  }
}
```

---

### Delete Bill

Delete a bill.

**Endpoint:** `DELETE /api/bills/:id`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "Bill deleted successfully"
}
```

---

## Payment Endpoints

### Create Payment

Create a payment intent for selected items.

**Endpoint:** `POST /api/payments/create`

**Request Body:**
```json
{
  "billId": "507f191e810c19729de860ec",
  "items": [
    {
      "itemId": "507f191e810c19729de860ed",
      "quantity": 1
    },
    {
      "itemId": "507f191e810c19729de860ee",
      "quantity": 2
    }
  ],
  "tip": 10.00,
  "paymentMethod": "card",
  "customerEmail": "customer@example.com"
}
```

**Response:** `200 OK`
```json
{
  "paymentId": "507f191e810c19729de860f0",
  "clientSecret": "pi_1234567890_secret_abcdefghijk",
  "amount": 50.97,
  "totalAmount": 60.97,
  "currency": "usd"
}
```

**Demo Mode:** Works with `billId: "demo-bill-1"`

---

### Confirm Payment

Confirm payment after Stripe processing.

**Endpoint:** `POST /api/payments/confirm/:paymentId`

**URL Parameters:**
- `paymentId` - Payment ID

**Response:** `200 OK`
```json
{
  "success": true,
  "status": "succeeded",
  "payment": {
    "_id": "507f191e810c19729de860f0",
    "status": "succeeded",
    "amount": 50.97,
    "tip": 10.00,
    "totalAmount": 60.97,
    "paidAt": "2024-01-01T12:30:00.000Z",
    ...
  }
}
```

---

### Get Payment by ID

Get payment details.

**Endpoint:** `GET /api/payments/:paymentId`

**Response:** `200 OK`
```json
{
  "payment": {
    "_id": "507f191e810c19729de860f0",
    "bill": "507f191e810c19729de860ec",
    "restaurant": "507f191e810c19729de860ea",
    "amount": 50.97,
    "tip": 10.00,
    "totalAmount": 60.97,
    "status": "succeeded",
    "paymentMethod": "card",
    ...
  }
}
```

---

### Get Payment by Intent ID

Get payment by Stripe payment intent ID.

**Endpoint:** `GET /api/payments/intent/:intentId`

**Response:** `200 OK`
```json
{
  "payment": {
    "_id": "507f191e810c19729de860f0",
    "stripePaymentIntentId": "pi_1234567890",
    ...
  }
}
```

---

### Refund Payment

Refund a payment (full or partial).

**Endpoint:** `POST /api/payments/refund/:paymentId`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "amount": 30.00
}
```
*Omit amount for full refund*

**Response:** `200 OK`
```json
{
  "success": true,
  "refund": {
    "id": "re_1234567890",
    "amount": 30.00,
    "status": "succeeded"
  }
}
```

---

### Get Restaurant Payments

Get all payments for a restaurant.

**Endpoint:** `GET /api/payments/restaurant/:restaurantId`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `status` - Filter by status
- `startDate` - Filter by date
- `endDate` - Filter by date
- `limit` - Limit results

**Response:** `200 OK`
```json
{
  "payments": [
    {
      "_id": "507f191e810c19729de860f0",
      "totalAmount": 60.97,
      "status": "succeeded",
      "paidAt": "2024-01-01T12:30:00.000Z",
      ...
    }
  ]
}
```

---

### Get Payment Statistics

Get payment statistics for a restaurant.

**Endpoint:** `GET /api/payments/restaurant/:restaurantId/statistics`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` - Filter start date
- `endDate` - Filter end date

**Response:** `200 OK`
```json
{
  "statistics": {
    "totalRevenue": 15420.50,
    "totalPayments": 234,
    "averageOrderValue": 65.90,
    "totalTips": 2310.00,
    "paymentsByMethod": {
      "card": 120,
      "apple_pay": 60,
      "google_pay": 40,
      "paypal": 14
    }
  }
}
```

---

## Receipt Endpoints

### Generate Receipt

Generate a receipt for a completed payment.

**Endpoint:** `POST /api/receipts/generate`

**Request Body:**
```json
{
  "paymentId": "507f191e810c19729de860f0",
  "customerEmail": "customer@example.com"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "receipt": {
    "_id": "507f191e810c19729de860f1",
    "receiptNumber": "RCP-20240101-001",
    "payment": "507f191e810c19729de860f0",
    "restaurant": "507f191e810c19729de860ea",
    "bill": "507f191e810c19729de860ec",
    "customerEmail": "customer@example.com",
    "items": [...],
    "subtotal": 50.97,
    "tax": 5.10,
    "tip": 10.00,
    "totalAmount": 66.07,
    "createdAt": "2024-01-01T12:30:00.000Z"
  }
}
```

---

### Send Receipt Email

Send receipt via email.

**Endpoint:** `POST /api/receipts/send-email`

**Request Body:**
```json
{
  "email": "customer@example.com",
  "paymentId": "507f191e810c19729de860f0"
}
```
*Or use `receiptId` instead of `paymentId`*

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Receipt sent successfully",
  "messageId": "<msg_id@server.com>",
  "simulated": false
}
```

---

### Get Receipt by ID

Get receipt details by ID.

**Endpoint:** `GET /api/receipts/:receiptId`

**Response:** `200 OK`
```json
{
  "success": true,
  "receipt": {
    "_id": "507f191e810c19729de860f1",
    "receiptNumber": "RCP-20240101-001",
    ...
  }
}
```

---

### Get Receipt by Number

Get receipt by receipt number.

**Endpoint:** `GET /api/receipts/number/:receiptNumber`

**Response:** `200 OK`
```json
{
  "success": true,
  "receipt": {
    "receiptNumber": "RCP-20240101-001",
    ...
  }
}
```

---

### Get Receipt by Payment ID

Get receipt for a specific payment.

**Endpoint:** `GET /api/receipts/payment/:paymentId`

**Response:** `200 OK`
```json
{
  "success": true,
  "receipt": {
    "payment": "507f191e810c19729de860f0",
    ...
  }
}
```

---

### Resend Receipt

Resend receipt email.

**Endpoint:** `POST /api/receipts/:receiptId/resend`

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```
*Email is optional - uses original if omitted*

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Receipt resent successfully",
  "messageId": "<msg_id@server.com>"
}
```

---

### Get Restaurant Receipts

Get all receipts for a restaurant.

**Endpoint:** `GET /api/receipts/restaurant/:restaurantId`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit` - Limit results (default: 50)
- `skip` - Skip results for pagination
- `startDate` - Filter by date
- `endDate` - Filter by date
- `status` - Filter by status

**Response:** `200 OK`
```json
{
  "success": true,
  "receipts": [
    {
      "_id": "507f191e810c19729de860f1",
      "receiptNumber": "RCP-20240101-001",
      "totalAmount": 66.07,
      ...
    }
  ],
  "total": 150,
  "limit": 50,
  "skip": 0
}
```

---

### Get Receipt Statistics

Get receipt statistics for a restaurant.

**Endpoint:** `GET /api/receipts/restaurant/:restaurantId/statistics`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `startDate` - Filter start date
- `endDate` - Filter end date

**Response:** `200 OK`
```json
{
  "success": true,
  "statistics": {
    "totalReceipts": 234,
    "totalAmount": 15420.50,
    "emailsSent": 220,
    "emailsPending": 14,
    "fiscalized": 234
  }
}
```

---

## QR Code Endpoints

### Generate QR Codes

Generate QR codes for restaurant tables.

**Endpoint:** `POST /api/qrcodes/generate`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "restaurantId": "507f191e810c19729de860ea",
  "tableNumber": 5
}
```
*Or generate for all tables:*
```json
{
  "restaurantId": "507f191e810c19729de860ea",
  "tableCount": 20
}
```

**Response:** `201 Created`
```json
{
  "message": "QR codes generated successfully",
  "qrCodes": [
    {
      "_id": "507f191e810c19729de860f2",
      "restaurant": "507f191e810c19729de860ea",
      "tableNumber": 5,
      "qrCodeData": "data:image/png;base64,...",
      "paymentUrl": "https://yourdomain.com/pay?restaurant=507f191e810c19729de860ea&table=5",
      "encryptionKey": "abc123def456"
    }
  ]
}
```

---

### Get Restaurant QR Codes

Get all QR codes for a restaurant.

**Endpoint:** `GET /api/qrcodes/restaurant/:restaurantId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "qrCodes": [
    {
      "_id": "507f191e810c19729de860f2",
      "tableNumber": 5,
      "qrCodeData": "data:image/png;base64,...",
      "paymentUrl": "...",
      "isActive": true,
      "scans": 42,
      "lastScannedAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

---

### Get QR Code by Table

Get QR code for specific table.

**Endpoint:** `GET /api/qrcodes/restaurant/:restaurantId/table/:tableNumber`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "qrCode": {
    "_id": "507f191e810c19729de860f2",
    "tableNumber": 5,
    "qrCodeData": "data:image/png;base64,...",
    ...
  }
}
```

---

### Regenerate QR Code

Regenerate a specific QR code.

**Endpoint:** `POST /api/qrcodes/regenerate/:qrCodeId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "QR code regenerated successfully",
  "qrCode": {
    "_id": "507f191e810c19729de860f2",
    "qrCodeData": "data:image/png;base64,...",
    ...
  }
}
```

---

### Delete QR Code

Delete a QR code.

**Endpoint:** `DELETE /api/qrcodes/:qrCodeId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "message": "QR code deleted successfully"
}
```

---

## Dashboard Endpoints

### Get Dashboard Summary

Get summary statistics for restaurant dashboard.

**Endpoint:** `GET /api/dashboard/summary`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `restaurantId` - Restaurant ID (required)

**Response:** `200 OK`
```json
{
  "summary": {
    "totalRevenue": 15420.50,
    "totalTransactions": 234,
    "averageOrderValue": 65.90,
    "todayRevenue": 1250.00,
    "todayTransactions": 18,
    "activeTables": 12
  }
}
```

---

### Get Daily Revenue

Get daily revenue data for charts.

**Endpoint:** `GET /api/dashboard/daily-revenue`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `restaurantId` - Restaurant ID (required)
- `startDate` - Start date (ISO 8601)
- `endDate` - End date (ISO 8601)

**Response:** `200 OK`
```json
{
  "dailyRevenue": [
    {
      "date": "2024-01-01",
      "revenue": 1250.00,
      "transactions": 18,
      "averageOrderValue": 69.44
    },
    {
      "date": "2024-01-02",
      "revenue": 1420.50,
      "transactions": 21,
      "averageOrderValue": 67.64
    }
  ]
}
```

---

### Get Monthly Revenue

Get monthly revenue data.

**Endpoint:** `GET /api/dashboard/monthly-revenue`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `restaurantId` - Restaurant ID (required)
- `year` - Year (default: current year)
- `month` - Month (1-12, optional)

**Response:** `200 OK`
```json
{
  "monthlyRevenue": [
    {
      "month": "2024-01",
      "revenue": 42350.00,
      "transactions": 612,
      "averageOrderValue": 69.20
    }
  ]
}
```

---

### Get Transaction History

Get paginated transaction history.

**Endpoint:** `GET /api/dashboard/transactions`

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `restaurantId` - Restaurant ID (required)
- `startDate` - Start date
- `endDate` - End date
- `status` - Filter by status
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset

**Response:** `200 OK`
```json
{
  "transactions": [
    {
      "_id": "507f191e810c19729de860f0",
      "amount": 60.97,
      "tip": 10.00,
      "totalAmount": 66.07,
      "paymentMethod": "card",
      "status": "succeeded",
      "tableNumber": 5,
      "paidAt": "2024-01-01T12:30:00.000Z"
    }
  ],
  "total": 234,
  "limit": 20,
  "offset": 0
}
```

---

## Stripe Connect Endpoints

### Start Onboarding

Start Stripe Connect onboarding for restaurant.

**Endpoint:** `POST /api/stripe/onboard`

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "restaurantId": "507f191e810c19729de860ea",
  "refreshUrl": "https://yourdomain.com/settings",
  "returnUrl": "https://yourdomain.com/settings?onboarding=success"
}
```

**Response:** `200 OK`
```json
{
  "url": "https://connect.stripe.com/setup/s/acct_1234567890/abc123def456"
}
```

---

### Check Account Status

Check Stripe Connect account status.

**Endpoint:** `GET /api/stripe/status/:restaurantId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "stripeAccountId": "acct_1234567890",
  "onboardingComplete": true,
  "chargesEnabled": true,
  "payoutsEnabled": true,
  "detailsSubmitted": true,
  "capabilities": {
    "card_payments": "active",
    "transfers": "active"
  }
}
```

---

### Get Dashboard Link

Get Stripe Express Dashboard link.

**Endpoint:** `GET /api/stripe/dashboard/:restaurantId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "url": "https://connect.stripe.com/express/acct_1234567890"
}
```

---

### Get Account Balance

Get Stripe account balance.

**Endpoint:** `GET /api/stripe/balance/:restaurantId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "available": [
    {
      "amount": 125000,
      "currency": "usd"
    }
  ],
  "pending": [
    {
      "amount": 35000,
      "currency": "usd"
    }
  ]
}
```
*Note: Amounts are in cents (125000 = $1,250.00)*

---

## Error Responses

All endpoints follow standard HTTP status codes:

### Success Codes
- `200 OK` - Request successful
- `201 Created` - Resource created
- `204 No Content` - Success with no response body

### Client Error Codes
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Access denied
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `410 Gone` - Resource no longer available
- `422 Unprocessable Entity` - Validation error

### Server Error Codes
- `500 Internal Server Error` - Server error
- `503 Service Unavailable` - Service temporarily unavailable

### Error Response Format
```json
{
  "error": "Error message describing what went wrong"
}
```

---

## Rate Limiting

*To be implemented in production*

Recommended limits:
- Authentication endpoints: 5 requests/minute
- Payment endpoints: 10 requests/minute
- General endpoints: 100 requests/minute

---

## Webhooks

*To be implemented for production Stripe integration*

Stripe webhooks for:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `account.updated`

---

## Testing

### Demo Mode

Use `restaurant=demo` for testing without a database:

```bash
GET /api/bills/restaurant/demo/table/1
```

Returns mock data for testing the payment flow.

### Test Cards (Stripe)

```
Success: 4242 4242 4242 4242
Decline: 4000 0000 0000 0002
Auth Required: 4000 0025 0000 3155
```

---

*API Documentation - Version 1.0.0*
*Last Updated: December 27, 2024*
