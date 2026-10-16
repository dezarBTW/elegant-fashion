"use client";
import Link from "next/link";
import { openCookieSettings } from "@/lib/cookieConsent";
import styles from "./privacy.module.css";

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Legal</span>
          <h1>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated: <time dateTime="2026-10-16">16 October 2026</time></p>
        </header>

        <div className={styles.content}>
          <section className={styles.section}>
            <h2>1. Information We Collect</h2>
            <p>
              Elegant Style is responsible for the personal information handled through elegantstyle.com.ng and our shop and fashion academy at Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State, Nigeria. This policy covers accounts, training applications, bespoke requests, ready-to-wear orders, and the browser storage used to provide these services.
            </p>

            <h3>Account Information</h3>
            <p>When you create an account, we collect:</p>
            <ul>
              <li>Email address</li>
              <li>Password credentials handled by Supabase Auth, which stores password hashes rather than readable passwords</li>
              <li>Account identifiers, email confirmation and recovery information, session information, and active or inactive account status</li>
            </ul>

            <h3>Student Registration Data</h3>
            <p>When you apply for our fashion school programmes, we collect:</p>
            <ul>
              <li>Full name (surname, first name, middle name)</li>
              <li>Gender</li>
              <li>Date of birth and age</li>
              <li>Nationality</li>
              <li>Marital status</li>
              <li>State of origin</li>
              <li>Residential address</li>
              <li>Telephone number</li>
              <li>Email address</li>
              <li>Chosen programme (3-month, 6-month, or 1-year)</li>
              <li>Passport photograph</li>
              <li>Your account identifier, application reference, submission date, and application or admission status</li>
            </ul>
            <p>
              While you complete the application, the site saves a draft of the form fields in this browser, linked to your account, with a 24-hour expiry renewed when you edit the form. The draft excludes the passport photo. Expired drafts are discarded when read, and the draft is removed after successful submission. Other people using the same browser may be able to access locally stored information; clear site data when using a shared device.
            </p>

            <h3>Product and Order Data</h3>
            <p>You can browse the shop and use checkout without creating an account. When you place an order, we collect:</p>
            <ul>
              <li>Your name, email address, and phone number</li>
              <li>Your pickup or delivery choice and, for delivery, your street address, city, and state</li>
              <li>Product identifiers, item names, quantities, prices, delivery charges, and order total</li>
              <li>Order and payment-provider references, payment confirmation and timestamps, and fulfilment progress</li>
              <li>Security identifiers used to recognise the browser that placed the order and avoid reusing a checkout with changed details</li>
            </ul>
            <p>
              Bachs collects payment details on its hosted checkout. We receive payment references and confirmation information, rather than your card number, PIN, or card security code. A saved cart contains product identifiers in your browser; your name and delivery details are collected when you submit checkout.
            </p>

            <h3>Bespoke Requests</h3>
            <p>When you send a bespoke outfit request through our website, we collect:</p>
            <ul>
              <li>Your name (optional)</li>
              <li>Your phone number, so we can contact you by call or WhatsApp</li>
              <li>Your description of the outfit you want</li>
              <li>Up to four reference photos that you choose to attach, such as fabric or styling inspiration</li>
              <li>A request reference, submission date, and progress status used by our staff to manage your enquiry</li>
            </ul>
            <p>
              Reference images may be converted or compressed on your device before upload. Please only submit images you have permission to share, and avoid unnecessary sensitive information about yourself or another person.
            </p>

            <h3>Automatically Collected Data</h3>
            <p>We may automatically collect certain technical information:</p>
            <ul>
              <li>Identifiers and attempt timestamps used to limit repeated authentication, registration, and other actions; some are stored locally and linked to an email address or account</li>
              <li>IP addresses processed to create hashed identifiers for bespoke-request and checkout abuse prevention; those identifiers are security records and should not be treated as anonymous data</li>
              <li>Your cookie choices, so that we remember your preference (see section 8)</li>
              <li>Technical request and error information processed by hosting and service providers to deliver, troubleshoot, and protect the site</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2>2. How We Use Your Information</h2>
            <p>We use the information we collect for the following purposes:</p>
            <ul>
              <li><strong>Account management:</strong> To create and manage your account, authenticate your identity, and provide access to our services.</li>
              <li><strong>Student registration:</strong> To process your course application, assess eligibility, manage admissions, and maintain academic records.</li>
              <li><strong>Bespoke requests:</strong> To review your outfit request, contact you about it, and prepare a quote.</li>
              <li><strong>Orders and fulfilment:</strong> To check prices, create and verify a payment, arrange pickup or delivery, manage order progress, and resolve payment or order problems.</li>
              <li><strong>Transactional emails:</strong> To send paid-order receipts and notify the shop of paid orders or bespoke requests. These messages are service communications, not optional advertising emails.</li>
              <li><strong>Communication:</strong> To respond to your inquiries, send updates about your application or orders, and provide customer support.</li>
              <li><strong>Service improvement:</strong> To understand how our services are used and improve the user experience.</li>
              <li><strong>Security:</strong> To protect against fraud, abuse, and unauthorized access through rate limiting and input validation.</li>
              <li><strong>Legal compliance:</strong> To comply with applicable laws and regulations in Nigeria, including the Nigeria Data Protection Act 2023.</li>
            </ul>
            <h3>Why we may process your information</h3>
            <p>
              We process information needed to provide a service you request or take steps towards a service agreement, such as reviewing an application, preparing a quote, or fulfilling an order. We also process information to meet legal obligations and for legitimate interests such as protecting the site, preventing fraud, and resolving enquiries, subject to your rights. Where consent is required, including for optional analytics if introduced, we rely on that consent and you may withdraw it. Rejecting optional cookies does not prevent essential service processing.
            </p>
          </section>

          <section className={styles.section}>
            <h2>3. Where Your Data Is Stored</h2>
            <p>
              Your data is stored using the following infrastructure:
            </p>
            <ul>
              <li><strong>Supabase database:</strong> Account profiles, student applications, bespoke requests, shop orders, payment and fulfilment records, and security identifiers are stored in Supabase. Database policies and server-side access checks restrict application and order-management functions to the relevant users or authorised staff.</li>
              <li><strong>Supabase Storage:</strong> Product images, student passport photographs, and bespoke reference photos are stored in Supabase. Product images are public. The student photo feature currently uses public image links; anyone who obtains a working public link may be able to view the photo. Bespoke reference photos are kept in a private bucket and made available to authorised staff through the administrative area or temporary signed links.</li>
              <li><strong>Supabase Auth:</strong> Email addresses, password hashes, authentication sessions, confirmation, and password recovery are handled through Supabase&apos;s authentication service. Our staff cannot read your stored password.</li>
              <li><strong>Resend and email recipients:</strong> Resend delivers bespoke notifications to the shop, which may include your name, phone number, request description, reference images as attachments, and temporary image links valid for seven days. For verified paid orders, it delivers a receipt to your supplied email address and an order notification to the shop. These emails include the order reference, items, amounts, and pickup or delivery details; the shop notification also includes your contact details. Copies can remain in the recipient&apos;s mailbox.</li>
              <li><strong>Bachs (payments):</strong> When you check out, we send your name, email, phone number, order reference and payment amount to Bachs. You enter payment details on Bachs&apos;s secure checkout. We store your order items, delivery address, contact details and payment confirmation in Supabase; we do not receive your card number, PIN or security code.</li>
              <li><strong>Vercel hosting:</strong> Vercel serves the website and runs the server functions that process checkout, payment notifications, and bespoke submissions. Submitted information passes through these functions, and operational logs may contain request, reference, or error information.</li>
            </ul>
            <p>
              These providers may process information outside Nigeria. International transfers are subject to applicable Nigerian data-protection requirements. Contact us if you need information about the processing locations and safeguards relevant to your data.
            </p>
          </section>

          <section className={styles.section}>
            <h2>4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
            </p>
            <ul>
              <li><strong>Service providers:</strong> Supabase provides authentication and storage, Vercel provides hosting and server functions, Resend delivers service emails, and Bachs processes checkout payments.</li>
              <li><strong>Authorised staff:</strong> Staff use the administrative area to review applications, manage bespoke requests, and process orders. Accepted-student management is not a public directory. Necessary order and contact details may be shared with people arranging your pickup or delivery.</li>
              <li><strong>Legal requirements:</strong> We may disclose your information if required by law, regulation, or legal process, or to protect our rights, property, or safety.</li>
              <li><strong>Business transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.</li>
              <li><strong>Consent:</strong> We may share your information with your explicit consent.</li>
            </ul>
            <p>
              If you follow a Facebook, WhatsApp, or other external link, or use Bachs&apos;s checkout, the destination service handles information under its own policies. We do not operate those services. We do not use an uploaded application photo or bespoke reference image for public marketing simply because you submitted it.
            </p>
          </section>

          <section className={styles.section}>
            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal information:
            </p>
            <ul>
              <li>All data transmission is encrypted using HTTPS/TLS</li>
              <li>Passwords are hashed and managed by Supabase Auth (never stored in plaintext)</li>
              <li>Database policies and server-side authentication checks limit access to application and administrative data</li>
              <li>Online order-status access requires a browser-specific cookie; payment confirmations are checked before an order is marked paid</li>
              <li>Input sanitization is applied to prevent injection attacks</li>
              <li>Rate limiting protects against brute-force and abuse attempts</li>
              <li>File uploads are validated for type and size</li>
            </ul>
            <p>
              However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
            </p>
          </section>

          <section className={styles.section}>
            <h2>6. Your Data Rights</h2>
            <p>You have the following rights regarding your personal data:</p>
            <ul>
              <li><strong>Access:</strong> You can request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> You can request that we correct any inaccurate or incomplete data.</li>
              <li><strong>Deletion:</strong> You can ask us to delete your personal data, subject to records we must lawfully retain. The profile menu&apos;s deactivation feature makes the account inactive and signs you out; it does not delete the authentication account, application, photos, orders, or emails. Contact us separately to request deletion.</li>
              <li><strong>Data portability:</strong> You can request a copy of your data in a portable format.</li>
              <li><strong>Objection:</strong> You can object to certain processing of your personal data.</li>
              <li><strong>Withdraw consent:</strong> Where we rely on your consent, such as for optional cookies, you can withdraw it at any time. See section 8 for how to change your cookie choices.</li>
            </ul>
            <p>
              Contact us using the details below to exercise a right or correct an order or application. We may need to verify your identity before providing or deleting information. Rights are subject to applicable legal conditions and retention obligations; withdrawing consent does not undo processing that was already lawful. If you are not satisfied with our response, you may complain to the <a href="https://ndpc.gov.ng/" className={styles.internalLink} target="_blank" rel="noopener noreferrer">Nigeria Data Protection Commission</a>.
            </p>
          </section>

          <section className={styles.section}>
            <h2>7. Data Retention</h2>
            <p>
              We retain your personal data for as long as necessary to provide our services and fulfill the purposes outlined in this policy:
            </p>
            <ul>
              <li><strong>Account data:</strong> Kept to provide account services and handle related obligations. Deactivating an account does not automatically delete its records; contact us about deletion.</li>
              <li><strong>Student registration data:</strong> Retained for academic record-keeping purposes throughout your programme and thereafter as required by applicable regulations.</li>
              <li><strong>Application drafts:</strong> Saved locally with a 24-hour expiry renewed on editing, discarded when an expired draft is read, and removed after successful submission. You can remove local drafts by clearing site data.</li>
              <li><strong>Bespoke requests:</strong> Kept while we assess and fulfil the request and handle follow-up or disputes. Removing a request queues its referenced photos for cleanup from site storage; this does not automatically erase copies already sent by email.</li>
              <li><strong>Shop orders:</strong> Kept to process pickup or delivery, provide support, address disputes, and retain necessary payment and business records. The seven-day order-access cookie expiry does not delete the order.</li>
              <li><strong>Emails and provider records:</strong> Service emails and payment records may remain with recipients or providers under their retention practices and applicable obligations. A deletion request should identify any related order, application, or bespoke request.</li>
              <li><strong>Security records:</strong> Attempt counters use time-based limits, but the end of a rate-limit window does not necessarily erase its underlying identifiers or records. Such records may be kept to investigate abuse or security incidents.</li>
            </ul>
            <p>
              We do not currently publish a single automatic deletion period for all server records. Retention depends on the purpose and applicable obligations; contact us for information about a particular record or to request deletion. Browser storage can remain on your device until it expires and is cleared by the site, or you clear it yourself.
            </p>
          </section>

          <section className={styles.section}>
            <h2>8. Cookies and Similar Storage</h2>
            <p>We use cookies and local or session browser storage for essential services and to remember optional cookie choices:</p>
            <ul>
              <li><strong>Sign-in and security:</strong> Authentication session information and local attempt counters support sign-in, recovery, registration, and abuse prevention.</li>
              <li><strong>Shopping:</strong> Local storage saves your cart&apos;s product identifiers and payment-confirmation markers. Session storage can remember a pending order reference so you can return to its payment status.</li>
              <li><strong>Order access:</strong> An HTTP-only order-access cookie, valid for seven days and sent over secure connections in production, allows the browser that placed an order to retrieve its status. An order reference alone is insufficient. Clearing site data or using another browser may remove that access; contact us with your reference for help.</li>
              <li><strong>Application drafts:</strong> Local browser storage saves application form fields, excluding the passport photo, with the 24-hour expiry described above.</li>
              <li><strong>Cookie preferences:</strong> Browser storage and a first-party cookie named &ldquo;cookie_consent&rdquo; record your choice for up to 180 days, after which we ask again.</li>
              <li><strong>Analytics and performance (optional, off by default):</strong> We do not currently run analytics. If we add it in future, it will only run if you have allowed it.</li>
            </ul>
            <p>
              We do not currently use advertising cookies, tracking pixels, or third-party analytics. Loading placeholders, scroll animations, and responsive layouts work whether you accept or reject optional cookies. Bachs may use its own necessary storage on its hosted payment page.
            </p>

            <h3>Your cookie choices</h3>
            <p>
              On your first visit, you can accept all cookies, reject optional cookies, or customise your choice. You can change your mind at any time:
            </p>
            <p>
              <button type="button" className={styles.cookieButton} onClick={openCookieSettings}>
                Change cookie settings
              </button>
            </p>
            <p>
              You can also clear cookies and site data in your browser settings. This may sign you out and remove your cart, application draft, cookie choice, and online order access. It does not delete submitted applications or orders from our server records. We will ask for your cookie choice again.
            </p>
          </section>

          <section className={styles.section}>
            <h2>9. Children&apos;s Privacy</h2>
            <p>
              Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete that information promptly.
            </p>
            <p>
              Users under 18 must involve a parent or legal guardian before submitting personal information or applying for training. A parent or guardian should contact us to arrange any consent required for the application and any service agreement. If you believe a child&apos;s information has been submitted without appropriate permission, contact us so we can review it and take the required action.
            </p>
          </section>

          <section className={styles.section}>
            <h2>10. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the updated policy on this page with a revised &ldquo;Last updated&rdquo; date. We encourage you to review this policy periodically.
            </p>
          </section>

          <section className={styles.section}>
            <h2>11. Contact Us</h2>
            <p>
              If you have any questions, concerns, or requests regarding this Privacy Policy or your personal data, please contact us:
            </p>
            <ul>
              <li>Email: <a href="mailto:patrickesther26@gmail.com" className={styles.internalLink}>patrickesther26@gmail.com</a></li>
              <li>WhatsApp: <a href="https://wa.me/2348166361710" className={styles.internalLink} target="_blank" rel="noopener noreferrer">08166361710</a></li>
              <li>Address: Km 4 Isaac Boro Express Way, Yenagoa, Bayelsa State.</li>
            </ul>
          </section>
        </div>

        <footer className={styles.footer}>
          <Link href="/" className={styles.backLink}>Return to Home</Link>
          <Link href="/terms" className={styles.internalLink}>Terms of Service</Link>
        </footer>
      </div>
    </div>
  );
}
