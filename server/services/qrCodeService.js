// server/services/qrCodeService.js
const { getDB } = require('../config/database');
const qrcode = require('qrcode');
const crypto = require('crypto');

const QR_SESSION_DURATION_MS = 15 * 60 * 1000;
const generateSessionToken = () => crypto.randomBytes(24).toString('hex');

const generateQRCode = async (restaurantId, tableNumber, userId) => {
  const db = getDB();

  const restaurant = await db.getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id !== userId.toString()) throw new Error('Unauthorized');

  const table = await db.getTableByNumber(restaurantId, String(tableNumber));
  if (!table) throw new Error('Table not found');

  const existing = await db.getQRCodesByTableId(table.id);
  const activeQR = existing.find(q => q.is_active);
  if (activeQR) return { ...activeQR, _id: activeQR.id, tableNumber };

  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const encryptionKey = crypto.randomBytes(32).toString('hex');
  const paymentUrl = `${frontendUrl}/pay/${encryptionKey}`;

  const qrImageDataUrl = await qrcode.toDataURL(paymentUrl, {
    errorCorrectionLevel: 'H', width: 512, margin: 2,
  });

  const qr = await db.createQRCode({
    restaurant_id: restaurantId,
    table_id: table.id,
    qr_data: encryptionKey,
    qr_image_url: qrImageDataUrl,
    format: 'png',
    size: 512,
  });

  return { ...qr, _id: qr.id, tableNumber };
};

const getRestaurantQRCodes = async (restaurantId, userId) => {
  const db = getDB();
  const restaurant = await db.getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id !== userId.toString()) throw new Error('Unauthorized');

  const qrs = await db.getQRCodesByRestaurantId(restaurantId);
  const enriched = await Promise.all(qrs.map(async qr => {
    if (qr.table_id) {
      const table = await db.getTableById(qr.table_id);
      return { ...qr, _id: qr.id, tableNumber: table?.table_number };
    }
    return { ...qr, _id: qr.id };
  }));
  return enriched.filter(q => q.is_active);
};

const getQRCodeById = async (qrCodeId, userId) => {
  const db = getDB();
  const qr = await db.getQRCodeWithTable(qrCodeId);
  if (!qr) throw new Error('QR not found');
  const restaurant = await db.getRestaurantById(qr.restaurant_id);
  if (restaurant?.owner_id !== userId.toString()) throw new Error('Unauthorized');
  return { ...qr, _id: qr.id };
};

const deleteQRCode = async (qrCodeId, userId) => {
  const db = getDB();
  const qr = await db.getQRCodeById(qrCodeId);
  if (!qr) throw new Error('QR not found');
  const restaurant = await db.getRestaurantById(qr.restaurant_id);
  if (restaurant?.owner_id !== userId.toString()) throw new Error('Unauthorized');
  const updated = await db.updateQRCode(qrCodeId, { is_active: false });
  return { ...updated, _id: updated.id };
};

const deleteQRCodeByTable = async (restaurantId, tableNumber, userId) => {
  const db = getDB();
  const restaurant = await db.getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id !== userId.toString()) throw new Error('Unauthorized');

  const table = await db.getTableByNumber(restaurantId, String(tableNumber));
  if (!table) throw new Error('Table not found');

  const qrs = await db.getQRCodesByTableId(table.id);
  const active = qrs.find(q => q.is_active);
  if (!active) throw new Error('QR not found');

  const updated = await db.updateQRCode(active.id, { is_active: false });
  return { ...updated, _id: updated.id };
};

const regenerateQRCode = async (restaurantId, tableNumber, userId) => {
  const db = getDB();
  const table = await db.getTableByNumber(restaurantId, String(tableNumber));
  if (table) {
    const qrs = await db.getQRCodesByTableId(table.id);
    for (const qr of qrs) {
      await db.deleteQRCode(qr.id);
    }
  }
  return generateQRCode(restaurantId, tableNumber, userId);
};

// --- FIX: NEMA VIŠE DUH RAČUNA ---
const validateQrScan = async (encryptionKey) => {
  const db = getDB();

  const qr = await db.getQRCodeByData(encryptionKey);
  if (!qr || !qr.is_active) throw new Error('Invalid or inactive QR');

  await db.incrementQRCodeDownloads(qr.id);

  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + QR_SESSION_DURATION_MS);

  // Provjeri postoji li aktivan račun za ovaj stol
  let bill = await db.getActiveBillForTable(qr.restaurant_id, qr.table_id);
  
  if (!bill) {
    // Umjesto kreiranja praznog računa, bacamo grešku.
    // Frontend će ovo uhvatiti i prikazati poruku gostu.
    const error = new Error('Na ovom stolu trenutno nema aktivnog računa.');
    error.status = 404;
    error.code = 'NO_ACTIVE_BILL'; 
    throw error;
  }

  // Ako račun postoji, vraćamo njegove podatke
  return {
    sessionToken, 
    expiresAt,
    restaurantId: qr.restaurant_id,
    tableNumber: qr.table_number,
    billId: bill.id,
  };
};

module.exports = { 
  generateQRCode, 
  getRestaurantQRCodes, 
  getQRCodeById, 
  deleteQRCode, 
  deleteQRCodeByTable, 
  regenerateQRCode, 
  validateQrScan 
};