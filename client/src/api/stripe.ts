import api from './api';

// Description: Start Stripe Connect onboarding for a restaurant
// Endpoint: POST /api/stripe/connect/onboard
// Request: { restaurantId: string, refreshUrl: string, returnUrl: string }
// Response: { url: string, accountId: string }
export const startStripeOnboarding = async (data: {
  restaurantId: string;
  refreshUrl: string;
  returnUrl: string
}) => {
  try {
    const response = await api.post('/api/stripe/connect/onboard', data);
    return response.data;
  } catch (error: any) {
    console.error('Error starting Stripe onboarding:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Check Stripe Connect account status
// Endpoint: GET /api/stripe/connect/status/:restaurantId
// Request: {}
// Response: { accountId: string, chargesEnabled: boolean, payoutsEnabled: boolean, detailsSubmitted: boolean, onboardingComplete: boolean }
export const checkStripeStatus = async (restaurantId: string) => {
  try {
    const response = await api.get(`/api/stripe/connect/status/${restaurantId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error checking Stripe status:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Create Stripe Express dashboard login link
// Endpoint: POST /api/stripe/connect/dashboard
// Request: { restaurantId: string }
// Response: { url: string }
export const getStripeDashboardLink = async (restaurantId: string) => {
  try {
    const response = await api.post('/api/stripe/connect/dashboard', { restaurantId });
    return response.data;
  } catch (error: any) {
    console.error('Error getting Stripe dashboard link:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};

// Description: Get Stripe account balance
// Endpoint: GET /api/stripe/connect/balance/:restaurantId
// Request: {}
// Response: { available: array, pending: array }
export const getStripeBalance = async (restaurantId: string) => {
  try {
    const response = await api.get(`/api/stripe/connect/balance/${restaurantId}`);
    return response.data;
  } catch (error: any) {
    console.error('Error getting Stripe balance:', error);
    throw new Error(error?.response?.data?.error || error.message);
  }
};
