import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const ProtectedRoute = ({ children }) => {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return (
            <Navigate 
                to="/login" 
                replace 
                state={{ from: location.pathname, alert: "You must be logged in to view this page."}}
            />
        );
    }
    return children;
};

export default ProtectedRoute