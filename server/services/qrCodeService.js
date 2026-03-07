// server/services/qrCodeService.js
const { getDB } = require('../config/database');
const qrcode = require('qrcode');
const crypto = require('crypto');
const logger = require('../utils/logger');

const QR_SESSION_DURATION_MS = 15 * 60 * 1000; // 15 minuta
const generateSessionToken = () => crypto.randomBytes(24).toString('hex');

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const generateQRCode = async (restaurantId, tableNumber, userId) => {
  const db = getDB();

  const restaurant = await db.getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id !== userId.toString()) {
    logger.warn(`Unauthorized QR generation attempt by user ${userId} for restaurant ${restaurantId}`);
    throw new Error('Unauthorized');
  }

  const table = await db.getTableByNumber(restaurantId, String(tableNumber));
  if (!table) throw new Error('Table not found');

  await db.execute('UPDATE qr_codes SET is_active = false WHERE table_id = $1', [table.id]);

  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  const rawKey    = crypto.randomBytes(32).toString('hex');
  const hashedKey = hashToken(rawKey);
  const paymentUrl = `${frontendUrl}/pay/${rawKey}`;

  const qrImageDataUrl = await qrcode.toDataURL(paymentUrl, {
    errorCorrectionLevel: 'H', width: 512, margin: 2,
  });

  const qr = await db.createQRCode({
    restaurant_id: restaurantId,
    table_id:      table.id,
    qr_data:       hashedKey,
    qr_image_url:  qrImageDataUrl,
    format: 'png',
    size:   512,
  });

  logger.info(`QR Code generated for Restaurant ${restaurantId}, Table ${tableNumber}`);
  return { ...qr, _id: qr.id, tableNumber, paymentUrl };
};

const generateAllQRCodes = async (restaurantId, userId) => {
  const db = getDB();
  const restaurant = await db.getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id !== userId.toString()) throw new Error('Unauthorized');

  const tables = await db.getTablesByRestaurantId(restaurantId, true);
  const frontendUrl = process.env.CLIENT_URL || 'http://localhost:5173';
  const results = [];

  const chunkSize = 5;
  for (let i = 0; i < tables.length; i += chunkSize) {
    const chunk = tables.slice(i, i + chunkSize);

    const promises = chunk.map(async (table) => {
      await db.execute('UPDATE qr_codes SET is_active = false WHERE table_id = $1', [table.id]);

      const rawKey     = crypto.randomBytes(32).toString('hex');
      const hashedKey  = hashToken(rawKey);
      const paymentUrl = `${frontendUrl}/pay/${rawKey}`;

      const qrImageDataUrl = await qrcode.toDataURL(paymentUrl, {
        errorCorrectionLevel: 'H', width: 512, margin: 2,
      });

      const qr = await db.createQRCode({
        restaurant_id: restaurantId,
        table_id:      table.id,
        qr_data:       hashedKey,
        qr_image_url:  qrImageDataUrl,
        format: 'png',
        size:   512,
      });

      return { ...qr, _id: qr.id, tableNumber: table.table_number, paymentUrl };
    });

    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);

    await new Promise(resolve => setTimeout(resolve, 20));
  }

  logger.info(`Bulk generated ${results.length} QR codes for Restaurant ${restaurantId}`);
  return results;
};

// 🔒 ISPRAVAK N+1: Stari kod radio je zasebni getTableById() za svaki QR kod.
// Npr. 50 stolova = 51 DB querija (1 za QR listu + 50 za stolove).
// Novi kod: jedan JOIN query — uvijek 1 DB query bez obzira na broj stolova.
const getRestaurantQRCodes = async (restaurantId, userId) => {
  const db = getDB();
  const restaurant = await db.getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id !== userId.toString()) throw new Error('Unauthorized');

  // Jedan JOIN query umjesto N querija
  const rows = await db.query(
    `SELECT
       qr.id,
       qr.restaurant_id,
       qr.table_id,
       qr.qr_data,
       qr.qr_image_url,
       qr.format,
       qr.size,
       qr.download_count,
       qr.last_downloaded_at,
       qr.is_active,
       qr.created_at,
       t.table_number
     FROM qr_codes qr
     LEFT JOIN tables t ON qr.table_id = t.id
     WHERE qr.restaurant_id = $1
       AND qr.is_active = TRUE
     ORDER BY qr.created_at DESC`,
    [restaurantId]
  );

  return rows.map(row => ({
    ...row,
    _id: row.id,
    tableNumber: row.table_number,
  }));
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
  logger.info(`QR Code ${qrCodeId} deactivated`);
  return { ...updated, _id: updated.id };
};

const deleteQRCodeByTable = async (restaurantId, tableNumber, userId) => {
  const db = getDB();
  const restaurant = await db.getRestaurantById(restaurantId);
  if (!restaurant) throw new Error('Restaurant not found');
  if (restaurant.owner_id !== userId.toString()) throw new Error('Unauthorized');

  const table = await db.getTableByNumber(restaurantId, String(tableNumber));
  if (!table) throw new Error('Table not found');

  const qrs    = await db.getQRCodesByTableId(table.id);
  const active = qrs.find(q => q.is_active);
  if (!active) throw new Error('QR not found');

  const updated = await db.updateQRCode(active.id, { is_active: false });
  logger.info(`QR Code for Table ${tableNumber} deactivated`);
  return { ...updated, _id: updated.id };
};

const regenerateQRCode = async (restaurantId, tableNumber, userId) => {
  return generateQRCode(restaurantId, tableNumber, userId);
};

const validateQrScan = async (encryptionKey) => {
  const db = getDB();

  const hashedKey = hashToken(encryptionKey);
  const qr = await db.getQRCodeByData(hashedKey);

  if (!qr || !qr.is_active) {
    logger.warn(`Invalid or inactive QR scan attempt`);
    throw new Error('Invalid or inactive QR');
  }

  await db.incrementQRCodeDownloads(qr.id);

  const sessionToken = generateSessionToken();
  const expiresAt    = new Date(Date.now() + QR_SESSION_DURATION_MS);

  const bill = await db.getActiveBillForTable(qr.restaurant_id, qr.table_id);

  if (!bill) {
    const error = new Error('Na ovom stolu trenutno nema aktivnog računa.');
    error.status = 404;
    error.code   = 'NO_ACTIVE_BILL';
    throw error;
  }

  logger.info(`Successful QR scan for Table ${qr.table_number}`);

  return {
    sessionToken,
    expiresAt,
    restaurantId: qr.restaurant_id,
    tableNumber:  qr.table_number,
  };
};

module.exports = {
  generateQRCode,
  generateAllQRCodes,
  getRestaurantQRCodes,
  getQRCodeById,
  deleteQRCode,
  deleteQRCodeByTable,
  regenerateQRCode,
  validateQrScan
};