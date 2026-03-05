// server/services/billService.js
const { getDB } = require('../config/database');

// Pomoćna funkcija za generiranje jedinstvenog broja narudžbe (billa)
const generateBillNumber = async (db, restaurantId) => {
  const result = await db.query(
    `SELECT COUNT(*) + 1 AS next FROM bills WHERE restaurant_id = $1`,
    [restaurantId]
  );
  const nextNumber = result.rows ? result.rows[0].next : result[0].next;
  return `ORD-${String(nextNumber).padStart(6, '0')}`;
};

const createBill = async (billData) => {
  const { restaurant, tableNumber, items, tax = 0 } = billData;
  const db = getDB();

  const restaurant_row = await db.getRestaurantById(restaurant);
  if (!restaurant_row) throw new Error('Restaurant not found');

  const table = await db.getTableByNumber(restaurant, String(tableNumber));
  if (!table) throw new Error(`Table ${tableNumber} not found for this restaurant`);

  // Provjeri postoji li aktivan bill za taj stol
  const activeBill = await db.getActiveBillForTable(restaurant, table.id);
  if (activeBill) throw new Error('An active bill already exists for this table');

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const total_amount = subtotal + parseFloat(tax);

  // Generiraj jedinstveni broj narudžbe (zamjena za Mongoose pre-save)
  const billNumber = await generateBillNumber(db, restaurant);

  const bill = await db.createBill({
    restaurant_id: restaurant,
    table_id: table.id,
    bill_number: billNumber, // Ovdje ga ubacujemo u bazu
    subtotal,
    tax_amount: parseFloat(tax),
    total_amount,
    status: 'active'
  });

  const billItems = await db.createBillItemsBatch(
    items.map(i => ({ bill_id: bill.id, name: i.name, unit_price: i.price, quantity: i.quantity }))
  );

  console.log('Bill kreiran:', bill.id, 'Broj:', billNumber);
  
  // Vraćamo podatke onako kako ih frontend očekuje
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
    items: (bill.items || []).map(i => ({
      ...i, _id: i.id,
      price: parseFloat(i.unit_price),
      isPaid: parseFloat(i.quantity_remaining) <= 0,
    })),
  };
};

const getBillByRestaurantAndTable = async (restaurantId, tableNumber) => {
  const db = getDB();

  // Demo mode
  if (restaurantId === 'demo' || restaurantId === 'demo-restaurant') {
    return {
      _id: 'demo-bill-' + tableNumber,
      billNumber: 'ORD-DEMO',
      restaurant: { _id: 'demo-restaurant', name: 'Demo Restaurant', address: '123 Demo St', phone: '+385 1 234 5678' },
      tableNumber: parseInt(tableNumber),
      items: [
        { _id: 'i1', name: 'Grilled Salmon',      price: 24.99, quantity: 1, isPaid: false },
        { _id: 'i2', name: 'Caesar Salad',         price: 12.99, quantity: 1, isPaid: false },
        { _id: 'i3', name: 'Spaghetti Carbonara',  price: 18.99, quantity: 1, isPaid: false },
        { _id: 'i4', name: 'Tiramisu',             price:  8.99, quantity: 1, isPaid: false },
        { _id: 'i5', name: 'Red Wine',             price: 15.00, quantity: 2, isPaid: false },
      ],
      status: 'active', payments: [], tax: 0, subtotal: 95.96, totalAmount: 95.96,
      createdAt: new Date(), updatedAt: new Date(),
    };
  }

  const table = await db.getTableByNumber(restaurantId, String(tableNumber));
  if (!table) return null;

  // Provjeri je li plaćen
  const paidBills = await db.getBills({ restaurant_id: restaurantId, table_id: table.id, status: 'paid' }, { limit: 1 });
  if (paidBills.data && paidBills.data.length > 0) {
    return { fullyPaid: true, message: 'This bill has been fully paid. Thank you!' };
  }

  const billWithItems = await db.getActiveBillForTable(restaurantId, table.id);
  if (!billWithItems) return null;

  const unpaidItems = (billWithItems.items || []).filter(
    i => parseFloat(i.quantity_remaining) > 0
  );

  if (unpaidItems.length === 0) {
    await db.closeBill(billWithItems.id);
    return { fullyPaid: true, message: 'This bill has been fully paid. Thank you!' };
  }

  const restaurant_row = await db.getRestaurantById(restaurantId);
  const unpaidSubtotal = unpaidItems.reduce((s, i) => s + parseFloat(i.unit_price) * parseFloat(i.quantity_remaining), 0);

  return {
    ...billWithItems,
    _id: billWithItems.id,
    tableNumber,
    restaurant: { _id: restaurantId, name: restaurant_row?.name, address: restaurant_row?.address, phone: restaurant_row?.phone },
    items: unpaidItems.map(i => ({ ...i, _id: i.id, price: parseFloat(i.unit_price), isPaid: false })),
    subtotal: unpaidSubtotal,
    totalAmount: unpaidSubtotal + parseFloat(billWithItems.tax_amount || 0),
  };
};

const getAllBills = async (filters = {}) => {
  const db = getDB();
  const dbFilters = {};
  if (filters.restaurant)  dbFilters.restaurant_id = filters.restaurant;
  if (filters.status)      dbFilters.status = filters.status;
  if (filters.startDate)   dbFilters.date_from = new Date(filters.startDate);
  if (filters.endDate)     dbFilters.date_to   = new Date(filters.endDate);

  const result = await db.getBills(dbFilters, { limit: filters.limit || 100, page: 1 });
  return result.data.map(b => ({ ...b, _id: b.id }));
};

const updateBill = async (billId, updateData, userId) => {
  const db = getDB();
  const existing = await db.getBillById(billId);
  if (!existing) throw new Error('Bill not found');

  const restaurant = await db.getRestaurantById(existing.restaurant_id);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id !== userId.toString()) throw new Error('Unauthorized to update this bill');

  if (updateData.items) {
    // Ako imaš metodu za brisanje stavki, otkomentiraj ovo. 
    // Za sada pretpostavljamo da frontend šalje punu listu, pa ovo može ostati zakomentirano ako baza to već ne podržava
    // await db.deleteBillItemsByBillId(billId); 
    
    // Upozorenje: Ako ne brišemo stare stavke, ova donja linija će samo dodati nove, što može duplicirati račun!
    // Provjeri u database.js imaš li metodu za ažuriranje postojećih stavki.
    // await db.createBillItemsBatch(
    //   updateData.items.map(i => ({ bill_id: billId, name: i.name, unit_price: i.price, quantity: i.quantity }))
    // );
    
    const subtotal = updateData.items.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax = parseFloat(updateData.tax || 0);
    await db.updateBill(billId, { subtotal, tax_amount: tax, total_amount: subtotal + tax });
  }

  return getBillById(billId);
};

const deleteBill = async (billId, userId) => {
  const db = getDB();
  const existing = await db.getBillById(billId);
  if (!existing) throw new Error('Bill not found');

  const restaurant = await db.getRestaurantById(existing.restaurant_id);
  if (restaurant?.owner_id !== userId.toString()) throw new Error('Unauthorized to delete this bill');

  const payments = await db.getPaymentsByBillId(billId);
  if (payments && payments.length > 0) {
    await db.updateBill(billId, { status: 'void' });
    return { message: 'Bill voided (has payments)', status: 'void' };
  }

  await db.deleteBill(billId);
  return { message: 'Bill deleted successfully' };
};

module.exports = { createBill, getBillById, getBillByRestaurantAndTable, getAllBills, updateBill, deleteBill };