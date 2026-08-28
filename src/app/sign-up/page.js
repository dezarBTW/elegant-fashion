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
        <div>
            <div className="logpage">
                <h2>Create an Account</h2>
                <p className="subtitle">Sign up to Elegant Fashion</p>
                {message && (
                    <div className="error-message">{message}</div>
                )}
                <div className="form-group">
                    <input className="input" onChange={(e) => setUsername(sanitizeText(e.target.value))} type="text" placeholder="Username(Cannot be changed after SignUp)" />
                </div>
                <div className="form-group">
                    <input className="input" onChange={(e) => setEmail(sanitizeEmail(e.target.value))} type="email" placeholder="Email" />
                </div>
                <div className="form-group">
                    <input className="input" onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
                </div>
                <div className="form-group">
                    <input className="input" onChange={(e) => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm Password" />
                </div>
                <button className="sign-up-button" onClick={createUser} disabled={loading}>
                    {loading ? "Creating Account..." : "Sign Up"}
                </button>
            </div>

        </div>
    )
}