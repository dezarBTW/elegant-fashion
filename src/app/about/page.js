import Link from "next/link";
import styles from "./about.module.css";
import ScrollRevealRoot from "@/components/ScrollRevealRoot";

const pillars = [
  {
    tag: "N\u00b0 01",
    title: "Ready-to-wear",
    text: "Limited-run collections cut in small batches, so a piece you buy off the rail never feels mass-produced.",
    href: "/ready-to-wear",
    cta: "View collections",
  },
  {
    tag: "N\u00b0 02",
    title: "Bespoke couture",
    text: "Garments drafted from your own measurements and hand-finished, from first muslin to final stitch.",
    href: "/contact",
    cta: "Book a consultation",
  },
  {
    tag: "N\u00b0 03",
    title: "Fashion school",
    text: "A practical, mentor-led path into the industry \u2014 pattern-making, construction, and portfolio work.",
    href: "/course",
    cta: "See the programme",
  },
];

const values = [
  {
    title: "Cut by hand, not by trend",
    text: "Every pattern is drafted and adjusted individually before a single cut is made.",
  },
  {
    title: "Small runs, on purpose",
    text: "We limit production so pieces stay distinctive rather than disposable.",
  },
  {
    title: "Skills that transfer",
    text: "Our school trains for real studio work \u2014 the same techniques used in our own organization.",
  },
  {
    title: "Rooted in Bayelsa",
    text: "Built and staffed locally, from the workroom to the classroom.",
  },
];

const partners = [
  {
    name: "Foundation for Partnership Initiatives in the Niger Delta (PIND)",
    text: "We partnered with PIND to train 75 Students in a 6 months fashion and design Course in 2026 and two months Internship and job placement in anticipation.",
  },
  {
    name: "Industrial Training Fund (ITF)",
    text: "Elegant Style has been an Implementing Partner with ITF since 2021 and have trained well over 250 students in fashion and designing. We have been active in the ITF SUPA-Skill-up programme till date.",
  },
  {
    name: "Technical and Vocational Education and Training (TVET)",
    text: "We currently have approval from TVET as their verified training Centre in fashion and design/shoe making, and will be allocated students in the next cohort.",
  },
  {
    name: "Africa's Hub for Skills & Enterprise Development (AHSED)",
    text: "Recently in May 2026, AHSED engaged us in a training with over 200 persons, male and female, in fashion and designing, Pattern drafting and Fashion Illustration.",
  },
  {
    name: "Transforming Nigerian Youth program (TNY)",
    text: "From 2021-2025, we were in the Transforming Nigerian Youth program sponsored by MasterCard Foundation and implemented by Enterprise Development Center (EDC) Lagos, as a certified National Business Development Service Provider (NBDSP) we were paired with MSMEs to impact positively in there businesses by providing advisory support and mentorship",
  },
  {
    name: "Nigeria Incentive-Based Risk Sharing System for Agricultural Lending (NIRSAL Mfb)",
    text: "Between 2019-2023 we partnered with NIRSAL Microfinance Bank to facilitate SME Loans to over 1000 applicants in the Niger Delta as an Entrepreneurship Development Institute (EDI).",
  },
];

export default function About() {
  return (
    <ScrollRevealRoot className={styles.page}>
      <header className={styles.hero} data-reveal>
        <span className={styles.eyebrow}>Our story</span>
        <h1 className={styles.heroTitle}>Where creativity is mastered</h1>
        <p className={styles.heroText}>
          Elegant Fashion is a Bayelsa-based house that was founded in 2018 by our CEO Mrs Esther Patrick working across three
          disciplines that share one workroom: ready-to-wear, bespoke
          tailoring, and a fashion school that trains the next generation of
          designers on the same techniques we use in our own organization.
        </p>
      </header>

      <section className={styles.partnersSection} aria-label="Organizations we have worked with">
        <h2 className={styles.sectionTitle} data-reveal>Organizations we have worked with</h2>
        <div className={styles.partnersGrid}>
          {partners.map((partner, index) => (
            <article
              key={partner.name}
              className={styles.partnerCard}
              data-reveal
              data-reveal-delay={String(index * 80)}
            >
              <div className={styles.partnerOverlay}>
                <h3>{partner.name}</h3>
                <p>{partner.text}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className={styles.stitchLine} aria-hidden="true"></div>

      <section className={styles.pillars} aria-label="What we do">
        {pillars.map((pillar, index) => (
          <div key={pillar.title} data-reveal data-reveal-delay={String(index * 90)}>
            <article className={styles.pillarCard}>
              <span className={styles.pillarTag}>{pillar.tag}</span>
              <h2>{pillar.title}</h2>
              <p>{pillar.text}</p>
              <Link href={pillar.href} className={styles.pillarLink}>
                {pillar.cta} &rarr;
              </Link>
            </article>
          </div>
        ))}
      </section>

      <div className={styles.stitchLine} aria-hidden="true"></div>

      <section className={styles.valuesSection}>
        <h2 className={styles.sectionTitle} data-reveal>How we work</h2>
        <div className={styles.valuesGrid}>
          {values.map((value, index) => (
            <article
              key={value.title}
              className={styles.valueCard}
              data-reveal
              data-reveal-delay={String(index * 80)}
            >
              <h3>{value.title}</h3>
              <p>{value.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.ctaBand} data-reveal>
        <h2>Have a piece in mind?</h2>
        <p>Tell us what you&apos;re looking for and we&apos;ll take it from there.</p>
        <Link href="/contact" className={styles.ctaButton}>
          Get in touch
        </Link>
      </section>
    </ScrollRevealRoot>
  );
}