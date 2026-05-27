'use client'
import React from "react"
import { supabase } from "@/lib/supabaseClient";
import {useState, useEffect} from "react";
import { useRouter} from "next/navigation";
import styles from "./signup.css";

export default function SignUp() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [user, setUser] = useState(null);
    const router = useRouter();


    const createUser = async () => {
        const { data, error} = await supabase.auth.signUp({email, password})
        if (error) {
            console.error(error);
        }
        else {
            setUser(data.user);
            const { data: userData, error} = await supabase.from("users").insert([{id: data.user.id, username: username, email: email}])
            if (error) {
                console.error(error);
            }
            else {
                router.push("/sign-in");
            }
        }
    }
    return (
        <div>
            <div className="logpage">
                <h2>Create an Account</h2>
                <p className="subtitle">Sign up to Elegant Fashion</p>
                <div className="form-group">
                    <input className="input" onChange={(e) => setUsername(e.target.value)} type="text" placeholder="Username" />
                </div>
                <div className="form-group">
                    <input className="input" onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" />
                </div>
                <div className="form-group">
                    <input className="input" onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
                </div>
                <button className="sign-up-button" onClick={createUser} >Sign Up</button>
            </div>
            
        </div>
    )
}