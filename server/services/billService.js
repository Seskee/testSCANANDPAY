// server/services/billService.js
const { getDB } = require('../config/database');


const generateBillNumber = async (db, restaurantId) => {
  const year = new Date().getFullYear();
  
  // db.queryOne vraća jedan row objekt, ne array
  const row = await db.queryOne(
    'SELECT get_next_sequence_value($1, $2, $3) AS next_val',
    [restaurantId, 'bill', year]
  );
  
  const nextNumber = row?.next_val ?? 1;
  return `ORD-${year}-${String(nextNumber).padStart(6, '0')}`;
};

const createBill = async (billData) => {
  const { restaurant, tableNumber, items, tax = 0 } = billData;
  const db = getDB();

  const restaurant_row = await db.getRestaurantById(restaurant);
  if (!restaurant_row) throw new Error('Restaurant not found');

  const table = await db.getTableByNumber(restaurant, String(tableNumber));
  if (!table) throw new Error(`Table ${tableNumber} not found for this restaurant`);

  const activeBill = await db.getActiveBillForTable(restaurant, table.id);
  if (activeBill) throw new Error('An active bill already exists for this table');

  // BANK-GRADE MATEMATIKA: Osigurava da čak i decimalne količine (0.5) rezultiraju čistim integerom
  const subtotalCents = items.reduce((s, i) => {
    const price = Number(i.price);
    const qty = Number(i.quantity);
    if (isNaN(price) || isNaN(qty) || price < 0 || qty <= 0) {
      throw new Error(`Invalid item values for ${i.name}`);
    }
    return s + Math.round(Math.round(price * 100) * qty);
  }, 0);
  
  const rawTax = Number(tax);
  if (isNaN(rawTax) || rawTax < 0) throw new Error('Invalid tax value');
  const taxCents = Math.round(rawTax * 100);
  const totalCents = subtotalCents + taxCents;

  const billNumber = await generateBillNumber(db, restaurant);

  const bill = await db.createBill({
    restaurant_id: restaurant,
    table_id: table.id,
    bill_number: billNumber,
    subtotal: Number((subtotalCents / 100).toFixed(2)), 
    tax_amount: Number((taxCents / 100).toFixed(2)),
    total_amount: Number((totalCents / 100).toFixed(2)),
    status: 'active'
  });

  const billItems = await db.createBillItemsBatch(
    items.map(i => ({ bill_id: bill.id, name: i.name, unit_price: Number(i.price), quantity: Number(i.quantity) }))
  );

  return { 
    ...bill, 
    _id: bill.id, 
    tableNumber, 
    billNumber: billNumber,
    items: billItems.map(i => ({
      ...i, 
      _id: i.id,
      price: parseFloat(i.unit_price)
    }))
  };
};

const getBillById = async (billId) => {
  const db = getDB();
  const bill = await db.getBillComplete(billId);
  if (!bill) throw new Error('Bill not found');

  return {
    ...bill,
    _id: bill.id,
    tableNumber: bill.table?.table_number,
    items: (bill.items ||[]).map(i => ({
      ...i, _id: i.id,
      price: parseFloat(i.unit_price),
      isPaid: parseFloat(i.quantity_remaining) <= 0,
    })),
  };
};

// server/services/billService.js — ISPRAVNO
const getBillByRestaurantAndTable = async (restaurantId, tableNumber) => {
  const db = getDB();

  // Demo mode ostaje isti...
  if (process.env.ENABLE_DEMO_MODE === 'true' && 
     (restaurantId === 'demo' || restaurantId === 'demo-restaurant')) {
    // ... demo data ...
  }

  const table = await db.getTableByNumber(restaurantId, String(tableNumber));
  if (!table) return null;

  // ISPRAVAK: Tražimo AKTIVAN ili PARCIJALAN račun, ne plaćene
  const billWithItems = await db.getActiveBillForTable(restaurantId, table.id);
  
  // Nema aktivnog računa — stol je slobodan ili još nema narudžbe
  if (!billWithItems) return null;

  const unpaidItems = (billWithItems.items || []).filter(
    i => parseFloat(i.quantity_remaining) > 0
  );

  // Sve stavke su plaćene na aktivnom računu → zatvori račun
  if (unpaidItems.length === 0) {
    await db.closeBill(billWithItems.id);
    return { fullyPaid: true, message: 'This bill has been fully paid. Thank you!' };
  }

  const restaurant_row = await db.getRestaurantById(restaurantId);
  
  const unpaidSubtotalCents = unpaidItems.reduce(
    (s, i) => s + Math.round(Math.round(Number(i.unit_price) * 100) * Number(i.quantity_remaining)),
    0
  );

  return {
    ...billWithItems,
    _id: billWithItems.id,
    tableNumber,
    restaurant: { 
      _id: restaurantId, 
      name: restaurant_row?.name, 
      address: restaurant_row?.address, 
      phone: restaurant_row?.phone 
    },
    items: unpaidItems.map(i => ({ ...i, _id: i.id, price: parseFloat(i.unit_price), isPaid: false })),
    subtotal: Number((unpaidSubtotalCents / 100).toFixed(2)),
    totalAmount: Number(((unpaidSubtotalCents + Math.round(Number(billWithItems.tax_amount || 0) * 100)) / 100).toFixed(2)),
  };
};

