import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import { toast } from "sonner";
import authApi from "../authApi";


export default function Logout() {
    // Just a holder for a function. Remember React is declarative, and also a functional programming language.
    const navigate = useNavigate();

    // Takes the logout function from AuthContext.
    const { logout } = useAuth();

    useEffect(() => {
        const performLogout = async () => {
            await logout();
            toast.info("You have been logged out.")
            navigate("/login", {replace: true}); // Replaces logout with login on browser history stack
        };
        performLogout();
    }, [logout, navigate]);

    return null;
}

    // useEffect here because React's recommneded way of providing logic after a render of this component is to use useEffect.
    // Don't need it here, because technically you can run this on render, since logout only happens once, but yeah it's recommended not to.

    // When you use a variable defined outside the useEffect body (like navigate, which comes from useNavigate()), 
    // React’s official ESLint plugin will warn you unless it’s in the dependency array.