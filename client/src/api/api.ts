import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import JSONbig from 'json-bigint';

const localApi = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status: number) => {
    return status >= 200 && status < 300;
  },
  transformResponse: [(data: any) => {
    if (typeof data === 'string') {
      try {
        return JSONbig.parse(data);
      } catch (e) {
        return data;
      }
    }
    return data;
  }]
});

// 1. Dodavanje tokena u svaki zahtjev
localApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('restaurant_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // IMPORTANT: Omogućava slanje HttpOnly cookieja (Refresh tokena) na backend
  config.withCredentials = true; 
  return config;
});

// 2. Pametni presretač za istekli token
localApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Ako je greška 401 (Unauthorized), a nismo još pokušali osvježiti token
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/api/auth/login')) {
      originalRequest._retry = true;

      try {
        // Zatraži novi Access Token (backend će pročitati HttpOnly cookie)
        const res = await axios.post('/api/auth/refresh', {}, {
          baseURL: originalRequest.baseURL,
          withCredentials: true // Obavezno da bi se poslao cookie
        });

        // Spremi novi token
        const newToken = res.data.token;
        localStorage.setItem('restaurant_token', newToken);

        // Ažuriraj header u originalnom zahtjevu i ponovi ga
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return localApi(originalRequest);
        
      } catch (refreshError) {
        // Ako refresh token ne valja (istekao nakon 7 dana ili obrisan), izbaci korisnika
        localStorage.removeItem('restaurant_token');
        window.location.href = '/login'; // Preusmjeri na login
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

const getApiInstance = () => {
  return localApi;
};

const api = {
  request: (config: AxiosRequestConfig) => {
    const apiInstance = getApiInstance();
    return apiInstance(config);
  },
  get: (url: string, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance();
    return apiInstance.get(url, config);
  },
  post: (url: string, data?: any, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance();
    return apiInstance.post(url, data, config);
  },
  put: (url: string, data?: any, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance();
    return apiInstance.put(url, data, config);
  },
  delete: (url: string, config?: AxiosRequestConfig) => {
    const apiInstance = getApiInstance();
    return apiInstance.delete(url, config);
  },
};

export default api;