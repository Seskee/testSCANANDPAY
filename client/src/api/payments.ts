import api from './api';

// Description: Create a payment intent for a bill
// Endpoint: POST /api/payments/create
// Request: { billId: string, items: Array<{ itemId: string, quantity: number }>, tip: number, paymentMethod: string, customerEmail?: string }
// Response: { paymentId: string, clientSecret: string, amount: number, totalAmount: number, currency: string }
export const createPayment = async (paymentData: {
  billId: string;
  items: Array<{ itemId: string; quantity: number }>;
  tip: number;
  paymentMethod: string;
  customerEmail?: string;
}) => {
  try {
    const payload = {
    ...paymentData,
    idempotencyKey: crypto.randomUUID()
    };
    const response = await api.post('/api/payments/create', payload);
    return response.data;
  } catch (error: any) {
    console.error('Error creating payment:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Confirm a payment after Stripe processing
// Endpoint: POST /api/payments/confirm/:paymentId
// Request: {}
// Response: { success: boolean, status: string, payment: object }
export const confirmPayment = async (paymentId: string) => {
  try {
    const response = await api.post(`/api/payments/confirm/${paymentId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error confirming payment:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get payment details by ID
// Endpoint: GET /api/payments/:paymentId
// Request: {}
// Response: { payment: object }
export const getPaymentById = async (paymentId: string) => {
  try {
    const response = await api.get(`/api/payments/${paymentId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting payment:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get payment by Stripe payment intent ID
// Endpoint: GET /api/payments/intent/:intentId
// Request: {}
// Response: { payment: object }
export const getPaymentByIntentId = async (intentId: string) => {
  try {
    const response = await api.get(`/api/payments/intent/${intentId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting payment by intent ID:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Refund a payment
// Endpoint: POST /api/payments/refund/:paymentId
// Request: { amount?: number }
// Response: { success: boolean, refund: object }
export const refundPayment = async (paymentId: string, amount?: number) => {
  try {
    const response = await api.post(`/api/payments/refund/${paymentId}`, { amount });
    return response.data;
  } catch (error: any) {
    console.error('Error refunding payment:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get payment statistics for a restaurant
// Endpoint: GET /api/payments/restaurant/:restaurantId/statistics
// Request: { startDate?: string, endDate?: string }
// Response: { statistics: object }
export const getPaymentStatistics = async (
  restaurantId: string,
  startDate?: string,
  endDate?: string
) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await api.get(
      `/api/payments/restaurant/${restaurantId}/statistics?${params.toString()}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Error getting payment statistics:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get all payments for a restaurant
// Endpoint: GET /api/payments/restaurant/:restaurantId
// Request: { status?: string, startDate?: string, endDate?: string, limit?: number }
// Response: { payments: array }
export const getRestaurantPayments = async (
  restaurantId: string,
  filters?: {
    status?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }
) => {
  try {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await api.get(
      `/api/payments/restaurant/${restaurantId}?${params.toString()}`
    );
    return response.data;
  } catch (error: any) {
    console.error('Error getting restaurant payments:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get public payment status for success verification
// Endpoint: GET /api/payments/status/:paymentId
export const getPaymentStatusPublic = async (paymentId: string) => {
  try {
    const response = await api.get(`/api/payments/status/${paymentId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error verifying payment status:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};