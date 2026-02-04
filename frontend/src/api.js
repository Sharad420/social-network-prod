import axios from "axios";
import { jwtDecode } from "jwt-decode";

/*
    Attaches the access token before every request, and the cookie containing the refresh token if the access token has expired.
*/
// Use the /api prefix to ensure consistent routing via nginx.

// Import api base for dev mode.
const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// Create API instance
const api = axios.create({
    baseURL:API_BASE,
    withCredentials: true,
    xsrfCookieName: 'csrftoken',
    xsrfHeaderName: 'X-CSRFToken',
});

// Attach tokens to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("access");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
})


// Handle the response
api.interceptors.response.use((response) => response, 
    async (error) => {
        const originalRequest = error.config;

        // 🚫 Never retry refresh itself
        if (originalRequest.url.includes("/token/refresh")) {
            return Promise.reject(error);
        }

        // Only retry once.
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                const res = await api.post("/token/refresh", 
                    {},
                );

                const newAccess = res.data.access;
                localStorage.setItem("access", newAccess);

                // Update header and retry
                originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                return api(originalRequest);
            } catch (refreshErr) {
                // Refresh failed → logout
                localStorage.removeItem("access");
                // localStorage.removeItem("refresh");
                window.location.href = "/login";
            }
        }
        return Promise.reject(error);
    }
);

export default api;
