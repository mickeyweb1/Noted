import axios from 'axios';

// Create an axios instance with a base URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// INTERCEPTOR: Automatically attach the JWT token to every request
api.interceptors.request.use(
    (config) => {
        // Get the token from localStorage (we will save it there during login)
        const token = localStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
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
        if (error.response?.status === 401) {
            // Token expired or invalid: clear storage and redirect to login
            localStorage.removeItem('userToken');
            localStorage.removeItem('userInfo');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;