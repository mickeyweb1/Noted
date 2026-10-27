import axios from 'axios';

// Create an axios instance with a base URL
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
    withCredentials: true,
    timeout: 60000,
    // ✅ REMOVED the global 'Content-Type': 'application/json' header
});

// Hydrate the default immediately so requests made during the first render have a token.
const initialToken = typeof window !== 'undefined' ? localStorage.getItem('userToken') : null;
if (initialToken) api.defaults.headers.common.Authorization = `Bearer ${initialToken}`;

// INTERCEPTOR: Automatically attach the JWT token and set correct Content-Type
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('userToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization;
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
        const requestPath = error.config?.url?.split('?')[0] || '';
        const isAuthEntryRequest = /\/auth\/(login|register|claim|validate-code)$/.test(requestPath);
        const authorization = error.config?.headers?.Authorization
            || error.config?.headers?.get?.('Authorization');
        const requestToken = typeof authorization === 'string' ? authorization.replace(/^Bearer\s+/i, '') : '';
        const currentToken = localStorage.getItem('userToken');

        // Only expire the exact session that made this request. A delayed 401 from a
        // startup request must never erase a newer token established by a fresh login.
        if (error.response?.status === 401 && !isAuthEntryRequest && requestToken && requestToken === currentToken) {
            localStorage.removeItem('userToken');
            localStorage.removeItem('userInfo');
            delete api.defaults.headers.common.Authorization;
            window.dispatchEvent(new CustomEvent('noted:auth-expired', { detail: { token: requestToken } }));
        }
        return Promise.reject(error);
    }
);

export default api;
