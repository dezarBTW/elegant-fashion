'use client'
import react from "react"
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";
import { useRouter} from "next/navigation";
import styles from "./login.css";




export default function SignIn() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetMessage, setResetMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handlesignIn = async () => {
        try{
         const { data, error} = await supabase.auth.signInWithPassword({email, password})
        if (error){
            setError("Invalid email or password.");
        }
        else {
            router.push("/")
        }
        }
        catch{
            setError("An error occurred while signing in.");
        }
    }

    const handleForgotPassword = async () => {
        if (!resetEmail) {
            setError("Please enter your email address.");
            return;
        }

        setLoading(true);
        setError("");
        setResetMessage("");

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/reset-password`,
            });

            if (error) {
                setError(error.message || "Error sending reset email.");
            } else {
                setResetMessage("Password reset email sent! Please check your email to reset your password.");
                setTimeout(() => {
                    setShowForgotPassword(false);
                    setResetMessage("");
                }, 5000);
            }
        } catch (error) {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (showForgotPassword) {
        return (
            <div>
                <div className="logpage">
                    <h2>Reset Password</h2>
                    <p className="subtitle">Enter your email to receive a password reset link</p>
                    {error && <div className="error-message">{error}</div>}
                    {resetMessage && <div className="success-message">{resetMessage}</div>}
                    <div className="form-group">
                        <input
                            className="input"
                            onChange={(e) => setResetEmail(e.target.value)}
                            type="email"
                            placeholder="Email"
                            value={resetEmail}
                        />
                    </div>
                    <button className="signin-btn" onClick={handleForgotPassword} disabled={loading}>
                        {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                    <button className="back-btn" onClick={() => setShowForgotPassword(false)}>
                        Back to Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="logpage">
                <h2>Welcome Back</h2>
                <p className="subtitle">Sign in to access your account</p>
                {error && <div className="error-message">{error}</div>}
                <div className="form-group">
                    <input className="input" onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" value={email} />
                </div>
                <div className="form-group">
                    <input className="input" onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" value={password} />
                </div>
                <button className="signin-btn" onClick={handlesignIn}>Sign In</button>
                <button className="forgot-password-btn" onClick={() => setShowForgotPassword(true)}>
                    Forgot Password?
                </button>
            </div>

        </div>
    )
}
