"use client";
import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import ScrollRevealRoot from "@/components/ScrollRevealRoot";

const heroSlides = [
  { src: "/images/Hero/female-ankara-burgundy-midi_v2.jpg", alt: "Elegant burgundy Ankara midi dress" },
  { src: "/images/Hero/female-ankara-peplum-gown_v2.jpg", alt: "Ankara peplum fashion gown" },
  { src: "/images/Hero/Gemini_Generated_Image_6mf0bm6mf0bm6mf0.jfif", alt: "Editorial African fashion look" },
  { src: "/images/Hero/Gemini_Generated_Image_88v5an88v5an88v5.jfif", alt: "Contemporary Nigerian fashion design" },
  { src: "/images/Hero/Gemini_Generated_Image_p6lm3pp6lm3pp6lm.jfif", alt: "Tailored fashion collection portrait" },
  { src: "/images/Hero/male-agbada-cream-stripes_v2.jpg", alt: "Cream striped agbada attire" },
];

const collectionSlides = [
  { name: "The Atelier Edit", src: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=1000&q=85", alt: "Curated clothing displayed in a bright fashion studio" },
  { name: "After-Hours", src: "https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=1000&q=85", alt: "Elegant evening outfit arranged in a fashion studio" },
  { name: "Quiet Confidence", src: "https://images.unsplash.com/photo-1496217590455-aa63a8350eea?auto=format&fit=crop&w=1000&q=85", alt: "Contemporary neutral outfit on a fashion model" },
  { name: "The Occasion", src: "https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=1000&q=85", alt: "Polished occasionwear displayed in a boutique" },
  { name: "Modern Heritage", src: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=1000&q=85", alt: "A curated rail of modern heritage garments" },
  { name: "Signature Forms", src: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1000&q=85", alt: "Editorial portrait from a signature fashion collection" },
];

export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const slideTimer = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(slideTimer);
  }, []);

  return (
    <ScrollRevealRoot className={styles.container}>
      <a className={styles.skipLink} href="#main-content">Skip to content</a>
      {/* Hero Section */}
      <section className={styles.hero} aria-label="Featured fashion collections">
        <div className={styles.heroSlides} aria-live="polite">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.src}
              className={`${styles.heroSlide} ${index === activeSlide ? styles.heroSlideActive : ""}`}
              style={{ backgroundImage: `url(${slide.src})` }}
              role="img"
              aria-label={slide.alt}
              aria-hidden={index !== activeSlide}
            />
          ))}
        </div>
        <div className={styles.heroOverlay} data-reveal>
          <h1 className={styles.heroTitle}>Fashion That Defines You</h1>
          <p className={styles.heroSubtitle}>
            Limited Ready-to-Wear • Masterful Bespoke • Professional Fashion Training
          </p>
          <div className={styles.heroCTA}>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/ready-to-wear">Explore Collections</Link>
          </div>
          <div className={styles.slideProgress} aria-label={`Slide ${activeSlide + 1} of ${heroSlides.length}`}>
            {heroSlides.map((slide, index) => (
              <span key={slide.src} className={`${styles.slideDot} ${index === activeSlide ? styles.slideDotActive : ""}`} aria-hidden="true" />
            ))}
          </div>
        </div>
      </section>

      <main id="main-content">
      {/* Ready-to-Wear Section */}
      <section id="ready-to-wear" className={styles.section}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle} data-reveal>Limited-Edition Ready-to-Wear</h2>
          <p className={styles.sectionText} data-reveal data-reveal-delay="80">
            Our limited-edition ready-to-wear collections help style-conscious young professionals who want to express individuality through fashion by reducing mass-produced sameness and increasing personal style confidence, unlike fast-fashion brands that prioritize trends over uniqueness.
          </p>
          <div className={styles.collectionGrid}>
            {collectionSlides.map((item, index) => (
              <div key={item.name} data-reveal data-reveal-delay={String(index * 80)}>
                <article className={styles.collectionCard}>
                  <div className={styles.collectionImage}>
                    <Image src={item.src} alt={item.alt} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                  </div>
                  <h3>Collection {item.name}</h3>
                  <Link className={`${styles.btn} ${styles.btnSmall}`} href="/ready-to-wear">Shop Collection</Link>
                </article>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Fashion School Section */}
      <section id="fashion-school" className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle} data-reveal>Fashion & Design Training</h2>
          <p className={styles.sectionText} data-reveal data-reveal-delay="80">
            Our fashion and design training delivers a fast, practical path to a professional career. Learn essential skills like sketching, pattern-making, CAD, trend forecasting, and sustainable design directly from industry experts. You'll build a standout portfolio through real-world projects and personalized mentorship, gaining the creative confidence, business know-how, and industry connections needed to land jobs at top brands, launch your own label, or freelance successfully.
          </p>
          <div className={styles.ctaGroup} data-reveal data-reveal-delay="140">
            <Link href="/course" className={`${styles.btn} ${styles.btnPrimary}`}>Enroll Now</Link>
            <Link href="/curriculum" className={`${styles.btn} ${styles.btnOutline}`}>View Curriculum</Link>
          </div>
        </div>
      </section>

      {/* Bespoke Section */}
      <section id="bespoke" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.bespokeContent}>
            <div className={styles.bespokeText} data-reveal>
              <h2 className={styles.sectionTitle}>True Bespoke Couture</h2>
              <p className={styles.sectionText}>
                Our Bespoke is the premier destination for true bespoke fashion and design, where every garment is handcrafted from scratch as a one-of-a-kind masterpiece tailored exclusively to you. Specializing in custom-fitted suits, shirts, dresses, outerwear, and accessories, we combine centuries-old artisanal techniques, like precise individual pattern drafting, hand-stitching, and intricate finishing with contemporary style and premium fabrics to deliver unparalleled fit, elegance, and personal expression.
              </p>
              <Link href="/contact" className={`${styles.btn} ${styles.btnPrimary}`}>Book Your Bespoke Consultation</Link>
            </div>
            <div className={styles.bespokeImage} data-reveal data-reveal-delay="120">
              <Image className={styles.bespokePhoto} src="/images/bespoke-CUbywJn6.jpg" alt="Elegant Fashion bespoke tailoring detail" width={900} height={675} sizes="(max-width: 768px) 100vw, 50vw" />
            </div>
          </div>
        </div>
      </section>

      {/* Why Elegant Section */}
      <section id="about" className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle} data-reveal>Why Elegant Fashion</h2>
          <div className={styles.featuresGrid}>
            <article className={styles.featureCard} data-reveal data-reveal-delay="0">
              <h3>Artisanal Craftsmanship</h3>
              <p>Every piece crafted with meticulous attention to detail</p>
            </article>
            <article className={styles.featureCard} data-reveal data-reveal-delay="80">
              <h3>Sustainability</h3>
              <p>Ethical practices and premium sustainable materials</p>
            </article>
            <article className={styles.featureCard} data-reveal data-reveal-delay="160">
              <h3>Individual Expression</h3>
              <p>Fashion that celebrates your unique identity</p>
            </article>
            <article className={styles.featureCard} data-reveal data-reveal-delay="240">
              <h3>Industry Connections</h3>
              <p>Access to exclusive networks and opportunities</p>
            </article>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className={`${styles.section} ${styles.sectionDark}`}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle} data-reveal>What Our Clients Say</h2>
          <div className={styles.testimonialsGrid}>
            <div data-reveal data-reveal-delay="0">
              <div className={styles.testimonialCard}>
                <p>"I frequently source premium fabrics for custom garments but lack the time and skills to sew them myself. Elegant Fashion consistently delivers precise, high-quality tailoring and impeccable finishing. Their service is reliable, professional, and exactly what I need."</p>
                <div className={styles.testimonialAuthor}>
                  <strong>Sunday James</strong>
                  <span>Entrepreneur</span>
                </div>
              </div>
            </div>
            <div data-reveal data-reveal-delay="100">
              <div className={styles.testimonialCard}>
                <p>"I previously struggled in other fashion studios where customer orders were always prioritized over student learning. But here, everything is different. I have a dedicated instructor who guides me step-by-step every day in a calm, conducive environment.Thanks to the constant support and daily guidance, my skills are improving rapidly. I have spent 2 months here already and I'm confident I'll become a professional fashion designer in 6 months.I highly recommend this school to anyone serious about learning fashion!"</p>
                <div className={styles.testimonialAuthor}>
                  <strong>David Blessing</strong>
                  <span>Aspiring Fashion Designer</span>
                </div>
              </div>
            </div>
            <div data-reveal data-reveal-delay="200">
              <div className={styles.testimonialCard}>
                <p>"I love stylish, well-fitted clothing but don't have time to design or tailor my own. Elegant Fashion's ready-to-wear collections allow me to walk in, find beautiful outfits that fit perfectly, and suit my lifestyle. The variety, quality, and convenience are outstanding."</p>
                <div className={styles.testimonialAuthor}>
                  <strong>Tejiri Benita</strong>
                  <span>Civil Servant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </main>

      {/* Footer */}
      <footer className={styles.footer} data-reveal>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <h3>Elegant Style Fashion</h3>
              <p>Where Individuality is Mastered</p>
            </div>
            <div className={styles.footerSection}>
              <h4>Quick Links</h4>
              <Link href="/ready-to-wear">Ready-to-Wear</Link>
              <Link href="/contact">Bespoke</Link>
              <Link href="/course">Fashion School</Link>
              <Link href="/about">About Us</Link>
            </div>
            <div className={styles.footerSection}>
              <h4>Legal</h4>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
            <div className={styles.footerSection}>
              <h4>Contact</h4>
              <p className={styles.footerAddress}>No 27 Biobgblo Issac Boro Express Way,<br />Opposite Charismatic Church, Beside Rogas Plant,<br />Bayelsa State, Nigeria</p>
              <Link href="/contact">Get in Touch</Link>
              <Link href="https://wa.me/2348166361710" target="_blank" rel="noopener noreferrer">Book Consultation</Link>
            </div>
          </div>
          <div className={styles.copyright}>
            © 2026 Elegant Style Fashion. All rights reserved.
          </div>
        </div>
      </footer>
    </ScrollRevealRoot>
  );
}
