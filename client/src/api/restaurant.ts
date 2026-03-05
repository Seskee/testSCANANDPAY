import api from './api';
import { loginUser } from './auth';

// Restaurant Interface
export interface Restaurant {
  _id: string;
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  tableCount: number;
  ownerId: string;
  stripeAccountId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Description: Restaurant login (deprecated - use auth.ts loginUser instead)
// Endpoint: POST /api/auth/login
// Request: { email: string, password: string }
// Response: { success: boolean, token: string, restaurant: { _id: string, name: string, tableCount: number } }
export const restaurantLogin = async (credentials: { username: string; password: string }) => {
  // Convert username to email for backwards compatibility
  const loginCredentials = {
    email: credentials.username,
    password: credentials.password
  };

  try {
    const result = await loginUser(loginCredentials);
    return {
      success: result.success,
      token: result.token,
      restaurant: result.restaurant
    };
  } catch (error: any) {
    throw new Error(error.message);
  }
};

// Description: Create a new restaurant
// Endpoint: POST /api/restaurants
// Request: { name: string, description?: string, address?: object, phone?: string, email?: string, tableCount?: number }
// Response: { success: boolean, message: string, restaurant: Restaurant }
export const createRestaurant = async (data: {
  name: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  tableCount?: number;
}) => {
  try {
    const response = await api.post('/api/restaurants', data);
    return response.data;
  } catch (error: any) {
    console.error('Create restaurant error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get all restaurants (optionally filtered by current user)
// Endpoint: GET /api/restaurants
// Request: { myRestaurants?: boolean, includeInactive?: boolean }
// Response: { success: boolean, restaurants: Array<Restaurant> }
export const getRestaurants = async (params?: {
  myRestaurants?: boolean;
  includeInactive?: boolean;
}) => {
  try {
    const response = await api.get('/api/restaurants', { params });
    return response.data;
  } catch (error: any) {
    console.error('Get restaurants error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get a single restaurant by ID
// Endpoint: GET /api/restaurants/:id
// Request: {}
// Response: { success: boolean, restaurant: Restaurant }
export const getRestaurantById = async (id: string) => {
  try {
    const response = await api.get(`/api/restaurants/${id}`);
    return response.data;
  } catch (error: any) {
    console.error('Get restaurant by ID error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Update a restaurant
// Endpoint: PUT /api/restaurants/:id
// Request: { name?: string, description?: string, address?: object, phone?: string, email?: string, tableCount?: number, isActive?: boolean }
// Response: { success: boolean, message: string, restaurant: Restaurant }
export const updateRestaurant = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      country?: string;
    };
    phone?: string;
    email?: string;
    tableCount?: number;
    isActive?: boolean;
  }
) => {
  try {
    const response = await api.put(`/api/restaurants/${id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Update restaurant error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Delete a restaurant (soft delete by default, permanent if specified)
// Endpoint: DELETE /api/restaurants/:id
// Request: { permanent?: boolean }
// Response: { success: boolean, message: string }
export const deleteRestaurant = async (id: string, permanent: boolean = false) => {
  try {
    const response = await api.delete(`/api/restaurants/${id}`, {
      params: { permanent }
    });
    return response.data;
  } catch (error: any) {
    console.error('Delete restaurant error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get restaurant dashboard summary statistics
// Endpoint: GET /api/dashboard/summary
// Request: {}
// Response: { today: { revenue: number, tips: number, transactions: number, averageTransaction: number, change: number }, week: { revenue: number, transactions: number }, month: { revenue: number, transactions: number }, activeTables: number, totalTables: number }
export const getDashboardSummary = async () => {
  try {
    const response = await api.get('/api/dashboard/summary');
    return response.data;
  } catch (error: any) {
    console.error('Get dashboard summary error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get daily revenue for a specific date
// Endpoint: GET /api/dashboard/revenue/daily
// Request: { date?: string (ISO date) }
// Response: { date: string, totalRevenue: number, totalTips: number, transactionCount: number, averageTransaction: number }
export const getDailyRevenue = async (date?: string) => {
  try {
    const params = date ? { date } : {};
    const response = await api.get('/api/dashboard/revenue/daily', { params });
    return response.data;
  } catch (error: any) {
    console.error('Get daily revenue error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get monthly revenue with daily breakdown
// Endpoint: GET /api/dashboard/revenue/monthly
// Request: { month?: number (1-12), year?: number }
// Response: { month: number, year: number, totalRevenue: number, totalTips: number, transactionCount: number, averageTransaction: number, dailyBreakdown: Array<{ date: string, revenue: number, tips: number, transactions: number }> }
export const getMonthlyRevenue = async (month?: number, year?: number) => {
  try {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const response = await api.get('/api/dashboard/revenue/monthly', { params });
    return response.data;
  } catch (error: any) {
    console.error('Get monthly revenue error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get transaction history with filtering
// Endpoint: GET /api/dashboard/transactions
// Request: { startDate?: string, endDate?: string, status?: string, paymentMethod?: string, minAmount?: number, maxAmount?: number, tableNumber?: number, limit?: number, skip?: number }
// Response: { transactions: Array<{ _id: string, amount: number, tipAmount: number, totalAmount: number, status: string, paymentMethod: string, tableNumber: number, itemCount: number, stripePaymentIntentId: string, createdAt: string, updatedAt: string }>, pagination: { total: number, limit: number, skip: number, hasMore: boolean } }
export const getTransactionHistory = async (filters?: {
  startDate?: string;
  endDate?: string;
  status?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  tableNumber?: number;
  limit?: number;
  skip?: number;
}) => {
  try {
    const response = await api.get('/api/dashboard/transactions', { params: filters });
    return response.data;
  } catch (error: any) {
    console.error('Get transaction history error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// QR Code Interface
export interface QRCode {
  _id: string;
  restaurant: string;
  tableNumber: number;
  qrCodeUrl: string;
  qrCodeDataUrl: string;
  paymentUrl: string;
  encryptionKey: string;
  isActive: boolean;
  scannedCount: number;
  lastScannedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Description: Generate QR code for a single restaurant table
// Endpoint: POST /api/qrcodes/generate
// Request: { restaurantId: string, tableNumber: number }
// Response: { qrCode: QRCode }
export const generateQRCode = async (data: { restaurantId: string; tableNumber: number }) => {
  try {
    const response = await api.post('/api/qrcodes/generate', data);
    return response.data;
  } catch (error: any) {
    console.error('Generate QR code error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get all QR codes for a restaurant
// Endpoint: GET /api/qrcodes/restaurant/:restaurantId
// Request: {}
// Response: { qrCodes: Array<QRCode> }
export const getRestaurantQRCodes = async (restaurantId: string) => {
  try {
    const response = await api.get(`/api/qrcodes/restaurant/${restaurantId}`);
    return response.data;
  } catch (error: any) {
    console.error('Get restaurant QR codes error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Delete a QR code by ID
// Endpoint: DELETE /api/qrcodes/:qrCodeId
// Request: {}
// Response: { message: string, qrCode: { _id: string, isActive: boolean } }
export const deleteQRCode = async (qrCodeId: string) => {
  try {
    const response = await api.delete(`/api/qrcodes/${qrCodeId}`);
    return response.data;
  } catch (error: any) {
    console.error('Delete QR code error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Delete QR code by restaurant and table number
// Endpoint: DELETE /api/qrcodes/restaurant/:restaurantId/table/:tableNumber
// Request: {}
// Response: { message: string, qrCode: { _id: string, isActive: boolean } }
export const deleteQRCodeByTable = async (restaurantId: string, tableNumber: number) => {
  try {
    const response = await api.delete(`/api/qrcodes/restaurant/${restaurantId}/table/${tableNumber}`);
    return response.data;
  } catch (error: any) {
    console.error('Delete QR code by table error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Regenerate QR code for a table
// Endpoint: POST /api/qrcodes/regenerate
// Request: { restaurantId: string, tableNumber: number }
// Response: { qrCode: QRCode }
export const regenerateQRCode = async (data: { restaurantId: string; tableNumber: number }) => {
  try {
    const response = await api.post('/api/qrcodes/regenerate', data);
    return response.data;
  } catch (error: any) {
    console.error('Regenerate QR code error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Generate QR codes for restaurant tables (DEPRECATED - use generateQRCode for individual tables)
// Endpoint: POST /api/qrcodes/generate (called multiple times)
// Request: { restaurantId: string, tableCount: number }
// Response: { qrCodes: Array<{ table: number, url: string, qrCodeData: string }> }
export const generateQRCodes = async (data: { restaurantId: string; tableCount: number }) => {
  try {
    const qrCodes = [];
    // Generate QR codes for each table
    for (let i = 1; i <= data.tableCount; i++) {
      const result = await generateQRCode({ restaurantId: data.restaurantId, tableNumber: i });
      qrCodes.push({
        table: i,
        url: result.qrCode.paymentUrl,
        qrCodeData: result.qrCode.qrCodeDataUrl
      });
    }
    return { qrCodes };
  } catch (error: any) {
    console.error('Generate QR codes error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Update restaurant settings
// Endpoint: PUT /api/restaurants/:id
// Request: { name: string, tableCount: number }
// Response: { success: boolean, message: string, restaurant: Restaurant }
export const updateRestaurantSettings = async (data: { name: string; tableCount: number }) => {
  try {
    // Get restaurant ID from localStorage
    const restaurantData = localStorage.getItem('restaurant_data');
    if (!restaurantData) {
      throw new Error('Restaurant data not found. Please log in again.');
    }

    const { _id } = JSON.parse(restaurantData);
    const response = await api.put(`/api/restaurants/${_id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('Update restaurant settings error:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};
