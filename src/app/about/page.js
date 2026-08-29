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

export default function About() {
  return (
    <ScrollRevealRoot className={styles.page}>
      <header className={styles.hero} data-reveal>
        <span className={styles.eyebrow}>Our story</span>
        <h1 className={styles.heroTitle}>Where individuality is mastered</h1>
        <p className={styles.heroText}>
          Elegant Fashion is a Bayelsa-based house that was founded in 2018 by our CEO Mrs Esther Patrick working across three
          disciplines that share one workroom: ready-to-wear, bespoke
          tailoring, and a fashion school that trains the next generation of
          designers on the same techniques we use in our own organization.
        </p>
      </header>

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