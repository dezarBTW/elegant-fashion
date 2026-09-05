'use client'
import React from "react"
import { supabase } from "@/lib/supabaseClient";
import {useState, useEffect, useRef} from "react";
import { useRouter} from "next/navigation";
import styles from "./signup.css";
import { consumeRateLimit, formatRetryMessage, sanitizeEmail, sanitizeText } from "@/lib/sanitizeInput";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [username, setUsername] = useState("");
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [usernameMessage, setUsernameMessage] = useState("");
    const [checkingEmail, setCheckingEmail] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const router = useRouter();

    // Monotonically increasing request ids so a slow, older response can never
    // clobber the result of a newer one (fixes race condition on fast typing).
    const emailRequestId = useRef(0);
    const usernameRequestId = useRef(0);

    // Real-time availability check for email and username (debounced).
    useEffect(() => {
        const safeEmail = sanitizeEmail(email);
        const safeUsername = sanitizeText(username);

        // Clear stale results the instant a field becomes empty, instead of
        // only when BOTH fields are empty.
        if (!safeEmail) {
            setEmailMessage("");
            setCheckingEmail(false);
        }
        if (!safeUsername) {
            setUsernameMessage("");
            setCheckingUsername(false);
        }

        if (!safeEmail && !safeUsername) {
            return;
        }

        const timer = setTimeout(async () => {
            if (safeEmail) {
                const thisRequestId = ++emailRequestId.current;
                setCheckingEmail(true);
                const { data, error } = await supabase.rpc("check_email_exists", { check_email: safeEmail });
                // Only apply this result if it's still the latest request AND
                // the field hasn't changed to a different value in the meantime.
                if (thisRequestId === emailRequestId.current && sanitizeEmail(email) === safeEmail) {
                    if (error) {
                        console.error(error);
                        setEmailMessage("Unable to verify email right now.");
                    } else {
                        setEmailMessage(data ? "This email is already in use." : "");
                    }
                    setCheckingEmail(false);
                }
            }

            if (safeUsername) {
                const thisRequestId = ++usernameRequestId.current;
                setCheckingUsername(true);
                const { data, error } = await supabase.rpc("check_username_exists", { check_username: safeUsername });
                if (thisRequestId === usernameRequestId.current && sanitizeText(username) === safeUsername) {
                    if (error) {
                        console.error(error);
                        setUsernameMessage("Unable to verify username right now.");
                    } else {
                        setUsernameMessage(data ? "This username is already taken." : "");
                    }
                    setCheckingUsername(false);
                }
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [email, username]);

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

        // Final authoritative check for existing email or username right before
        // signup — this is the real safety net regardless of what the real-time
        // UI check showed, since it can't be bypassed by fast typing/network lag.
        const { data: conflicts, error: lookupError } = await supabase
            .rpc("check_signup_conflicts", { check_email: safeEmail, check_username: safeUsername })
            .single();

        if (lookupError) {
            console.error(lookupError);
            setMessage("Unable to verify details. Please try again.");
            setLoading(false);
            return;
        }

        if (conflicts?.email_taken || conflicts?.username_taken) {
            if (conflicts.email_taken && conflicts.username_taken) {
                setMessage("Both that email and username are already in use.");
            } else if (conflicts.email_taken) {
                setMessage("An account with that email already exists.");
            } else {
                setMessage("That username is already taken.");
            }
            setLoading(false);
            return;
        }

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

    const handleGoogleSignUp = async () => {
        setMessage("");
        setLoading(true);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });

            if (error) {
                setMessage(error.message || "Unable to sign up with Google. Please try again.");
                setLoading(false);
            }
            // On success the browser navigates to Google, so no further action here.
        } catch (error) {
            console.error("Google sign-up error:", error);
            setMessage("Unable to sign up with Google. Please try again.");
            setLoading(false);
        }
    };

    // Button stays disabled while a check is in flight, if either field has
    // a known conflict, or if either field is still empty — this prevents
    // submission before real-time verification has had a chance to run.
    const safeEmailValue = sanitizeEmail(email);
    const safeUsernameValue = sanitizeText(username);
    const isDisabled =
        loading ||
        checkingEmail ||
        checkingUsername ||
        !!emailMessage ||
        !!usernameMessage ||
        !safeEmailValue ||
        !safeUsernameValue ||
        !password ||
        !confirmPassword;

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
                        {checkingUsername && <p className="field-hint">Checking username...</p>}
                        {!checkingUsername && usernameMessage && <p className="field-error">{usernameMessage}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input id="email" className="input" value={email} onChange={(e) => setEmail(sanitizeEmail(e.target.value))} type="email" autoComplete="email" required />
                        {checkingEmail && <p className="field-hint">Checking email...</p>}
                        {!checkingEmail && emailMessage && <p className="field-error">{emailMessage}</p>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <div className="password-field">
                            <input id="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} autoComplete="new-password" minLength="6" required />
                            <button type="button" className="password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((prev) => !prev)}>
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirm-password">Confirm password</label>
                        <div className="password-field">
                            <input id="confirm-password" className="input" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" minLength="6" required />
                            <button type="button" className="password-toggle" aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"} onClick={() => setShowConfirmPassword((prev) => !prev)}>
                                {showConfirmPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    <button className="sign-up-button" type="submit" disabled={isDisabled}>
                        {loading ? "Creating Account..." : "Create account"}
                    </button>
                </form>

                <div className="divider">or</div>

                <button
                    type="button"
                    className="google-button"
                    onClick={handleGoogleSignUp}
                    disabled={loading}
                >
                    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                        <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.81 2.73v2.27h2.93c1.71-1.58 2.69-3.91 2.69-6.64z" />
                        <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.19l-2.93-2.27c-.81.55-1.85.87-3.03.87-2.33 0-4.31-1.58-5.02-3.7H.96v2.34C2.44 15.98 5.48 18 9 18z" />
                        <path fill="#FBBC05" d="M3.98 10.71c-.18-.55-.28-1.13-.28-1.71s.1-1.16.28-1.71V4.95H.96A8.99 8.99 0 000 9c0 1.45.35 2.83.96 4.05l3.02-2.34z" />
                        <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.6-2.6C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.02 2.34C4.69 5.16 6.67 3.58 9 3.58z" />
                    </svg>
                    {loading ? "Please wait..." : "Continue with Google"}
                </button>

                <p className="sign-in-prompt">Already have an account? <a href="/sign-in">Sign in</a></p>
            </section>
        </main>
    )
}
