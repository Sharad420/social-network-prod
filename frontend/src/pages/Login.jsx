import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import axios from 'axios';
import { useAuth } from "../components/AuthContext";
import { toast } from "sonner";
import authApi from "../authApi";

export default function Login() {
    const { setUser } = useAuth();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");

    // to get the location where the alert came from and to redirect back to that page.
    const location = useLocation();
    const navigate = useNavigate();

    // If redirected from ProtectedRoute, show alert
    const alertMessage = location.state?.alert;
    const redirectTo = location.state?.from || "/";

    const handleSubmit = async(e) => {
        e.preventDefault();

        try {
            const response = await authApi.post(
                `/login`,
                { username, password },
                {
                    headers: {
                        "Content-Type": "application/json"
                    },
                    withCredentials: true,
                }
            );

            const data = response.data;

            localStorage.setItem("access", data.access);
            // Refresh token is not stored in local storage anymore, it is stored in a cookie.
            // localStorage.setItem("refresh", data.refresh);
            setUser({
                username: data.username,
                is_authenticated: true
            });
            toast.success(data.message);
            navigate(redirectTo);

        } catch (err) {
            if (err.response) {
                setMessage(err.response.data.error || "Login failed.")
            } else {
                setMessage("Something went wrong, try again.");
            }
            
        }
    }

    return (
        <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">Login</h2>
            <label className="block font-medium text-center mb-4">Speak, friend, and enter.</label>

            {/* Alert from ProtectedRoute */}
            {alertMessage && (
                <div className="mb-4 text-yellow-700 bg-yellow-100 p-3 rounded">
                    {alertMessage}
                </div>
            )}

            {/* Error message from failed login */}
            {message && (
                <div className="mb-4 text-red-700 bg-red-100 p-3 rounded">
                {message}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <input
                        type="text"
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                    />
                </div>
                <div>
                    <input
                        type="password"
                        className="w-full border px-3 py-2 rounded"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                <div className="mt-4 text-center text-sm">
                    <Link to="/forgotpassword" className="text-blue-600 hover:underline">
                        Forgot Password?
                    </Link>
                </div>
                <div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                    >
                        Login
                    </button>
                </div>
            </form>

            <div className="mt-4 text-center text-sm">
                Don’t have an account?{" "}
                <Link to="/register" className="text-blue-600 hover:underline">
                    Register here.
                </Link>
            </div>

        </div>
    );
}