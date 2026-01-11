import axios from "axios";
import { jwtDecode } from "jwt-decode";

/*
    Attaches the access token before every request, and the cookie containing the refresh token if the access token has expired.
*/

// Create API instance
const api = axios.create({
    baseURL:"https://127.0.0.1:8000",
    withCredentials: true
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
