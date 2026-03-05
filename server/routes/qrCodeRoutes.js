const express = require('express');
const router = express.Router();
const qrCodeService = require('../services/qrCodeService');
const { authenticateToken } = require('./middleware/auth');

/* =========================================================
   🔐 ADMIN / OWNER ROUTES (AUTH REQUIRED)
========================================================= */

// Generate QR code
// POST /api/qrcodes/generate
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.body;

    if (!restaurantId || !tableNumber) {
      return res.status(400).json({ error: 'Restaurant ID and table number are required' });
    }

    if (typeof tableNumber !== 'number' || tableNumber < 1) {
      return res.status(400).json({ error: 'Table number must be a positive integer' });
    }

    const qrCode = await qrCodeService.generateQRCode(
      restaurantId,
      tableNumber,
      req.user.id
    );

    return res.status(201).json({ qrCode });
  } catch (error) {
    console.error('Generate QR error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// ISPRAVLJENO: Dodana ruta za bulk generiranje QR kodova kako bi se izbjegao Rate Limiting i ubrzao proces
// POST /api/qrcodes/generate-all
router.post('/generate-all', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.body;

    if (!restaurantId) {
      return res.status(400).json({ error: 'Restaurant ID is required' });
    }

    // Pozivamo bulk funkciju iz servisa
    const qrCodes = await qrCodeService.generateAllQRCodes(restaurantId, req.user.id);

    return res.status(201).json({ 
      message: 'QR codes generated successfully',
      qrCodes 
    });
  } catch (error) {
    console.error('Generate all QR codes error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Get all QR codes for restaurant
// GET /api/qrcodes/restaurant/:restaurantId
router.get('/restaurant/:restaurantId', authenticateToken, async (req, res) => {
  try {
    const { restaurantId } = req.params;

    const qrCodes = await qrCodeService.getRestaurantQRCodes(
      restaurantId,
      req.user.id
    );

    return res.status(200).json({ qrCodes });
  } catch (error) {
    console.error('Fetch QR codes error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Get QR code by ID
// GET /api/qrcodes/:qrCodeId
router.get('/:qrCodeId', authenticateToken, async (req, res) => {
  try {
    const { qrCodeId } = req.params;

    const qrCode = await qrCodeService.getQRCodeById(
      qrCodeId,
      req.user.id
    );

    return res.status(200).json({ qrCode });
  } catch (error) {
    console.error('Fetch QR error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Delete QR code by ID (soft delete)
// DELETE /api/qrcodes/:qrCodeId
router.delete('/:qrCodeId', authenticateToken, async (req, res) => {
  try {
    const { qrCodeId } = req.params;

    const qrCode = await qrCodeService.deleteQRCode(
      qrCodeId,
      req.user.id
    );

    return res.status(200).json({
      message: 'QR code deleted successfully',
      qrCode: {
        _id: qrCode._id,
        isActive: qrCode.isActive
      }
    });
  } catch (error) {
    console.error('Delete QR error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

// Delete QR by restaurant + table
// DELETE /api/qrcodes/restaurant/:restaurantId/table/:tableNumber
router.delete(
  '/restaurant/:restaurantId/table/:tableNumber',
  authenticateToken,
  async (req, res) => {
    try {
      const { restaurantId, tableNumber } = req.params;
      const tableNum = parseInt(tableNumber, 10);

      if (isNaN(tableNum) || tableNum < 1) {
        return res.status(400).json({ error: 'Invalid table number' });
      }

      const qrCode = await qrCodeService.deleteQRCodeByTable(
        restaurantId,
        tableNum,
        req.user.id
      );

      return res.status(200).json({
        message: 'QR code deleted successfully',
        qrCode: {
          _id: qrCode._id,
          isActive: qrCode.isActive
        }
      });
    } catch (error) {
      console.error('Delete QR by table error:', error.message);
      return res.status(500).json({ error: error.message });
    }
  }
);

// Regenerate QR code
// POST /api/qrcodes/regenerate
router.post('/regenerate', authenticateToken, async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.body;

    if (!restaurantId || !tableNumber) {
      return res.status(400).json({ error: 'Restaurant ID and table number are required' });
    }

    if (typeof tableNumber !== 'number' || tableNumber < 1) {
      return res.status(400).json({ error: 'Table number must be a positive integer' });
    }

    const qrCode = await qrCodeService.regenerateQRCode(
      restaurantId,
      tableNumber,
      req.user.id
    );

    return res.status(201).json({ qrCode });
  } catch (error) {
    console.error('Regenerate QR error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/* =========================================================
   🔓 PUBLIC GUEST QR SCAN (NO AUTH)
========================================================= */

// GET /api/qrcodes/scan/:encryptionKey
router.get('/scan/:encryptionKey', async (req, res) => {
  try {
    const { encryptionKey } = req.params;

    if (!encryptionKey) {
      return res.status(400).json({ error: 'Encryption key is required' });
    }

    const session = await qrCodeService.validateQrScan(encryptionKey);

    return res.status(200).json({
      success: true,
      session
    });
  } catch (error) {
    console.error('QR scan error:', error.message);
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;