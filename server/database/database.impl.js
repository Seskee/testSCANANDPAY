// server/database/database.impl.js
const { Pool } = require('pg');

function buildSetClause(input, startIndex = 1) {
  const entries = Object.entries(input).filter(([, v]) => v !== undefined);
  const clause = entries.map(([key], i) => {
    if (!/^[a-zA-Z0-9_]+$/.test(key)) {
      throw new Error(`CRITICAL: Invalid column name detected: ${key}`);
    }
    return `"${key}" = $${startIndex + i}`;
  }).join(', ');
  const values = entries.map(([, v]) => v);
  return { clause, values, nextIndex: startIndex + entries.length };
}

// BANK-GRADE: Strogo čuvanje paginacije da spriječimo memory exhaustion napade
function buildPaginationResult(data, total, options) {
  const limit = Math.max(1, Math.min(parseInt(options?.limit ?? 20) || 20, 100));
  const page = Math.max(1, parseInt(options?.page ?? 1) || 1);
  const offset = (page - 1) * limit;
  const hasMore = offset + data.length < total;
  return { data, total, page, limit, hasMore };
}

class PostgresTransaction {
  constructor(client) {
    this.client = client;
    this.active = true;
  }
  async commit() {
    await this.client.query('COMMIT');
    this.active = false;
    this.client.release();
  }
  async rollback() {
    await this.client.query('ROLLBACK');
    this.active = false;
    this.client.release();
  }
  isActive() {
    return this.active;
  }
}

