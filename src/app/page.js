"use client";
import styles from "./page.module.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import Navbar from "@/components/Navbar";

export default function Home() {
  const [data, setData] = useState([]);
  const [user, setUser] = useState(null);
  const [userId, setUserId] = useState("");

  useEffect(() => {
    async function fetchstudents() {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("id", "d57821a7-28d2-41fe-a70f-ffae8b9a49ef");
      if (error) {
        console.error("Error fetching data:", error);
      } else {
        setData(data);
      }
    }

    const fetchuser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error(error);
      } else if (data.user) {
        setUserId(data.user.id);
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .single();
        setUser(userData);
      } else {
        setUser(null);
      }
    };

    fetchuser();
    fetchstudents();
  }, []);

  return (
    <div className={styles.container}>
      <Navbar />

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroOverlay}>
          <h1 className={styles.heroTitle}>Fashion That Defines You</h1>
          <p className={styles.heroSubtitle}>
            Limited Ready-to-Wear • Masterful Bespoke • Professional Fashion Training
          </p>
          <div className={styles.heroCTA}>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/ready-to-wear">Explore Collections</Link>
          </div>
        </div>
      </section>

      {/* Ready-to-Wear Section */}
      <section id="ready-to-wear" className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Limited-Edition Ready-to-Wear</h2>
          <p className={styles.sectionText}>
            Our limited-edition ready-to-wear collections help style-conscious young professionals who want to express individuality through fashion by reducing mass-produced sameness and increasing personal style confidence, unlike fast-fashion brands that prioritize trends over uniqueness.
          </p>
          <div className={styles.collectionGrid}>
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className={styles.collectionCard}>
                <div className={styles.collectionImage}></div>
                <h3>Collection {item}</h3>
                <button className={`${styles.btn} ${styles.btnSmall}`}>Shop Now</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fashion School Section */}
      <section id="fashion-school" className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Fashion & Design Training</h2>
          <p className={styles.sectionText}>
            Our fashion and design training delivers a fast, practical path to a professional career. Learn essential skills like sketching, pattern-making, CAD, trend forecasting, and sustainable design directly from industry experts. You'll build a standout portfolio through real-world projects and personalized mentorship, gaining the creative confidence, business know-how, and industry connections needed to land jobs at top brands, launch your own label, or freelance successfully.
          </p>
          <div className={styles.ctaGroup}>
            <Link href="/course" className={`${styles.btn} ${styles.btnPrimary}`}>Enroll Now</Link>
            <Link href="/about" className={`${styles.btn} ${styles.btnOutline}`}>View Curriculum</Link>
          </div>
        </div>
      </section>

      {/* Bespoke Section */}
      <section id="bespoke" className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>True Bespoke Couture</h2>
          <p className={styles.sectionText}>
            Our Bespoke is the premier destination for true bespoke fashion and design, where every garment is handcrafted from scratch as a one-of-a-kind masterpiece tailored exclusively to you. Specializing in custom-fitted suits, shirts, dresses, outerwear, and accessories, we combine centuries-old artisanal techniques, like precise individual pattern drafting, hand-stitching, and intricate finishing with contemporary style and premium fabrics to deliver unparalleled fit, elegance, and personal expression.
          </p>
          <Link href="/contact" className={`${styles.btn} ${styles.btnPrimary}`}>Book Your Bespoke Consultation</Link>
        </div>
      </section>

      {/* Why Lumina Section */}
      <section id="about" className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Why Elegant Fashion</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.featureCard}>
              <h3>Artisanal Craftsmanship</h3>
              <p>Every piece crafted with meticulous attention to detail</p>
            </div>
            <div className={styles.featureCard}>
              <h3>Sustainability</h3>
              <p>Ethical practices and premium sustainable materials</p>
            </div>
            <div className={styles.featureCard}>
              <h3>Individual Expression</h3>
              <p>Fashion that celebrates your unique identity</p>
            </div>
            <div className={styles.featureCard}>
              <h3>Industry Connections</h3>
              <p>Access to exclusive networks and opportunities</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>What Our Clients Say</h2>
          <div className={styles.testimonialsGrid}>
            <div className={styles.testimonialCard}>
              <p>"I frequently source premium fabrics for custom garments but lack the time and skills to sew them myself. Elegant Fashion consistently delivers precise, high-quality tailoring and impeccable finishing. Their service is reliable, professional, and exactly what I need."</p>
              <div className={styles.testimonialAuthor}>
                <strong>Sunday James</strong>
                <span>Entrepreneur</span>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <p>"I previously struggled in other fashion studios where customer orders were always prioritized over student learning. But here, everything is different. I have a dedicated instructor who guides me step-by-step every day in a calm, conducive environment.Thanks to the constant support and daily guidance, my skills are improving rapidly. I have spent 2 months here already and I'm confident I'll become a professional fashion designer in 6 months.I highly recommend this school to anyone serious about learning fashion!"</p>
              <div className={styles.testimonialAuthor}>
                <strong>David Blessing</strong>
                <span>Aspiring Fashion Designer</span>
              </div>
            </div>
            <div className={styles.testimonialCard}>
              <p>"I love stylish, well-fitted clothing but don't have time to design or tailor my own. Elegant Fashion's ready-to-wear collections allow me to walk in, find beautiful outfits that fit perfectly, and suit my lifestyle. The variety, quality, and convenience are outstanding."</p>
              <div className={styles.testimonialAuthor}>
                <strong>Tare Karen</strong>
                <span>Civil Servant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Section */}
      <section className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>ORGANIZATIONS ELEGANT FASHION HAS WORKED WITH</h2>
          <div className={styles.instagramGrid}>
            <div className={styles.instagramItem}>
              <div className={styles.organizationCard}></div>
            </div>
            <div className={styles.instagramItem}>
              <div className={styles.organizationCard}></div>
            </div>
            <div className={styles.instagramItem}>
              <div className={styles.organizationCard}></div>
            </div>
            <div className={styles.instagramItem}>
              <div className={styles.organizationCard}></div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <h3>ELEGANT FASHION</h3>
              <p>Where Individuality is Mastered</p>
            </div>
            <div className={styles.footerSection}>
              <h4>Quick Links</h4>
              <Link href="/ready-to-wear">Ready-to-Wear</Link>
              <Link href="/contact">Bespoke</Link>
              <Link href="/fashion-school">Fashion School</Link>
              <Link href="/about">About</Link>
            </div>
            <div className={styles.footerSection}>
              <h4>Contact</h4>
              <Link href="/contact">Get in Touch</Link>
              <Link href="https://wa.me/2348166361710" target="_blank" rel="noopener noreferrer">Book Consultation</Link>
            </div>
          </div>
          <div className={styles.copyright}>
            © 2026 Elegant Fashion. All Rights Reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}