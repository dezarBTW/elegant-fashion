"use client";
import styles from "./page.module.css";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { businessStructuredData } from "@/lib/seo.mjs";
import { watchCopyrightYear } from "@/lib/copyrightYear.mjs";
import SocialCarousel from "@/components/SocialCarousel";

const heroSlides = [
  { src: "/images/Hero/image%20%2820%29.jpg", alt: "Jeweled blue Ankara evening gown" },
  { src: "/images/Hero/image%20%2821%29.jpg", alt: "Powder-blue lace outfit with a matching gele" },
  { src: "/images/Hero/image%20%2822%29.jpg", alt: "Gold beaded occasion gown with a matching gele" },
  { src: "/images/Hero/image%20%2823%29.jpg", alt: "Dark green lace gown with matching gele and coral accessories" },
];

// Keep the showcase empty until real collections are available.
const collectionSlides = [];

const brandHighlights = [
  { value: "22+", label: "Years of tailoring" },
  { value: "1000+", label: "Pieces delivered" },
  { value: "4.9/5", label: "Client satisfaction" },
];

const servicePillars = [
  { title: "Artisanal Craftsmanship", text: "Precision cut, premium fabrics, and finishing details that feel personal from the first fitting to the final stitch." },
  { title: "Sustainable Luxury", text: "Thoughtful sourcing and made-to-order production reduce waste while keeping every silhouette elevated and timeless." },
  { title: "Purposeful Styling", text: "We build wardrobes around your life, your confidence, and the moments you want to remember most." },
];