const getAllBills = async (filters = {}) => {
  const db = getDB();
  const dbFilters = {};
  if (filters.restaurant) dbFilters.restaurant_id = filters.restaurant;
  if (filters.status) dbFilters.status = filters.status;
  if (filters.startDate) dbFilters.date_from = new Date(filters.startDate);
  if (filters.endDate) dbFilters.date_to = new Date(filters.endDate);

  const result = await db.getBills(dbFilters, { limit: Math.min(filters.limit || 100, 200), page: 1 });
  return result.data.map(b => ({ ...b, _id: b.id }));
};

const updateBill = async (billId, updateData, userId) => {
  const db = getDB();
  const existing = await db.getBillComplete(billId);
  if (!existing) throw new Error('Bill not found');

  const restaurant = await db.getRestaurantById(existing.restaurant_id);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id.toString() !== userId.toString()) throw new Error('Unauthorized to update this bill');

  if (updateData.items && Array.isArray(updateData.items)) {
    // BANK-LEVEL: Brišemo samo one stare stavke koje NISU već plaćene (inače bismo obrisali povijest plaćanja)
    // Zatim ubacujemo sve nove stavke poslane s POS-a
    await db.execute('DELETE FROM bill_items WHERE bill_id = $1 AND quantity_paid = 0', [billId]);

    // Očisti i saniraj ulazne stavke
    const validItems = updateData.items.filter(i => {
      const p = Number(i.price);
      const q = Number(i.quantity);
      return !isNaN(p) && !isNaN(q) && p >= 0 && q > 0;
    });

    if (validItems.length > 0) {
      await db.createBillItemsBatch(
        validItems.map(i => ({ bill_id: billId, name: i.name, unit_price: Number(i.price), quantity: Number(i.quantity) }))
      );
    }

    // Rekalkuliraj iznose pomoću svih stavki uz BANK-GRADE preciznost
    const allItems = await db.query('SELECT * FROM bill_items WHERE bill_id = $1', [billId]);
    const subtotalCents = allItems.reduce((s, i) => s + Math.round(Math.round(Number(i.unit_price) * 100) * Number(i.quantity)), 0);
    
    const rawTax = Number(updateData.tax || existing.tax_amount || 0);
    const taxCents = isNaN(rawTax) ? 0 : Math.round(rawTax * 100);

    await db.updateBill(billId, { 
        subtotal: Number((subtotalCents / 100).toFixed(2)), 
        tax_amount: Number((taxCents / 100).toFixed(2)), 
        total_amount: Number(((subtotalCents + taxCents) / 100).toFixed(2)) 
    });
  }

  return getBillById(billId);
};

const deleteBill = async (billId, userId) => {
  const db = getDB();
  const existing = await db.getBillById(billId);
  if (!existing) throw new Error('Bill not found');

  const restaurant = await db.getRestaurantById(existing.restaurant_id);
  if (restaurant?.owner_id.toString() !== userId.toString()) throw new Error('Unauthorized to delete this bill');

  const payments = await db.getPaymentsByBillId(billId);
  if (payments && payments.length > 0) {
    await db.updateBill(billId, { status: 'void' });
    return { message: 'Bill voided (has payments)', status: 'void' };
  }

  await db.deleteBill(billId);
  return { message: 'Bill deleted successfully' };
};

module.exports = { createBill, getBillById, getBillByRestaurantAndTable, getAllBills, updateBill, deleteBill };