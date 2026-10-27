import axios from 'axios';

// Create an axios instance with a base URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true,
    timeout: 60000,
    // ✅ REMOVED the global 'Content-Type': 'application/json' header
});

// INTERCEPTOR: Automatically attach the JWT token and set correct Content-Type
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // ✅ CRITICAL FIX: If we are uploading a file (FormData), let the browser 
        // set the Content-Type automatically so the multipart boundary is included.
        // Otherwise, default to application/json for normal API calls.
        if (!(config.data instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// INTERCEPTOR: Handle global errors (like token expiration)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestPath = error.config?.url?.split('?')[0];
        const isLoginRequest = requestPath?.endsWith('/auth/login');

        if (error.response?.status === 401 && !isLoginRequest) {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userInfo');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