export default function Home() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [copyrightYear, setCopyrightYear] = useState(null);
  const carouselRef = useRef(null);
  const carouselStep = useRef(0);

  useEffect(() => watchCopyrightYear(setCopyrightYear), []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const slideTimer = window.setInterval(() => {
      setActiveSlide((currentSlide) => (currentSlide + 1) % heroSlides.length);
    }, 6000);

    return () => window.clearInterval(slideTimer);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || collectionSlides.length === 0) return;

    let frame = null;
    let lastIndex = 0;
    const updateIndex = () => {
      frame = null;
      const index = Math.max(0, Math.min(collectionSlides.length - 1,
        Math.round(carousel.scrollLeft / (carouselStep.current || 1))));
      if (index !== lastIndex) {
        lastIndex = index;
        setCarouselIndex(index);
      }
    };

    const handleScroll = () => {
      if (frame === null) frame = window.requestAnimationFrame(updateIndex);
    };
    const measure = () => {
      const item = carousel.firstElementChild;
      if (!item) return;
      carouselStep.current = item.getBoundingClientRect().width +
        (parseFloat(window.getComputedStyle(carousel).columnGap) || 0);
      handleScroll();
    };
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(carousel);
    measure();
    carousel.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      carousel.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.container}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(businessStructuredData).replace(/</g, "\\u003c") }}
      />
      <a className={styles.skipLink} href="#main-content">Skip to content</a>

      <section className={styles.hero} aria-label="Featured fashion collections">
        <div className={styles.heroVisual}>
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
          <div className={styles.slideProgress} aria-label={`Slide ${activeSlide + 1} of ${heroSlides.length}`}>
            {heroSlides.map((slide, index) => (
              <span key={slide.src} className={`${styles.slideDot} ${index === activeSlide ? styles.slideDotActive : ""}`} aria-hidden="true" />
            ))}
          </div>
        </div>

        <div className={styles.heroOverlay}>
          <h1 className={styles.heroTitle}>Designed for the way you live.</h1>
          <p className={styles.heroSubtitle}>
            Limited ready-to-wear • bespoke tailoring • fashion training
          </p>

          <div className={styles.heroCTA}>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} href="/ready-to-wear">Shop With Us</Link>
            <Link className={`${styles.btn} ${styles.btnSecondary}`} href="/bespoke/request">Book A Fitting</Link>
          </div>

          <div className={styles.statsRow} aria-label="Brand statistics">
            {brandHighlights.map((item) => (
              <div key={item.label} className={styles.statCard}>
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      <main id="main-content">
        <section id="ready-to-wear" className={styles.section}>
          <div className={styles.innerWrap}>
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>Ready-to-wear</p>
              <h2 className={styles.sectionTitle}>Curated pieces for everyday presence.</h2>
            </div>
            <p className={styles.sectionText}>
              Thoughtful silhouettes, premium fabrics, and an unmistakable point of view. Our limited-edition collections are built for people who want unmistakable style without the compromise of fast fashion.
            </p>

            <div className={styles.carouselContainer}>
              {collectionSlides.length > 1 && <button
                className={`${styles.carouselBtn} ${styles.carouselPrev}`} 
                onClick={() => {
                  if (carouselRef.current) {
                    carouselRef.current.scrollBy({ left: -carouselStep.current, behavior: 'auto' });
                  }
                }}
                aria-label="Previous items"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
              </button>}
              
              <div className={styles.collectionGrid} ref={carouselRef} aria-hidden={collectionSlides.length === 0 ? true : undefined}>
                {collectionSlides.map((item) => (
                  <div key={item.name} className={styles.carouselItem}>
                    <article className={styles.collectionCard}>
                      <div className={styles.collectionImage}>
                        <Image src={item.src} alt={item.alt} fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />
                      </div>
                      <div className={styles.collectionMeta}>
                        <p>Collection</p>
                        <h3>{item.name}</h3>
                      </div>
                      <Link className={`${styles.btn} ${styles.btnSmall} ${styles.btnOutline}`} href="/ready-to-wear">Shop collection</Link>
                    </article>
                  </div>
                ))}
              </div>

              {collectionSlides.length > 1 && <button
                className={`${styles.carouselBtn} ${styles.carouselNext}`}
                onClick={() => {
                  if (carouselRef.current) {
                    carouselRef.current.scrollBy({ left: carouselStep.current, behavior: 'auto' });
                  }
                }}
                aria-label="Next items"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>}

              {collectionSlides.length > 1 && <div className={styles.carouselPagination} aria-label="Carousel navigation">
                {collectionSlides.map((_, index) => (
                  <button
                    key={index}
                    className={`${styles.carouselDot} ${index === carouselIndex ? styles.carouselDotActive : ''}`}
                    onClick={() => {
                      if (carouselRef.current) {
                        carouselRef.current.scrollTo({ left: index * carouselStep.current, behavior: 'auto' });
                      }
                    }}
                    aria-label={`Go to item ${index + 1}`}
                    aria-current={index === carouselIndex ? 'true' : undefined}
                  />
                ))}
              </div>}
            </div>
          </div>
        </section>

        <section id="fashion-school" className={`${styles.section} ${styles.sectionDark} ${styles.trainingSection}`}>
          <div className={styles.innerWrap}>
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>Fashion & design training</p>
              <h2 className={styles.sectionTitle}>Build a career with real craft behind it.</h2>
            </div>
            <p className={styles.sectionText}>
              Learn the skills that matter in the industry: pattern making, sketching, CAD, trend forecasting, and garment construction. Every session is practical, focused, and tailored to the kind of creative work you want to do.
            </p>
            <div className={styles.ctaGroup}>
              <Link href="/course" className={`${styles.btn} ${styles.btnPrimary}`}>Enroll now</Link>
              <Link href="/curriculum" className={`${styles.btn} ${styles.btnSecondary}`}>View curriculum</Link>
            </div>
          </div>
        </section>

        <section id="bespoke" className={styles.section}>
          <div className={styles.innerWrap}>
            <div className={styles.bespokeContent}>
              <div className={styles.bespokeText}>
                <p className={styles.eyebrow1}>Bespoke Culture</p>
                <h2 className={styles.sectionTitle}>Tailoring that feels personal from the first conversation.</h2>
                <p className={styles.sectionText}>
                  Our bespoke studio pairs traditional garment construction with modern styling to create pieces built around your shape, your routine, and your identity. Every detail is measured, considered, and finished with care.
                </p>
                <Link href="/bespoke/request" className={`${styles.btn} ${styles.btnPrimary}`}>Book a consultation</Link>
              </div>

              <div className={styles.bespokeImage}>
                <div className={styles.bespokeFrame}>
                  <Image className={styles.bespokePhoto} src="/images/bespoke-CUbywJn6.jpg" alt="Elegant Style bespoke tailoring detail" width={900} height={675} sizes="(max-width: 768px) 100vw, 50vw" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className={`${styles.section} ${styles.sectionPanel}`}>
          <div className={styles.innerWrap}>
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>Why Elegant Style</p>
              <h2 className={styles.sectionTitle}>Our promise is quiet confidence.</h2>
            </div>

            <div className={styles.featuresGrid}>
              {servicePillars.map((item, index) => (
                <article key={item.title} className={styles.featureCard}>
                  <div className={styles.featureIndex}>0{index + 1}</div>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionDark}`}>
          <div className={styles.innerWrap}>
            <div className={styles.sectionHeader}>
              <p className={styles.eyebrow}>Client stories</p>
              <h2 className={styles.sectionTitle}>What our clients say.</h2>
            </div>

            <div className={styles.testimonialsGrid}>
              <div>
                <div className={styles.testimonialCard}>
                  <p>“The fit, finish, and attention to detail were exceptional. I finally have pieces that feel elevated and totally me.”</p>
                  <div className={styles.testimonialAuthor}>
                    <strong>Sunday James</strong>
                    <span>Entrepreneur</span>
                  </div>
                </div>
              </div>
              <div>
                <div className={styles.testimonialCard}>
                  <p>“The studio has a calm, focused teaching environment. I’ve learned practical skills quickly and genuinely feel more confident in my work.”</p>
                  <div className={styles.testimonialAuthor}>
                    <strong>David Blessing</strong>
                    <span>Aspiring fashion designer</span>
                  </div>
                </div>
              </div>
              <div>
                <div className={styles.testimonialCard}>
                  <p>“Their ready-to-wear pieces are polished, comfortable, and stylish in a way that feels effortless. It’s a brand I trust.”</p>
                  <div className={styles.testimonialAuthor}>
                    <strong>Tejiri Benita</strong>
                    <span>Civil servant</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <SocialCarousel />
      </main>

      <footer className={styles.footer}>
        <div className={styles.innerWrap}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <h3>Elegant Style</h3>
              <p>Where individuality is refined.</p>
            </div>
            <div className={styles.footerSection}>
              <h4>Quick links</h4>
              <Link href="/ready-to-wear">Ready-to-wear</Link>
              <Link href="/bespoke/request">Bespoke</Link>
              <Link href="/course">Fashion school</Link>
              <Link href="/about">About us</Link>
            </div>
            <div className={styles.footerSection}>
              <h4>Legal</h4>
              <Link href="/terms">Terms of service</Link>
              <Link href="/privacy">Privacy policy</Link>
            </div>
            <div className={styles.footerSection}>
              <h4>Contact</h4>
              <p className={styles.footerAddress}>Km 4 Isaac Boro Express Way,<br />Yenagoa, Bayelsa State.</p>
              <Link href="/contact">Get in touch</Link>
              <Link href="/bespoke/request">Book consultation</Link>
            </div>
          </div>

          <div className={styles.copyright}>© {copyrightYear} Elegant Style. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
