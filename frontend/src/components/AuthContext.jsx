import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { toast } from "sonner";
import { Navigate, useNavigate } from "react-router-dom";
import api from "../api";

/*
    Performed before every page load, sends access token/refresh cookie to the backend to obtain user information(CONTEXT) and inject it into every React component, so that user navigation is seamless.
*/

const AuthContext = createContext();

export function AuthProvider({ children }) {
    // Test refresh
    const testRefresh = async () => {
        try {
            const res = await axios.post(
            "https://127.0.0.1:8000/token/refresh",
            {}, // no body, backend should read refresh token from cookie
            { withCredentials: true }
            );
            console.log("✅ Success:", res.data);
        } catch (err) {
            console.error("❌ Error refreshing:", err.response?.data || err.message);
        }
    };
    window.testRefresh = testRefresh;

    // Sets the { is_authenticated, username } states.
    const [user, setUser] = useState(null);


    // For displaying the loading animation until we sort out the authentication.
    const [loading, setLoading] = useState(true);

    const logout = async () => {
        // If already logged out, do nothing
        if (!user || user.is_authenticated === false) return;
        
        try {
            await api.post("/logout");
            // const refresh = localStorage.getItem("refresh");
            // if (refresh) {
            //     await axios.post("https://127.0.0.1:8000/logout", { refresh }, {
            //         headers: {
            //             Authorization: `Bearer ${localStorage.getItem("access")}`,
            //         }
            //     });
            // }
        } catch (err) {
            console.error("Logout API failed:", err);
            toast.error("Something went wrong, please try again.");
        } finally {
            localStorage.removeItem("access");
            setUser(null);
        }
    }

    // refresh token helper
    // Currently handling both local store and cookies
    // Try after HTTPS, potential issue.
    const refreshAccessToken = async () => {
        try {
            console.log(refresh ? "🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵 Using localStorage refresh" : "🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢🟢 Using cookie refresh");
            const res = await axios.post("https://127.0.0.1:8000/token/refresh", 
                {}, 
                { withCredentials: true }
            );
            localStorage.setItem("access", res.data.access)
            return res.data.access;
        } catch(err) {
            logout();
            console.error("REFRESH ERROR:", err);
            return null;
        }
    }

    // Load current user on mount, with refresh token logic.
    useEffect(() => {
        const checkAuth = async () => {
            // If token is deleted or does not exist, not valid
            let token = localStorage.getItem("access")
            if (!token) {
                setUser(null)
                setLoading(false)
                return
            }

            // Check if token is expired, if it is, get refresh token
            try {
                const decoded = jwtDecode(token);
                const now = Date.now() / 1000;
                if (decoded.exp < now) {
                    token = await refreshAccessToken()
                    // if you get no token, immediate logout
                    if (!token) {
                        logout();
                        setLoading(false);
                        return;
                    }
                }
            } catch (err) {
                logout() 
                console.error("REFRESH ERROR:", err);
                setLoading(false)
                return
            }

            // Fetch user info from backend
            try {
                const res = await axios.get("https://127.0.0.1:8000/user", {
                    headers: { Authorization: `Bearer ${token}` }
                })
                setUser(res.data)// { is_authenticated, username }
            } catch (err) {
                logout()
            } finally {
                setLoading(false)
            }
        }

        checkAuth()
    }, []) // on mount/remount run this

    // Provide the user, isAuthneticated for ease, setUser hook and logout function.
    const value = {
        user, 
        isAuthenticated: user?.is_authenticated || false, 
        setUser, 
        logout
    }

    // Injects values into any react component's context system.
    return (
        <AuthContext.Provider value={ value }>
            {loading ? <p>Loading...</p> : children}
        </AuthContext.Provider>
    )
}


// Convenience wrapper
export function useAuth() {
    return useContext(AuthContext)
}



// Instead of writing:
// const { user, isAuthenticated, logout } = useContext(AuthContext)
// you can write:
// const { user, isAuthenticated, logout } = useAuth()





