import api from './api';

// Description: Get bill details for a restaurant table
// Endpoint: GET /api/bills/restaurant/:restaurantId/table/:tableNumber
// Request: { restaurantId: string, tableNumber: string }
// Response: { bill: { _id: string, restaurant: { _id: string, name: string, address: string, phone: string }, tableNumber: number, items: Array<{ _id: string, name: string, quantity: number, price: number, isPaid: boolean }>, subtotal: number, tax: number, totalAmount: number, status: string } } | { fullyPaid: boolean, message: string }
export const getBillDetails = async (restaurantId: string, tableNumber: string) => {
  try {
    const response = await api.get(`/api/bills/restaurant/${restaurantId}/table/${tableNumber}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    // If status is 410, the bill is fully paid - return the specific response
    if (error?.response?.status === 410) {
      return error.response.data;
    }
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get a single bill by ID
// Endpoint: GET /api/bills/:id
// Request: { id: string }
// Response: { bill: Bill }
export const getBillById = async (billId: string) => {
  try {
    const response = await api.get(`/api/bills/${billId}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get all bills with optional filters
// Endpoint: GET /api/bills
// Request: { restaurant?: string, status?: string, tableNumber?: number, startDate?: string, endDate?: string, limit?: number }
// Response: { bills: Array<Bill> }
export const getAllBills = async (filters?: {
  restaurant?: string;
  status?: string;
  tableNumber?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
}) => {
  try {
    const response = await api.get('/api/bills', { params: filters });
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Create a new bill
// Endpoint: POST /api/bills
// Request: { restaurant: string, tableNumber: number, items: Array<{ name: string, quantity: number, price: number }>, tax?: number, notes?: string }
// Response: { bill: Bill }
export const createBill = async (billData: {
  restaurant: string;
  tableNumber: number;
  items: Array<{ name: string; quantity: number; price: number }>;
  tax?: number;
  notes?: string;
}) => {
  try {
    const response = await api.post('/api/bills', billData);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Update a bill
// Endpoint: PUT /api/bills/:id
// Request: { items?: Array<Item>, tableNumber?: number, tax?: number, notes?: string, status?: string, payment?: Payment }
// Response: { bill: Bill }
export const updateBill = async (billId: string, updateData: {
  items?: Array<any>;
  tableNumber?: number;
  tax?: number;
  notes?: string;
  status?: string;
  payment?: {
    amount: number;
    tip: number;
    paymentMethod: string;
    transactionId: string;
    paidAt: Date;
    itemIds: string[];
  };
}) => {
  try {
    const response = await api.put(`/api/bills/${billId}`, updateData);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Delete a bill
// Endpoint: DELETE /api/bills/:id
// Request: { id: string }
// Response: { message: string } | { bill: Bill }
export const deleteBill = async (billId: string) => {
  try {
    const response = await api.delete(`/api/bills/${billId}`);
    return response.data;
  } catch (error: any) {
    console.error(error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};
