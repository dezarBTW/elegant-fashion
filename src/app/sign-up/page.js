'use client'
import React from "react"
import { supabase } from "@/lib/supabaseClient";
import {useState, useEffect} from "react";
import { useRouter} from "next/navigation";
import styles from "./signup.css";
import { consumeRateLimit, formatRetryMessage, sanitizeEmail, sanitizeText } from "@/lib/sanitizeInput";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const router = useRouter();

    const createUser = async () => {
        const safeEmail = sanitizeEmail(email);
        const safeUsername = sanitizeText(username);

        if (!safeEmail || !password || !safeUsername || !confirmPassword) {
            setMessage("Please fill in all fields");
            return;
        }

        if (password !== confirmPassword) {
            setMessage("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            setMessage("Password must be at least 6 characters");
            return;
        }

        const rateLimit = consumeRateLimit(`signup:${safeEmail}`, 20, 60 * 60 * 1000);
        if (!rateLimit.allowed) {
            setMessage(formatRetryMessage(rateLimit.retryAfterMs));
            return;
        }

        setLoading(true);
        setMessage("");

        try {
            const { data, error } = await supabase.auth.signUp({
                email: safeEmail,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/sign-in`,
                    data: {
                        username: safeUsername,
                    },
                }
            });

            if (error) {
                console.error(error);
                setMessage(error.message || "Error creating account");
            } else {
                setUser(data.user);
                router.push("/sign-in");
            }
        } catch (error) {
            console.error(error);
            setMessage("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="sign-up-page">
            <section className="logpage" aria-labelledby="sign-up-heading">
                <p className="eyebrow">Create your account</p>
                <h1 id="sign-up-heading">Join Elegant Fashion</h1>
                <p className="subtitle">Save your details and begin your fashion journey.</p>
                {message && <div className="error-message" role="alert">{message}</div>}
                <form onSubmit={(event) => { event.preventDefault(); createUser(); }}>
                    <div className="form-group">
                        <label htmlFor="username">Username <span>Cannot be changed later</span></label>
                        <input id="username" className="input" value={username} onChange={(e) => setUsername(sanitizeText(e.target.value))} type="text" autoComplete="username" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input id="email" className="input" value={email} onChange={(e) => setEmail(sanitizeEmail(e.target.value))} type="email" autoComplete="email" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input id="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="new-password" minLength="6" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirm password</label>
                        <input id="confirm-password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type="password" autoComplete="new-password" minLength="6" required />
                    </div>
                    <button className="sign-up-button" type="submit" disabled={loading}>
                        {loading ? "Creating Account..." : "Create account"}
                    </button>
                </form>
                <p className="sign-in-prompt">Already have an account? <a href="/sign-in">Sign in</a></p>
            </section>
        </main>
    )
}