class PostgresDatabase {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      max: 50,
      min: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      maxUses: 7500,
    });

    this.pool.on('error', (err) => {
      console.error('❌ Neočekivana greška na idle konekciji:', err.message);
    });
  }

  async query(text, params) {
    const result = await this.pool.query(text, params);
    return result.rows;
  }

  async queryOne(text, params) {
    const result = await this.pool.query(text, params);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async execute(text, params) {
    const result = await this.pool.query(text, params);
    return result.rowCount ?? 0;
  }

  async createUser(input) {
    const user = await this.queryOne(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,[input.email, input.password_hash, input.first_name ?? null, input.last_name ?? null, input.phone ?? null]
    );
    if (!user) throw new Error('Failed to create user');
    return user;
  }

  async getUserById(userId) {
    return this.queryOne('SELECT * FROM users WHERE id = $1', [userId]);
  }

  async getUserByEmail(email) {
    return this.queryOne('SELECT * FROM users WHERE email = $1', [email]);
  }

  async updateUser(userId, input) {
    const { clause, values } = buildSetClause(input);
    if (!clause) throw new Error('No fields to update');
    const user = await this.queryOne(
      `UPDATE users SET ${clause} WHERE id = $${values.length + 1} RETURNING *`,
      [...values, userId]
    );
    if (!user) throw new Error('User not found');
    return user;
  }

  async deleteUser(userId) {
    await this.execute('DELETE FROM users WHERE id = $1', [userId]);
  }

  async verifyUserEmail(userId) {
    const user = await this.queryOne(
      `UPDATE users SET is_verified = TRUE, email_verified_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [userId]
    );
    if (!user) throw new Error('User not found');
    return user;
  }

  async updateRefreshToken(userId, token) {
    await this.execute('UPDATE users SET refresh_token = $1 WHERE id = $2', [token, userId]);
  }

  async updateLastLogin(userId) {
    await this.execute('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [userId]);
  }

  async createRestaurant(input) {
    const restaurant = await this.queryOne(
      `INSERT INTO restaurants
         (owner_id, name, email, phone, address, city, postal_code, country, business_type, website, default_currency, timezone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[input.owner_id, input.name, input.email ?? null, input.phone ?? null, input.address ?? null, input.city ?? null, input.postal_code ?? null, input.country ?? 'HR', input.business_type ?? null, input.website ?? null, input.default_currency ?? 'EUR', input.timezone ?? 'Europe/Zagreb']
    );
    if (!restaurant) throw new Error('Failed to create restaurant');
    return restaurant;
  }

  async getRestaurantById(restaurantId) {
    return this.queryOne('SELECT * FROM restaurants WHERE id = $1', [restaurantId]);
  }

  async getRestaurantByStripeAccountId(stripeAccountId) {
    return this.queryOne('SELECT * FROM restaurants WHERE stripe_account_id = $1',[stripeAccountId]);
  }

  async getRestaurantsByOwnerId(ownerId) {
    return this.query('SELECT * FROM restaurants WHERE owner_id = $1 AND is_active = true ORDER BY created_at DESC', [ownerId]);
  }

  async getRestaurantWithOwner(restaurantId) {
    const row = await this.queryOne(
      `SELECT r.*, u.id AS u_id, u.email AS u_email, u.first_name AS u_first_name, u.last_name AS u_last_name, u.is_verified AS u_is_verified, u.created_at AS u_created_at
       FROM restaurants r JOIN users u ON r.owner_id = u.id WHERE r.id = $1`,
      [restaurantId]
    );
    if (!row) return null;
    const owner = { id: row.u_id, email: row.u_email, first_name: row.u_first_name, last_name: row.u_last_name, is_verified: row.u_is_verified, created_at: row.u_created_at };
    const { u_id, u_email, u_first_name, u_last_name, u_is_verified, u_created_at, ...rest } = row;
    return { ...rest, owner };
  }

  async updateRestaurant(restaurantId, input) {
    const { clause, values } = buildSetClause(input);
    if (!clause) throw new Error('No fields to update');
    const restaurant = await this.queryOne(`UPDATE restaurants SET ${clause} WHERE id = $${values.length + 1} RETURNING *`, [...values, restaurantId]);
    if (!restaurant) throw new Error('Restaurant not found');
    return restaurant;
  }

  async deleteRestaurant(restaurantId) {
    await this.execute('UPDATE restaurants SET is_active = false WHERE id = $1', [restaurantId]);
  }

  async updateStripeAccountStatus(restaurantId, status) {
    const { clause, values } = buildSetClause(status);
    if (!clause) throw new Error('No Stripe fields to update');
    const restaurant = await this.queryOne(`UPDATE restaurants SET ${clause} WHERE id = $${values.length + 1} RETURNING *`, [...values, restaurantId]);
    if (!restaurant) throw new Error('Restaurant not found');
    return restaurant;
  }

  async createTable(input) {
    const table = await this.queryOne(
      `INSERT INTO tables (restaurant_id, table_number, table_name, zone, capacity, qr_code_url)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[input.restaurant_id, input.table_number, input.table_name ?? null, input.zone ?? null, input.capacity ?? null, input.qr_code_url ?? null]
    );
    if (!table) throw new Error('Failed to create table');
    return table;
  }

  async getTableById(tableId) {
    return this.queryOne('SELECT * FROM tables WHERE id = $1', [tableId]);
  }

  async getTableByNumber(restaurantId, tableNumber) {
    return this.queryOne('SELECT * FROM tables WHERE restaurant_id = $1 AND table_number = $2', [restaurantId, tableNumber]);
  }

  async getTablesByRestaurantId(restaurantId, activeOnly = false) {
    if (activeOnly) return this.query('SELECT * FROM tables WHERE restaurant_id = $1 AND is_active = TRUE ORDER BY table_number', [restaurantId]);
    return this.query('SELECT * FROM tables WHERE restaurant_id = $1 ORDER BY table_number',[restaurantId]);
  }

  async updateTable(tableId, input) {
    const { clause, values } = buildSetClause(input);
    if (!clause) throw new Error('No fields to update');
    const table = await this.queryOne(`UPDATE tables SET ${clause} WHERE id = $${values.length + 1} RETURNING *`, [...values, tableId]);
    if (!table) throw new Error('Table not found');
    return table;
  }

  async deleteTable(tableId) {
    await this.execute('DELETE FROM tables WHERE id = $1', [tableId]);
  }

  async createTablesBatch(restaurantId, tableNumbers) {
    if (tableNumbers.length === 0) return[];
    const valuePlaceholders = tableNumbers.map((_, i) => `($1, $${i + 2})`).join(', ');
    return this.query(`INSERT INTO tables (restaurant_id, table_number) VALUES ${valuePlaceholders} ON CONFLICT (restaurant_id, table_number) DO NOTHING RETURNING *`, [restaurantId, ...tableNumbers]);
  }

  async createBill(input) {
    const bill = await this.queryOne(
      `INSERT INTO bills (restaurant_id, table_id, bill_number, pos_bill_id, subtotal, tax_amount, service_charge, total_amount, guest_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[input.restaurant_id, input.table_id ?? null, input.bill_number ?? null, input.pos_bill_id ?? null, input.subtotal, input.tax_amount ?? 0, input.service_charge ?? 0, input.total_amount, input.guest_count ?? null]
    );
    if (!bill) throw new Error('Failed to create bill');
    return bill;
  }

  async getBillById(billId) {
    return this.queryOne('SELECT * FROM bills WHERE id = $1', [billId]);
  }

  async getBillWithItems(billId) {
    const bill = await this.queryOne('SELECT * FROM bills WHERE id = $1', [billId]);
    if (!bill) return null;
    const items = await this.query('SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY created_at', [billId]);
    return { ...bill, items };
  }

  async getBillWithPayments(billId) {
    const bill = await this.queryOne('SELECT * FROM bills WHERE id = $1', [billId]);
    if (!bill) return null;
    const payments = await this.query('SELECT * FROM payments WHERE bill_id = $1 ORDER BY created_at', [billId]);
    return { ...bill, payments };
  }

  async getBillComplete(billId) {
    const bill = await this.queryOne('SELECT * FROM bills WHERE id = $1', [billId]);
    if (!bill) return null;
    const [billItems, rawPayments] = await Promise.all([
      this.query('SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY created_at',[billId]),
      this.query('SELECT * FROM payments WHERE bill_id = $1 ORDER BY created_at', [billId]),
    ]);
    const payments = await Promise.all(
      rawPayments.map(async (p) => {
        const payment_items = await this.query('SELECT * FROM payment_items WHERE payment_id = $1', [p.id]);
        return { ...p, payment_items };
      })
    );
    let table = undefined;
    if (bill.table_id) table = await this.queryOne('SELECT * FROM tables WHERE id = $1', [bill.table_id]) ?? undefined;
    return { ...bill, items: billItems, payments, table };
  }

  async getActiveBillForTable(restaurantId, tableId) {
    const bill = await this.queryOne(
      `SELECT * FROM bills WHERE restaurant_id = $1 AND table_id = $2 AND status IN ('active', 'partial') ORDER BY opened_at DESC LIMIT 1`,
      [restaurantId, tableId]
    );
    if (!bill) return null;
    const items = await this.query('SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY created_at', [bill.id]);
    return { ...bill, items };
  }

  async getBills(filters, pagination) {
    const conditions = [];
    const values =[];
    let idx = 1;

    if (filters.restaurant_id) { conditions.push(`restaurant_id = $${idx++}`); values.push(filters.restaurant_id); }
    if (filters.table_id)      { conditions.push(`table_id = $${idx++}`);      values.push(filters.table_id); }
    if (filters.status)        { conditions.push(`status = $${idx++}`);         values.push(filters.status); }
    if (filters.date_from)     { conditions.push(`opened_at >= $${idx++}`);     values.push(filters.date_from); }
    if (filters.date_to)       { conditions.push(`opened_at <= $${idx++}`);     values.push(filters.date_to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = await this.queryOne(`SELECT COUNT(*) FROM bills ${where}`, values);
    const total = parseInt(countRow?.count ?? '0', 10);

    const limit = Math.max(1, Math.min(parseInt(pagination?.limit ?? 20) || 20, 100));
    const page = Math.max(1, parseInt(pagination?.page ?? 1) || 1);
    const offset = (page - 1) * limit;

    const data = await this.query(
      `SELECT * FROM bills ${where} ORDER BY opened_at DESC LIMIT $${idx++} OFFSET $${idx++}`,[...values, limit, offset]
    );
    return buildPaginationResult(data, total, { page, limit, offset });
  }

  async updateBill(billId, input) {
    const { clause, values } = buildSetClause(input);
    if (!clause) throw new Error('No fields to update');
    const bill = await this.queryOne(`UPDATE bills SET ${clause} WHERE id = $${values.length + 1} RETURNING *`, [...values, billId]);
    if (!bill) throw new Error('Bill not found');
    return bill;
  }

  async deleteBill(billId) {
    await this.execute('DELETE FROM bills WHERE id = $1', [billId]);
  }

  async updateBillAmountPaid(billId, amount) {
    const bill = await this.queryOne('UPDATE bills SET amount_paid = $1 WHERE id = $2 RETURNING *', [amount, billId]);
    if (!bill) throw new Error('Bill not found');
    return bill;
  }

  async closeBill(billId) {
    const bill = await this.queryOne(`UPDATE bills SET status = 'paid', closed_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [billId]);
    if (!bill) throw new Error('Bill not found');
    return bill;
  }

  async getBillWithPaymentStatus(billId) {
    return this.queryOne('SELECT * FROM bills_with_payment_status WHERE id = $1',[billId]);
  }

  async createBillItem(input) {
    const item = await this.queryOne(
      `INSERT INTO bill_items (bill_id, pos_item_id, name, description, category, unit_price, quantity)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[input.bill_id, input.pos_item_id ?? null, input.name, input.description ?? null, input.category ?? null, input.unit_price, input.quantity]
    );
    if (!item) throw new Error('Failed to create bill item');
    return item;
  }

  async createBillItemsBatch(items) {
    if (items.length === 0) return[];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results =[];
      for (const item of items) {
        const result = await client.query(
          `INSERT INTO bill_items (bill_id, pos_item_id, name, description, category, unit_price, quantity) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[item.bill_id, item.pos_item_id ?? null, item.name, item.description ?? null, item.category ?? null, item.unit_price, item.quantity]
        );
        results.push(result.rows[0]);
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getBillItemById(itemId) {
    return this.queryOne('SELECT * FROM bill_items WHERE id = $1', [itemId]);
  }

  async getBillItemsByBillId(billId) {
    return this.query('SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY created_at', [billId]);
  }

  async getBillItemWithPayments(itemId) {
    const item = await this.queryOne('SELECT * FROM bill_items WHERE id = $1', [itemId]);
    if (!item) return null;
    const payment_items = await this.query('SELECT * FROM payment_items WHERE bill_item_id = $1', [itemId]);
    return { ...item, payment_items };
  }

  async updateBillItem(itemId, input) {
    const { clause, values } = buildSetClause(input);
    if (!clause) throw new Error('No fields to update');
    const item = await this.queryOne(`UPDATE bill_items SET ${clause} WHERE id = $${values.length + 1} RETURNING *`, [...values, itemId]);
    if (!item) throw new Error('Bill item not found');
    return item;
  }

  async deleteBillItem(itemId) {
    await this.execute('DELETE FROM bill_items WHERE id = $1',[itemId]);
  }

  async updateBillItemQuantityPaid(itemId, quantity) {
    const item = await this.queryOne('UPDATE bill_items SET quantity_paid = $1 WHERE id = $2 RETURNING *', [quantity, itemId]);
    if (!item) throw new Error('Bill item not found');
    return item;
  }

  async createPayment(input) {
    const payment = await this.queryOne(
      `INSERT INTO payments (bill_id, restaurant_id, subtotal, tip_amount, total_amount, guest_email, guest_name, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[input.bill_id, input.restaurant_id, input.subtotal, input.tip_amount ?? 0, input.total_amount, input.guest_email ?? null, input.guest_name ?? null, input.metadata ? JSON.stringify(input.metadata) : null]
    );
    if (!payment) throw new Error('Failed to create payment');
    return payment;
  }

  async getPaymentById(paymentId) {
    return this.queryOne('SELECT * FROM payments WHERE id = $1', [paymentId]);
  }

  async getPaymentByStripeIntentId(intentId) {
    return this.queryOne('SELECT * FROM payments WHERE stripe_payment_intent_id = $1', [intentId]);
  }

  async getPaymentWithItems(paymentId) {
    const payment = await this.queryOne('SELECT * FROM payments WHERE id = $1',[paymentId]);
    if (!payment) return null;
    const payment_items = await this.query('SELECT * FROM payment_items WHERE payment_id = $1', [paymentId]);
    return { ...payment, payment_items };
  }

  async getPaymentWithBill(paymentId) {
    const payment = await this.queryOne('SELECT * FROM payments WHERE id = $1', [paymentId]);
    if (!payment) return null;
    const bill = await this.queryOne('SELECT * FROM bills WHERE id = $1', [payment.bill_id]);
    if (!bill) return null;
    return { ...payment, bill };
  }

  async getPaymentsByBillId(billId) {
    return this.query('SELECT * FROM payments WHERE bill_id = $1 ORDER BY created_at', [billId]);
  }

  async getPayments(filters, pagination) {
    const conditions = [];
    const values =[];
    let idx = 1;

    if (filters.restaurant_id) { conditions.push(`restaurant_id = $${idx++}`); values.push(filters.restaurant_id); }
    if (filters.bill_id)       { conditions.push(`bill_id = $${idx++}`);        values.push(filters.bill_id); }
    if (filters.status)        { conditions.push(`status = $${idx++}`);          values.push(filters.status); }
    if (filters.guest_email)   { conditions.push(`guest_email = $${idx++}`);     values.push(filters.guest_email); }
    if (filters.date_from)     { conditions.push(`created_at >= $${idx++}`);     values.push(filters.date_from); }
    if (filters.date_to)       { conditions.push(`created_at <= $${idx++}`);     values.push(filters.date_to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = await this.queryOne(`SELECT COUNT(*) FROM payments ${where}`, values);
    const total = parseInt(countRow?.count ?? '0', 10);

    const limit = Math.max(1, Math.min(parseInt(pagination?.limit ?? 20) || 20, 100));
    const page = Math.max(1, parseInt(pagination?.page ?? 1) || 1);
    const offset = (page - 1) * limit;

    const data = await this.query(
      `SELECT * FROM payments ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );
    return buildPaginationResult(data, total, { page, limit, offset });
  }

  async updatePayment(paymentId, input) {
    const { clause, values } = buildSetClause(input);
    if (!clause) throw new Error('No fields to update');
    const payment = await this.queryOne(`UPDATE payments SET ${clause} WHERE id = $${values.length + 1} RETURNING *`, [...values, paymentId]);
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  async markPaymentAsSucceeded(paymentId, stripeData) {
    const payment = await this.queryOne(
      `UPDATE payments SET status = 'succeeded', stripe_charge_id = $1, stripe_payment_method_id = $2, payment_method_type = $3, card_brand = $4, card_last4 = $5, paid_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND status != 'succeeded' RETURNING *`,[stripeData.stripe_charge_id, stripeData.stripe_payment_method_id ?? null, stripeData.payment_method_type ?? null, stripeData.card_brand ?? null, stripeData.card_last4 ?? null, paymentId]
    );
    if (!payment) return null;
    return payment;
  }

  async markPaymentAsFailed(paymentId, failureCode, failureMessage) {
    const payment = await this.queryOne(
      `UPDATE payments SET status = 'failed', failure_code = $1, failure_message = $2 WHERE id = $3 RETURNING *`,[failureCode, failureMessage, paymentId]
    );
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  async refundPayment(paymentId) {
    const payment = await this.queryOne(`UPDATE payments SET status = 'refunded' WHERE id = $1 RETURNING *`,[paymentId]);
    if (!payment) throw new Error('Payment not found');
    return payment;
  }

  async deletePayment(paymentId) {
    await this.execute('DELETE FROM payments WHERE id = $1', [paymentId]);
  }

  async createPaymentItem(input) {
    const item = await this.queryOne(
      `INSERT INTO payment_items (payment_id, bill_item_id, quantity, unit_price, amount) VALUES ($1,$2,$3,$4,$5) RETURNING *`,[input.payment_id, input.bill_item_id, input.quantity, input.unit_price, input.amount]
    );
    if (!item) throw new Error('Failed to create payment item');
    return item;
  }

  async createPaymentItemsBatch(items) {
    if (items.length === 0) return[];
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results =[];
      for (const item of items) {
        const result = await client.query(
          `INSERT INTO payment_items (payment_id, bill_item_id, quantity, unit_price, amount) VALUES ($1,$2,$3,$4,$5) RETURNING *`,[item.payment_id, item.bill_item_id, item.quantity, item.unit_price, item.amount]
        );
        results.push(result.rows[0]);
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getPaymentItemsByPaymentId(paymentId) {
    return this.query('SELECT * FROM payment_items WHERE payment_id = $1', [paymentId]);
  }

  async getPaymentItemsWithDetails(paymentId) {
    const rows = await this.query(
      `SELECT
         pi.id AS pi_id, pi.payment_id AS pi_payment_id, pi.bill_item_id AS pi_bill_item_id, pi.quantity AS pi_quantity, pi.unit_price AS pi_unit_price, pi.amount AS pi_amount, pi.created_at AS pi_created_at,
         bi.id AS bi_id, bi.bill_id AS bi_bill_id, bi.pos_item_id AS bi_pos_item_id, bi.name AS bi_name, bi.description AS bi_description, bi.category AS bi_category, bi.unit_price AS bi_unit_price, bi.quantity AS bi_quantity, bi.total_price AS bi_total_price, bi.quantity_paid AS bi_quantity_paid, bi.quantity_remaining AS bi_quantity_remaining, bi.created_at AS bi_created_at, bi.updated_at AS bi_updated_at
       FROM payment_items pi JOIN bill_items bi ON pi.bill_item_id = bi.id WHERE pi.payment_id = $1`,
      [paymentId]
    );
    return rows.map(row => ({
      id: row.pi_id, payment_id: row.pi_payment_id, bill_item_id: row.pi_bill_item_id, quantity: row.pi_quantity, unit_price: row.pi_unit_price, amount: row.pi_amount, created_at: row.pi_created_at,
      bill_item: {
        id: row.bi_id, bill_id: row.bi_bill_id, pos_item_id: row.bi_pos_item_id, name: row.bi_name, description: row.bi_description, category: row.bi_category, unit_price: row.bi_unit_price, quantity: row.bi_quantity, total_price: row.bi_total_price, quantity_paid: row.bi_quantity_paid, quantity_remaining: row.bi_quantity_remaining, created_at: row.bi_created_at, updated_at: row.bi_updated_at,
      },
    }));
  }

  async deletePaymentItem(itemId) {
    await this.execute('DELETE FROM payment_items WHERE id = $1', [itemId]);
  }

  // ============================================
  // SPLIT BILL — HIGH LEVEL OPERATION
  // ============================================

  async validateSplitPayment(billId, items) {
    const errors =[];
    for (const item of items) {
      if (item.quantity <= 0) {
        errors.push(`Item ${item.bill_item_id}: quantity must be positive`);
        continue;
      }
      const billItem = await this.queryOne('SELECT * FROM bill_items WHERE id = $1 AND bill_id = $2',[item.bill_item_id, billId]);
      if (!billItem) {
        errors.push(`Item ${item.bill_item_id} does not exist on this bill`);
        continue;
      }
      
      // BANK-GRADE RACE CONDITION FIX: Oduzmi pending quantity pri validaciji
      const pendingQtyResult = await this.queryOne(
        `SELECT COALESCE(SUM(pi.quantity), 0) AS pending_qty FROM payment_items pi JOIN payments p ON pi.payment_id = p.id WHERE pi.bill_item_id = $1 AND p.status IN ('pending', 'processing')`,
        [item.bill_item_id]
      );
      const pendingQty = Number(pendingQtyResult.pending_qty);
      const availableQty = Number(billItem.quantity_remaining) - pendingQty;

      if (availableQty < item.quantity) {
        errors.push(`Item "${billItem.name}": requested ${item.quantity}, but only ${availableQty} available (others might be processing).`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  async createSplitPayment(request) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const billResult = await client.query('SELECT * FROM bills WHERE id = $1 FOR UPDATE', [request.bill_id]);
      if (billResult.rows.length === 0) throw new Error('Bill not found');
      const bill = billResult.rows[0];

      if (request.metadata && request.metadata.idempotencyKey) {
        const existingPayment = await client.query(
          `SELECT id FROM payments WHERE metadata->>'idempotencyKey' = $1`, [request.metadata.idempotencyKey]
        );
        if (existingPayment.rows.length > 0) throw new Error('Duplicate payment request detected.');
      }

      let subtotalCents = 0;
      const enrichedItems =[];
      
      for (const item of request.items) {
        if (item.quantity <= 0) throw new Error(`Item ${item.bill_item_id}: quantity must be positive`);
        
        const biResult = await client.query('SELECT * FROM bill_items WHERE id = $1 AND bill_id = $2 FOR UPDATE',[item.bill_item_id, request.bill_id]);
        if (biResult.rows.length === 0) throw new Error(`Item ${item.bill_item_id} does not exist on this bill`);
        const billItem = biResult.rows[0];
        
        const pendingQtyResult = await client.query(
          `SELECT COALESCE(SUM(pi.quantity), 0) AS pending_qty FROM payment_items pi JOIN payments p ON pi.payment_id = p.id WHERE pi.bill_item_id = $1 AND p.status IN ('pending', 'processing')`,
          [item.bill_item_id]
        );
        const pendingQty = Number(pendingQtyResult.rows[0].pending_qty);
        const availableQty = Number(billItem.quantity_remaining) - pendingQty;

        if (availableQty < item.quantity) {
          throw new Error(`Item "${billItem.name}": requested ${item.quantity}, but only ${availableQty} available (others might be processing).`);
        }

        const unitPriceCents = Math.round(Number(billItem.unit_price) * 100);
        const itemAmountCents = Math.round(unitPriceCents * Number(item.quantity)); 
        subtotalCents += itemAmountCents;

        // BANK-GRADE: Striktno rješavanje Float anomalija (toFixed(2))
        enrichedItems.push({ 
            bill_item_id: item.bill_item_id, 
            quantity: item.quantity, 
            unit_price: billItem.unit_price, 
            amount: Number((itemAmountCents / 100).toFixed(2)) 
        });
      }

      const billSubtotalCents = Math.round(Number(bill.subtotal) * 100);
      const billTaxCents = Math.round(Number(bill.tax_amount || 0) * 100);
      let splitTaxCents = 0;
      if (billSubtotalCents > 0) {
        splitTaxCents = Math.round((subtotalCents * billTaxCents) / billSubtotalCents);
      }
      const tipCents = Math.round((Number(request.tip_amount) || 0) * 100);
      const totalCents = subtotalCents + splitTaxCents + tipCents;

      // BANK-GRADE Float fix i ovdje
      const paymentResult = await client.query(
        `INSERT INTO payments (bill_id, restaurant_id, subtotal, tax_amount, tip_amount, total_amount, guest_email, guest_name, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9) RETURNING *`,[
             request.bill_id, bill.restaurant_id, 
             Number((subtotalCents / 100).toFixed(2)), 
             Number((splitTaxCents / 100).toFixed(2)), 
             Number((tipCents / 100).toFixed(2)), 
             Number((totalCents / 100).toFixed(2)), 
             request.guest_email || null, request.guest_name || null, request.metadata ? JSON.stringify(request.metadata) : null]
      );
      const payment = paymentResult.rows[0];

      for (const item of enrichedItems) {
        await client.query(
          `INSERT INTO payment_items (payment_id, bill_item_id, quantity, unit_price, amount) VALUES ($1, $2, $3, $4, $5)`,[payment.id, item.bill_item_id, item.quantity, item.unit_price, item.amount]
        );
      }

      await client.query('COMMIT');
      return { payment, payment_items: enrichedItems, stripe_client_secret: `PENDING_STRIPE_${payment.id}` };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("Greška u createSplitPayment:", err.message);
      throw err;
    } finally {
      client.release();
    }
  }

  // ============================================
  // RECEIPT OPERATIONS
  // ============================================

  async createReceipt(input) {
    const receipt = await this.queryOne(
      `INSERT INTO receipts (payment_id, restaurant_id, receipt_number, receipt_data, pdf_url, email_sent_to) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[input.payment_id, input.restaurant_id, input.receipt_number, input.receipt_data ? JSON.stringify(input.receipt_data) : null, input.pdf_url ?? null, input.email_sent_to ?? null]
    );
    if (!receipt) throw new Error('Failed to create receipt');
    return receipt;
  }

  async getReceiptById(receiptId) {
    return this.queryOne('SELECT * FROM receipts WHERE id = $1', [receiptId]);
  }

  async getReceiptByNumber(receiptNumber) {
    return this.queryOne('SELECT * FROM receipts WHERE receipt_number = $1', [receiptNumber]);
  }

  async getReceiptByPaymentId(paymentId) {
    return this.queryOne('SELECT * FROM receipts WHERE payment_id = $1 ORDER BY created_at DESC LIMIT 1', [paymentId]);
  }

  async getReceiptWithPayment(receiptId) {
    const receipt = await this.queryOne('SELECT * FROM receipts WHERE id = $1', [receiptId]);
    if (!receipt) return null;
    const payment = await this.queryOne('SELECT * FROM payments WHERE id = $1',[receipt.payment_id]);
    if (!payment) return null;
    return { ...receipt, payment };
  }

  async getReceipts(filters, pagination) {
    const conditions = [];
    const values =[];
    let idx = 1;

    if (filters.restaurant_id) { conditions.push(`restaurant_id = $${idx++}`); values.push(filters.restaurant_id); }
    if (filters.payment_id)    { conditions.push(`payment_id = $${idx++}`);    values.push(filters.payment_id); }
    if (filters.email_status)  { conditions.push(`email_status = $${idx++}`);  values.push(filters.email_status); }
    if (filters.date_from)     { conditions.push(`created_at >= $${idx++}`);   values.push(filters.date_from); }
    if (filters.date_to)       { conditions.push(`created_at <= $${idx++}`);   values.push(filters.date_to); }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countRow = await this.queryOne(`SELECT COUNT(*) FROM receipts ${where}`, values);
    const total = parseInt(countRow?.count ?? '0', 10);

    const limit = Math.max(1, Math.min(parseInt(pagination?.limit ?? 20) || 20, 100));
    const page = Math.max(1, parseInt(pagination?.page ?? 1) || 1);
    const offset = (page - 1) * limit;

    const data = await this.query(
      `SELECT * FROM receipts ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,[...values, limit, offset]
    );
    return buildPaginationResult(data, total, { page, limit, offset });
  }

  async updateReceipt(receiptId, input) {
    const { clause, values } = buildSetClause(input);
    if (!clause) throw new Error('No fields to update');
    const receipt = await this.queryOne(`UPDATE receipts SET ${clause} WHERE id = $${values.length + 1} RETURNING *`, [...values, receiptId]);
    if (!receipt) throw new Error('Receipt not found');
    return receipt;
  }

  async deleteReceipt(receiptId) {
    await this.execute('DELETE FROM receipts WHERE id = $1', [receiptId]);
  }

  async updateReceiptEmailStatus(receiptId, status) {
    const receipt = await this.queryOne(
      `UPDATE receipts SET email_status = $1, email_sent_at = CASE WHEN $1 = 'sent' THEN CURRENT_TIMESTAMP ELSE email_sent_at END WHERE id = $2 RETURNING *`,
      [status, receiptId]
    );
    if (!receipt) throw new Error('Receipt not found');
    return receipt;
  }

  // ============================================
  // QR CODE OPERATIONS
  // ============================================

  async createQRCode(input) {
    const qrCode = await this.queryOne(
      `INSERT INTO qr_codes (restaurant_id, table_id, qr_data, qr_image_url, format, size) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,[input.restaurant_id, input.table_id ?? null, input.qr_data, input.qr_image_url ?? null, input.format ?? 'png', input.size ?? 300]
    );
    if (!qrCode) throw new Error('Failed to create QR code');
    return qrCode;
  }

  async generateQRCodesForRestaurant(restaurantId, format = 'png', size = 300) {
    const tables = await this.query('SELECT * FROM tables WHERE restaurant_id = $1 AND is_active = TRUE', [restaurantId]);
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const results =[];
      for (const table of tables) {
        const qrData = `https://quickpay.app/pay?restaurant=${restaurantId}&table=${table.table_number}`;
        const result = await client.query(
          `INSERT INTO qr_codes (restaurant_id, table_id, qr_data, format, size) VALUES ($1,$2,$3,$4,$5) RETURNING *`,[restaurantId, table.id, qrData, format, size]
        );
        results.push(result.rows[0]);
      }
      await client.query('COMMIT');
      return results;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getQRCodeById(qrCodeId) {
    return this.queryOne('SELECT * FROM qr_codes WHERE id = $1', [qrCodeId]);
  }

  async getQRCodesByRestaurantId(restaurantId) {
    return this.query('SELECT * FROM qr_codes WHERE restaurant_id = $1 ORDER BY created_at DESC', [restaurantId]);
  }

  async getQRCodesByTableId(tableId) {
    return this.query('SELECT * FROM qr_codes WHERE table_id = $1 ORDER BY created_at DESC', [tableId]);
  }

  async getQRCodeWithTable(qrCodeId) {
    const qrCode = await this.queryOne('SELECT * FROM qr_codes WHERE id = $1', [qrCodeId]);
    if (!qrCode) return null;
    let table = undefined;
    if (qrCode.table_id) {
      table = await this.queryOne('SELECT * FROM tables WHERE id = $1', [qrCode.table_id]) ?? undefined;
    }
    return { ...qrCode, table };
  }

  async getQRCodeByData(qrData) {
    return this.queryOne(
      'SELECT qr.*, t.table_number FROM qr_codes qr LEFT JOIN tables t ON qr.table_id = t.id WHERE qr.qr_data = $1 AND qr.is_active = TRUE',
      [qrData]
    );
  }

  async updateQRCode(qrCodeId, input) {
    const { clause, values } = buildSetClause(input);
    if (!clause) throw new Error('No fields to update');
    const qrCode = await this.queryOne(`UPDATE qr_codes SET ${clause} WHERE id = $${values.length + 1} RETURNING *`, [...values, qrCodeId]);
    if (!qrCode) throw new Error('QR Code not found');
    return qrCode;
  }

  async deleteQRCode(qrCodeId) {
    await this.execute('DELETE FROM qr_codes WHERE id = $1', [qrCodeId]);
  }

  async incrementQRCodeDownloads(qrCodeId) {
    const qrCode = await this.queryOne(`UPDATE qr_codes SET download_count = download_count + 1, last_downloaded_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`, [qrCodeId]);
    if (!qrCode) throw new Error('QR Code not found');
    return qrCode;
  }

  // ============================================
  // ANALYTICS & DASHBOARD
  // ============================================

  async getDashboardSummary(restaurantId, dateFrom, dateTo) {
    const dateConditions =[];
    const params = [restaurantId];
    let idx = 2;

    if (dateFrom) { dateConditions.push(`b.opened_at >= $${idx++}`); params.push(dateFrom); }
    if (dateTo)   { dateConditions.push(`b.opened_at <= $${idx++}`); params.push(dateTo); }

    const dateWhere = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

    const result = await this.queryOne(
      `SELECT
         COALESCE(SUM(p.total_amount) FILTER (WHERE p.status = 'succeeded'), 0)::float AS total_revenue,
         COUNT(p.id) FILTER (WHERE p.status = 'succeeded')::int                        AS total_transactions,
         COALESCE(SUM(p.tip_amount) FILTER (WHERE p.status = 'succeeded'), 0)::float   AS total_tips,
         COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'active')::int                  AS active_bills,
         COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'paid')::int                    AS completed_bills,
         COALESCE(AVG(b.total_amount), 0)::float                                        AS average_bill_amount,
         COALESCE(AVG((p.tip_amount / NULLIF(p.subtotal, 0)) * 100) FILTER (WHERE p.status = 'succeeded' AND p.subtotal > 0), 0)::float AS average_tip_percentage
       FROM bills b LEFT JOIN payments p ON b.id = p.bill_id WHERE b.restaurant_id = $1 ${dateWhere}`,
      params
    );
    return result;
  }

  async getDailyRevenue(restaurantId, dateFrom, dateTo) {
    return this.query(
      `SELECT TO_CHAR(DATE(p.created_at), 'YYYY-MM-DD') AS date, COALESCE(SUM(p.total_amount), 0)::float AS revenue, COUNT(p.id)::int AS transactions, COALESCE(SUM(p.tip_amount), 0)::float AS tips
       FROM payments p WHERE p.restaurant_id = $1 AND p.status = 'succeeded' AND p.created_at BETWEEN $2 AND $3 GROUP BY DATE(p.created_at) ORDER BY DATE(p.created_at) ASC`,
      [restaurantId, dateFrom, dateTo]
    );
  }

  async getMonthlyRevenue(restaurantId, year) {
    return this.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', p.created_at), 'YYYY-MM') AS month, COALESCE(SUM(p.total_amount), 0)::float AS revenue, COUNT(p.id)::int AS transactions, COALESCE(SUM(p.tip_amount), 0)::float AS tips
       FROM payments p WHERE p.restaurant_id = $1 AND p.status = 'succeeded' AND EXTRACT(YEAR FROM p.created_at) = $2 GROUP BY DATE_TRUNC('month', p.created_at) ORDER BY DATE_TRUNC('month', p.created_at) ASC`,[restaurantId, year]
    );
  }

  async getTopItems(restaurantId, limit = 10, dateFrom, dateTo) {
    const dateConditions = [];
    const params =[restaurantId, limit];
    let idx = 3;

    if (dateFrom) { dateConditions.push(`b.opened_at >= $${idx++}`); params.push(dateFrom); }
    if (dateTo)   { dateConditions.push(`b.opened_at <= $${idx++}`); params.push(dateTo); }

    const dateWhere = dateConditions.length > 0 ? `AND ${dateConditions.join(' AND ')}` : '';

    return this.query(
      `SELECT bi.name AS name, bi.category AS category, COUNT(bi.id)::int AS times_ordered, COALESCE(SUM(bi.total_price), 0)::float AS revenue
       FROM bill_items bi JOIN bills b ON bi.bill_id = b.id WHERE b.restaurant_id = $1 ${dateWhere} GROUP BY bi.name, bi.category ORDER BY times_ordered DESC LIMIT $2`,
      params
    );
  }

  async getTransactionHistory(restaurantId, pagination, dateFrom, dateTo) {
    const conditions = [`p.restaurant_id = $1`, `p.status = 'succeeded'`];
    const values =[restaurantId];
    let idx = 2;

    if (dateFrom) { conditions.push(`p.created_at >= $${idx++}`); values.push(dateFrom); }
    if (dateTo)   { conditions.push(`p.created_at <= $${idx++}`); values.push(dateTo); }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const countRow = await this.queryOne(`SELECT COUNT(*) FROM payments p ${where}`, values);
    const total = parseInt(countRow?.count ?? '0', 10);

    const limit = Math.max(1, Math.min(parseInt(pagination?.limit ?? 20) || 20, 100));
    const page = Math.max(1, parseInt(pagination?.page ?? 1) || 1);
    const offset = (page - 1) * limit;

    const data = await this.query(
      `SELECT p.id AS payment_id, b.bill_number, t.table_number, p.total_amount::float AS amount, p.tip_amount::float AS tip_amount, COALESCE(p.payment_method_type, 'unknown') AS payment_method, p.status, p.guest_email, p.created_at
       FROM payments p JOIN bills b ON p.bill_id = b.id LEFT JOIN tables t ON b.table_id = t.id ${where} ORDER BY p.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset]
    );
    return buildPaginationResult(data, total, { page, limit, offset });
  }

  async getAverageBillAmount(restaurantId, dateFrom, dateTo) {
    const conditions = ['restaurant_id = $1'];
    const values =[restaurantId];
    let idx = 2;
    if (dateFrom) { conditions.push(`opened_at >= $${idx++}`); values.push(dateFrom); }
    if (dateTo)   { conditions.push(`opened_at <= $${idx++}`); values.push(dateTo); }
    const result = await this.queryOne(`SELECT COALESCE(AVG(total_amount), 0) AS avg FROM bills WHERE ${conditions.join(' AND ')}`, values);
    return parseFloat(result?.avg ?? '0');
  }

  async getAverageTipPercentage(restaurantId, dateFrom, dateTo) {
    const conditions =[`restaurant_id = $1`, `status = 'succeeded'`, `subtotal > 0`];
    const values = [restaurantId];
    let idx = 2;
    if (dateFrom) { conditions.push(`created_at >= $${idx++}`); values.push(dateFrom); }
    if (dateTo)   { conditions.push(`created_at <= $${idx++}`); values.push(dateTo); }
    const result = await this.queryOne(`SELECT COALESCE(AVG((tip_amount / NULLIF(subtotal, 0)) * 100), 0) AS avg_tip_pct FROM payments WHERE ${conditions.join(' AND ')}`, values);
    return parseFloat(result?.avg_tip_pct ?? '0');
  }

  async getAverageTableTurnover(restaurantId, dateFrom, dateTo) {
    const conditions =[`restaurant_id = $1`, `status = 'paid'`, `closed_at IS NOT NULL`];
    const values = [restaurantId];
    let idx = 2;
    if (dateFrom) { conditions.push(`opened_at >= $${idx++}`); values.push(dateFrom); }
    if (dateTo)   { conditions.push(`opened_at <= $${idx++}`); values.push(dateTo); }
    const result = await this.queryOne(`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (closed_at - opened_at)) / 60), 0) AS avg_minutes FROM bills WHERE ${conditions.join(' AND ')}`, values);
    return parseFloat(result?.avg_minutes ?? '0');
  }

  async getPaymentMethodBreakdown(restaurantId, dateFrom, dateTo) {
    const conditions =[`restaurant_id = $1`, `status = 'succeeded'`];
    const values = [restaurantId];
    let idx = 2;
    if (dateFrom) { conditions.push(`created_at >= $${idx++}`); values.push(dateFrom); }
    if (dateTo)   { conditions.push(`created_at <= $${idx++}`); values.push(dateTo); }
    return this.query(
      `SELECT COALESCE(payment_method_type, 'unknown') AS method, COUNT(*)::int AS count, ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2)::float AS percentage
       FROM payments WHERE ${conditions.join(' AND ')} GROUP BY payment_method_type ORDER BY count DESC`,
      values
    );
  }

  async healthCheck() {
    try {
      await this.pool.query('SELECT 1');
      return { healthy: true };
    } catch (err) {
      return { healthy: false, message: err.message };
    }
  }

  async getPoolStats() {
    return { total: this.pool.totalCount, idle: this.pool.idleCount, waiting: this.pool.waitingCount };
  }

 async cleanupStalePayments() {
    // Vrijeme isteklih plaćanja svedeno na 15 minuta!
    const result = await this.pool.query(
      `UPDATE payments SET status = 'canceled' 
       WHERE status = 'pending' AND created_at < NOW() - INTERVAL '15 minutes'`
    );
    return result.rowCount ?? 0;
  }

  async autoClosePaidBills() {
    const result = await this.pool.query(`UPDATE bills SET status = 'paid', closed_at = CURRENT_TIMESTAMP WHERE amount_remaining <= 0 AND status NOT IN ('paid', 'void')`);
    return result.rowCount ?? 0;
  }

  async triggerBackup() {
    console.log('[DB] Backup triggered at', new Date().toISOString());
  }

  async beginTransaction() {
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return new PostgresTransaction(client);
  }

  async close() {
    await this.pool.end();
    console.log('[DB] Connection pool closed');
  }
}

module.exports = { PostgresDatabase };