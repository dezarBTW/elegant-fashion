'use client'
import React from "react"
import { supabase } from "@/lib/supabaseClient";
import {useState, useEffect} from "react";
import { useRouter} from "next/navigation";
import styles from "./signup.css";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [username, setUsername] = useState("");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [countdown, setCountdown] = useState(5);
    const router = useRouter();

    const createUser = async () => {
        if (!email || !password || !username || !confirmPassword) {
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

        setLoading(true);
        setMessage("");

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/sign-in`
                }
            });

            if (error) {
                console.error(error);
                setMessage(error.message || "Error creating account");
            } else {
                setUser(data.user);
                const { data: userData, error: userError } = await supabase.from("users").insert([{
                    id: data.user.id,
                    username: username,
                    email: email
                }]);

                if (userError) {
                    console.error(userError);
                    setMessage("Error creating user profile");
                } else {
                    setShowConfirmation(true);
                    setMessage("Confirmation email sent! Please check your email to verify your account.");
                    // Start countdown for redirect
                    let count = 5;
                    const timer = setInterval(() => {
                        count--;
                        setCountdown(count);
                        if (count === 0) {
                            clearInterval(timer);
                            router.push("/sign-in");
                        }
                    }, 1000);
                }
            }
        } catch (error) {
            console.error(error);
            setMessage("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleManualRedirect = () => {
        router.push("/sign-in");
    };

    if (showConfirmation) {
        return (
            <div>
                <div className="logpage">
                    <div className="confirmation-message">
                        <div className="success-icon">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <h2>Check Your Email</h2>
                        <p>{message}</p>
                        <p className="countdown">Redirecting to sign-in in {countdown} seconds...</p>
                        <button className="sign-up-button" onClick={handleManualRedirect}>
                            Go to Sign In Now
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="logpage">
                <h2>Create an Account</h2>
                <p className="subtitle">Sign up to Elegant Fashion</p>
                {message && !showConfirmation && (
                    <div className="error-message">{message}</div>
                )}
                <div className="form-group">
                    <input className="input" onChange={(e) => setUsername(e.target.value)} type="text" placeholder="Username" />
                </div>
                <div className="form-group">
                    <input className="input" onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" />
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