import EmailOtpFlow from "./EmailOtpFlow";
import { PasswordResetForm } from "../components/PasswordResetForm";

export default function PasswordReset() {
    return (
        <EmailOtpFlow
            finalLabel="Reset your password."
            FinalForm={ PasswordResetForm }
            apiType="reset"
        />
    )
}