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
    return (
        <div>
            <div className="logpage">
                <h2>Welcome Back</h2>
                <p className="subtitle">Sign in to access your account</p>
                <div className="form-group">
                    <input className="input" onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" />
                </div>
                <div className="form-group">
                    <input className="input" onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
                </div>
                <button className="signin-btn" onClick={handlesignIn}>Sign In</button>
                <p>{error}</p>
            </div>

        </div>
    )
}
