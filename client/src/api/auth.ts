import api from './api';

// Description: Register a new restaurant user
// Endpoint: POST /api/auth/register
// Request: { email: string, password: string, restaurantName: string, tableCount?: number }
// Response: { success: boolean, message: string, token: string, restaurant: { _id: string, email: string, name: string, tableCount: number } }
export const registerUser = async (userData: { email: string; password: string; restaurantName: string; tableCount?: number }) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Login restaurant user
// Endpoint: POST /api/auth/login
// Request: { email: string, password: string }
// Response: { success: boolean, message: string, token: string, restaurant: { _id: string, email: string, name: string, tableCount: number } }
export const loginUser = async (credentials: { email: string; password: string }) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Logout current user
// Endpoint: POST /api/auth/logout
// Request: {}
// Response: { success: boolean, message: string }
export const logoutUser = async () => {
  try {
    const response = await api.post('/api/auth/logout');
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get current user information
// Endpoint: GET /api/auth/me
// Request: {}
// Response: { success: boolean, user: { _id: string, email: string, name: string, tableCount: number } }
export const getCurrentUser = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error: any) {
    throw new Error(error?.response?.data?.error || error.message);
  }
};