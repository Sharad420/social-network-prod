import { useState, useEffect, version } from "react";
import axios from 'axios';
import { OTPForm } from "../components/InputOTPForm";
import { toast } from "sonner";
import authApi from "../authApi";



// Breaks the registration flow into 3 steps, send OTP, verify email and then enter username and password. 
export default function EmailOtpFlow({ finalLabel, FinalForm, apiType}) {
    const [step, setStep] = useState(1); // 1: email, 2: otp, 3: password
    const [email, setEmail] = useState("");
    const [verified, setVerified] = useState(false);
    const [verificationToken, setVerificationToken] = useState(null);

    const [message, setMessage] = useState("");

    

    // TODO: Check for unique email

    // Step 1: Send OTP
    const sendVerificationCode = async () => {
        // Regex to check email

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setMessage("Please enter a valid email address.");
            return;
        }
        
        try {
            await authApi.post("/send_verification", { email, type: apiType });
            setMessage("Verification code sent to your email.");
            setStep(2);
        } catch(err) {
            toast.error(err.response?.data?.error || "Failed to send verification code")
        }
    }

    // Keeping verify code here to seperate concerns.
    const verifyCode = (token) => {
        setVerified(true);
        setVerificationToken(token); // save token here
        setStep(3);
    };

    // Clear message on step 3
    useEffect(() => {
        if (step === 3) {
            setMessage("");
        }
    }, [step]);

    return (
        <div className="max-w-md mx-auto mt-10 p-6 border rounded shadow">
            <h2 className="text-2xl font-semibold mb-4">{ finalLabel }</h2>

            {step == 1 && (
                <>
                    <label className="block mb-1 font-medium">Enter your e-mail</label>
                    <input
                    type="text"
                    className="w-full border px-3 py-2 rounded mb-5"
                    placeholder="E-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    />
                    <button onClick={sendVerificationCode} className="bg-blue-500 text-white px-4 py-2 rounded">
                        Send Verification Code
                    </button>
                </>
            )}

            {step == 2 && (
                <OTPForm
                    email={email}
                    // Passing function reference
                    onVerified={ verifyCode }
                    apiType={ apiType }
                />
            )}

            {step == 3 && (
                <FinalForm token={verificationToken} />
            )}


            {/* Add more fields later here... */}
            {message && <div className="mt-3 text-sm text-gray-700">{message}</div>}
        </div>
    );
}

