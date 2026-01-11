import EmailOtpFlow from "./EmailOtpFlow";
import { RegistrationForm } from "../components/RegistrationForm";

export default function Register() {
    return (
        <EmailOtpFlow
            finalLabel="Welcome, human!"
            FinalForm={ RegistrationForm }
            apiType="register"
        />
    )
}