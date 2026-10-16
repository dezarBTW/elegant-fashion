'use client'
import React from "react"
import { supabase } from "@/lib/supabaseClient";
import { CONFIRMATION_REDIRECT } from "@/lib/authLinks.mjs";
import {useState, useEffect, useRef} from "react";
import { useRouter} from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import "../auth-atelier.css";
import "../auth-extras.css";
import { consumeRateLimit, formatRetryMessage, sanitizeEmail } from "@/lib/sanitizeInput";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [emailMessage, setEmailMessage] = useState("");
    const [checkingEmail, setCheckingEmail] = useState(false);
    // Set once sign-up succeeds and the user must confirm their email.
    const [sentTo, setSentTo] = useState("");
    const [resending, setResending] = useState(false);
    const [resendMessage, setResendMessage] = useState("");
    const router = useRouter();

    // Monotonically increasing request ids so a slow, older response can never
    // clobber the result of a newer one (fixes race condition on fast typing).
    const emailRequestId = useRef(0);

    // Real-time email availability check (debounced).
    useEffect(() => {
        const safeEmail = sanitizeEmail(email);

        if (!safeEmail) {
            setEmailMessage("");
            setCheckingEmail(false);
        }

        if (!safeEmail) return;

        const timer = setTimeout(async () => {
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
        }, 400);

        return () => clearTimeout(timer);
    }, [email]);

    const createUser = async () => {
        const safeEmail = sanitizeEmail(email);

        if (!safeEmail || !password || !confirmPassword) {
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

        // Check email availability again immediately before signup.
        const { data: emailTaken, error: lookupError } = await supabase
            .rpc("check_email_exists", { check_email: safeEmail });

        if (lookupError) {
            console.error(lookupError);
            setMessage("Unable to verify details. Please try again.");
            setLoading(false);
            return;
        }

        if (emailTaken) {
            setMessage("An account with that email already exists.");
            setLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase.auth.signUp({
                email: safeEmail,
                password,
                options: {
                    // The confirmation link brings the user back here, which
                    // signs them in and sends them to the home page.
                    emailRedirectTo: CONFIRMATION_REDIRECT,
                }
            });

            if (error) {
                console.error(error);
                setMessage(error.message || "Error creating account");
            } else if (data?.session) {
                // Email confirmation is switched off in Supabase: the user is
                // already signed in, so go straight through.
                router.push("/sign-in");
            } else {
                // Confirmation required: ask the user to check their inbox.
                setSentTo(safeEmail);
            }
        } catch (error) {
            console.error(error);
            setMessage("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const resendConfirmation = async () => {
        if (!sentTo) return;

        const rateLimit = consumeRateLimit(`resend:${sentTo}`, 3, 60 * 60 * 1000);
        if (!rateLimit.allowed) {
            setResendMessage(formatRetryMessage(rateLimit.retryAfterMs));
            return;
        }

        setResending(true);
        setResendMessage("");

        try {
            const { error } = await supabase.auth.resend({
                type: "signup",
                email: sentTo,
                options: {
                    emailRedirectTo: CONFIRMATION_REDIRECT,
                },
            });

            setResendMessage(
                error
                    ? (error.message || "We couldn't resend the email. Please try again shortly.")
                    : "We've sent the confirmation email again."
            );
        } catch {
            setResendMessage("We couldn't resend the email. Please try again shortly.");
        } finally {
            setResending(false);
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

    // Keep submission disabled while email verification is pending or invalid.
    const safeEmailValue = sanitizeEmail(email);
    const isDisabled =
        loading ||
        checkingEmail ||
        !!emailMessage ||
        !safeEmailValue ||
        !password ||
        !confirmPassword;

    return (
        <main className="auth-page auth-signup-page">
            <section className="auth-media" aria-hidden="true">
                <Image
                    src="/images/Hero/image%20%2823%29.jpg"
                    alt=""
                    fill
                    priority
                    sizes="50vw"
                />
                <div className="auth-media-veil" />
                <div className="auth-media-copy">
                    <p>Elegant Style</p>
                    <h2>A wardrobe with a point of view.</h2>
                </div>
            </section>

            <section className="auth-panel" aria-labelledby="sign-up-heading">
                <div className="auth-panel-inner">
                {sentTo ? (
                    <>
                        <div className="auth-check" aria-hidden="true">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="5" width="18" height="14" rx="2" />
                                <path d="m3.5 7 8.5 6 8.5-6" />
                            </svg>
                        </div>
                        <h1 id="sign-up-heading">Check your email</h1>
                        <p className="auth-lede">
                            We&apos;ve sent a confirmation link to{" "}
                            <span className="auth-email-strong">{sentTo}</span>. Open it to
                            activate your account, then you&apos;re in.
                        </p>
                        <p className="auth-aside">You need to confirm your email before you can sign in.</p>
                        {resendMessage && <div className="auth-notice" role="status">{resendMessage}</div>}
                        <p className="auth-aside">
                            Can&apos;t see it? Check your spam folder, or{" "}
                            <button type="button" className="auth-link-button" onClick={resendConfirmation} disabled={resending}>
                                {resending ? "Sending..." : "Resend confirmation email"}
                            </button>
                            .
                        </p>
                        <p className="auth-switch">Wrong address? <Link href="/sign-up" onClick={() => { setSentTo(""); setResendMessage(""); }}>Start again</Link></p>
                    </>
                ) : (
                    <>
                <p className="auth-signup-eyebrow">Create your account</p>
                <h1 id="sign-up-heading">Join Elegant Style</h1>
                <p className="auth-lede">Save your details and begin your fashion journey.</p>
                {message && <div className="error-message" role="alert">{message}</div>}
                <form className="auth-form" onSubmit={(event) => { event.preventDefault(); createUser(); }}>
                    <div className="form-group">
                        <label htmlFor="email">Email address</label>
                        <input id="email" className="input" value={email} onChange={(e) => setEmail(sanitizeEmail(e.target.value))} type="email" autoComplete="email" aria-invalid={!!emailMessage} required />
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
                    <button className="auth-submit" type="submit" disabled={isDisabled}>
                        {loading ? "Creating Account..." : "Create account"}
                    </button>
                </form>

                <div className="auth-divider">or</div>

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

                <p className="auth-switch">Already have an account? <Link href="/sign-in">Sign in</Link></p>
                    </>
                )}
                </div>
            </section>
        </main>
    )
}
