import api from './api';

// Description: Send receipt via email
// Endpoint: POST /api/receipts/send-email
// Request: { email: string, paymentId?: string, receiptId?: string }
// Response: { success: boolean, message: string, messageId: string, simulated?: boolean }
export const sendReceipt = async (data: { email: string; paymentId?: string; receiptId?: string }) => {
  try {
    const response = await api.post('/api/receipts/send-email', data);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Generate a receipt for a completed payment
// Endpoint: POST /api/receipts/generate
// Request: { paymentId: string, customerEmail?: string }
// Response: { success: boolean, receipt: Receipt }
export const generateReceipt = async (data: { paymentId: string; customerEmail?: string }) => {
  try {
    const response = await api.post('/api/receipts/generate', data);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get receipt by ID
// Endpoint: GET /api/receipts/:receiptId
// Request: {}
// Response: { success: boolean, receipt: Receipt }
export const getReceiptById = async (receiptId: string) => {
  try {
    const response = await api.get(`/api/receipts/${receiptId}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get receipt by receipt number
// Endpoint: GET /api/receipts/number/:receiptNumber
// Request: {}
// Response: { success: boolean, receipt: Receipt }
export const getReceiptByNumber = async (receiptNumber: string) => {
  try {
    const response = await api.get(`/api/receipts/number/${receiptNumber}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get receipt by payment ID
// Endpoint: GET /api/receipts/payment/:paymentId
// Request: {}
// Response: { success: boolean, receipt: Receipt }
export const getReceiptByPaymentId = async (paymentId: string) => {
  try {
    const response = await api.get(`/api/receipts/payment/${paymentId}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Resend receipt email
// Endpoint: POST /api/receipts/:receiptId/resend
// Request: { email?: string }
// Response: { success: boolean, message: string, messageId: string, simulated?: boolean }
export const resendReceipt = async (receiptId: string, data?: { email?: string }) => {
  try {
    const response = await api.post(`/api/receipts/${receiptId}/resend`, data || {});
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get all receipts for a restaurant
// Endpoint: GET /api/receipts/restaurant/:restaurantId
// Request: { limit?: number, skip?: number, startDate?: string, endDate?: string, status?: string }
// Response: { success: boolean, receipts: Array<Receipt>, total: number, limit: number, skip: number }
export const getRestaurantReceipts = async (restaurantId: string, params?: {
  limit?: number;
  skip?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}) => {
  try {
    const response = await api.get(`/api/receipts/restaurant/${restaurantId}`, { params });
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get receipt statistics for a restaurant
// Endpoint: GET /api/receipts/restaurant/:restaurantId/statistics
// Request: { startDate?: string, endDate?: string }
// Response: { success: boolean, statistics: ReceiptStatistics }
export const getReceiptStatistics = async (restaurantId: string, params?: {
  startDate?: string;
  endDate?: string;
}) => {
  try {
    const response = await api.get(`/api/receipts/restaurant/${restaurantId}/statistics`, { params });
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};
