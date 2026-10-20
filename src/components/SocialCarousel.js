"use client";

import Image from "next/image";
import { socialLinks } from "@/lib/socialLinks.mjs";
import styles from "./SocialCarousel.module.css";

export default function SocialCarousel() {
  return (
    <section className={styles.section} aria-labelledby="social-heading">
      <div className={styles.header}>
        <h2 id="social-heading">Follow Elegant Style</h2>
      </div>
      <div
        className={styles.viewport}
        onFocusCapture={(event) => {
          event.target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
        }}
      >
        <div className={styles.track}>
          {[false, true].map((duplicate) => (
            <div className={styles.group} key={String(duplicate)} aria-hidden={duplicate ? true : undefined}>
              {socialLinks.map((social) => (
                <a
                  key={social.id}
                  className={styles.link}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={duplicate ? -1 : undefined}
                  aria-label={`${social.name}: ${social.handle} (opens in a new tab)`}
                >
                  <Image src={social.icon} width={30} height={30} alt="" />
                  <span>
                    <strong>{social.name}</strong>
                    <span className={styles.handle}>{social.handle}</span>
                  </span>
                  <span className={styles.arrow} aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
