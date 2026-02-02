import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

const GuestGuard = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return null;
    }

    if (isAuthenticated) {
        // If already logged in, return to home page, and replace the stack so that users cannot go back to the login screen.
        return <Navigate to="/" replace />;
    }

    return children;
};

export default GuestGuard;