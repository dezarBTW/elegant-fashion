"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./request.module.css";

const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DESCRIPTION = 2000;
const MIN_DESCRIPTION = 20;
const ACCEPTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
]);

function hasAcceptedImageType(file) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const supportedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ];

  return (
    ACCEPTED_EXTENSIONS.has(extension) &&
    (supportedMimeTypes.includes(file.type.toLowerCase()) ||
      file.type === "" ||
      file.type === "application/octet-stream")
  );
}

async function compressImage(file) {
  let sourceBlob = file;
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  const isHeic =
    file.type.toLowerCase().includes("heic") ||
    file.type.toLowerCase().includes("heif") ||
    extension === ".heic" ||
    extension === ".heif";

  if (isHeic) {
    const convertHeic = (await import("heic2any")).default;
    const converted = await convertHeic({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  const sourceUrl = URL.createObjectURL(sourceBlob);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("This image could not be opened."));
      element.src = sourceUrl;
    });

    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Image processing is not available in this browser.");
    }

    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const compressedBlob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("This image could not be compressed.")),
        "image/jpeg",
        0.84,
      );
    });

    if (compressedBlob.size > MAX_FILE_SIZE) {
      throw new Error("The image is still over 5 MB after compression.");
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "reference";
    return new File([compressedBlob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

export default function BespokeRequestPage() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    description: "",
  });
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingImages, setIsProcessingImages] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [submitStage, setSubmitStage] = useState("");
  const fileInputRef = useRef(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  useEffect(
    () => () => {
      imagesRef.current.forEach((image) => URL.revokeObjectURL(image.preview));
    },
    [],
  );

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: "" }));
    }
  };

  const addImages = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const remainingSlots = MAX_IMAGES - images.length;
    const nextErrors = {};
    const acceptedFiles = [];

    if (files.length > remainingSlots) {
      nextErrors.images = `You can add up to ${MAX_IMAGES} images.`;
    }

    for (const file of files.slice(0, remainingSlots)) {
      if (!hasAcceptedImageType(file)) {
        nextErrors.images = `${file.name} is not a supported image. Use JPG, PNG, WebP, or HEIC.`;
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        nextErrors.images = `${file.name} is too large. Each image must be 5 MB or less.`;
        continue;
      }
      acceptedFiles.push(file);
    }

    setIsProcessingImages(true);
    setErrors((current) => ({ ...current, images: "" }));

    const preparedImages = [];
    for (const file of acceptedFiles) {
      try {
        const compressedFile = await compressImage(file);
        preparedImages.push({
          file: compressedFile,
          preview: URL.createObjectURL(compressedFile),
          name: file.name,
        });
      } catch (error) {
        console.error("Reference image processing failed:", error);
        nextErrors.images =
          error instanceof Error
            ? `${file.name}: ${error.message}`
            : `Could not process ${file.name}.`;
      }
    }

    setImages((current) => [...current, ...preparedImages].slice(0, MAX_IMAGES));
    if (Object.keys(nextErrors).length) {
      setErrors((current) => ({ ...current, ...nextErrors }));
    }
    setIsProcessingImages(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index) => {
    setImages((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return current.filter((_, imageIndex) => imageIndex !== index);
    });
    setErrors((current) => ({ ...current, images: "" }));
  };

  const validate = () => {
    const nextErrors = {};
    const description = formData.description.trim();
    const normalizedPhone = formData.phone.replace(/[\s()-]/g, "");
    const nigerianPhone = /^(?:0[789]\d{9}|\+234[789]\d{9})$/;

    if (!description) {
      nextErrors.description = "Please describe the outfit you have in mind.";
    } else if (description.length < MIN_DESCRIPTION) {
      nextErrors.description = `Please add at least ${MIN_DESCRIPTION} characters.`;
    } else if (description.length > MAX_DESCRIPTION) {
      nextErrors.description = `Your description must be ${MAX_DESCRIPTION} characters or fewer.`;
    }

    if (!normalizedPhone) {
      nextErrors.phone = "Please enter a contact number.";
    } else if (!nigerianPhone.test(normalizedPhone)) {
      nextErrors.phone =
        "Enter an 11-digit Nigerian mobile number starting 07, 08, or 09, or use +234.";
    }

    return nextErrors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSubmitStage(
      images.length
        ? "Uploading your reference photos..."
        : "Sending your request...",
    );

    try {
      let uploadedPaths = [];
      if (images.length) {
        const urlResponse = await fetch("/api/bespoke/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            files: images.map(({ file }) => ({
              fileName: file.name,
              contentType: file.type,
              size: file.size,
            })),
          }),
        });
        const urlData = await urlResponse.json();
        if (!urlResponse.ok) {
          throw new Error(urlData.error || "Could not prepare your images.");
        }

        uploadedPaths = await Promise.all(
          images.map(async ({ file, name }, index) => {
            const upload = urlData.uploadData[index];
            const response = await fetch(upload.signedUrl, {
              method: "PUT",
              headers: { "Content-Type": file.type },
              body: file,
            });
            if (!response.ok) {
              throw new Error(`Could not upload ${name}. Please try again.`);
            }
            return upload.path;
          }),
        );
      }

      setSubmitStage("Sending your request...");
      const submitResponse = await fetch("/api/bespoke/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim() || null,
          phone: formData.phone.trim(),
          description: formData.description.trim(),
          imagePaths: uploadedPaths,
          company_name: honeypot,
        }),
      });
      const responseData = await submitResponse.json();
      if (!submitResponse.ok) {
        const details = responseData.details || {};
        const fieldErrors = {
          ...(details.description?.[0] && {
            description: details.description[0],
          }),
          ...(details.phone?.[0] && { phone: details.phone[0] }),
          ...(details.imagePaths?.[0] && { images: details.imagePaths[0] }),
        };
        setErrors(
          Object.keys(fieldErrors).length
            ? fieldErrors
            : {
                submit:
                  responseData.error ||
                  "Your request could not be sent. Please try again.",
              },
        );
        return;
      }

      if (responseData.success) {
        setSubmittedPhone(responseData.phone || formData.phone.trim());
        setSubmitted(true);
        images.forEach((image) => URL.revokeObjectURL(image.preview));
        setImages([]);
      } else {
        setErrors({ submit: responseData.error || "Your request could not be sent. Please try again." });
      }
    } catch (error) {
      console.error("Bespoke request submission failed:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Your request could not be sent. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
      setSubmitStage("");
    }
  };

  if (submitted) {
    return (
      <main className={styles.container}>
        <section className={styles.successContainer} aria-live="polite">
          <div className={styles.successIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </div>
          <h1>Thank you</h1>
          <p>
            We&apos;ll reach out on <strong>{submittedPhone}</strong> shortly.
          </p>
          <Link href="/" className={styles.btn}>
            Back to home
          </Link>
        </section>
      </main>
    );
  }

  const characterCount = formData.description.length;
  const canAddImages = images.length < MAX_IMAGES && !isProcessingImages;

  return (
    <main className={styles.container}>
      {isSubmitting && (
        <div
          className={styles.loadingOverlay}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div className={styles.loadingCard}>
            <span className={styles.spinner} aria-hidden="true" />
            <p className={styles.loadingTitle}>
              {submitStage || "Sending your request..."}
            </p>
            <p className={styles.loadingHint}>
              Please keep this page open. This only takes a moment.
            </p>
          </div>
        </div>
      )}
      <header className={styles.header}>
        <p className={styles.eyebrow}>Bespoke tailoring</p>
        <h1>Tell us what you have in mind</h1>
        <p>
          Share fabric and style references and we&apos;ll get back to you.
        </p>
      </header>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="description">
            Describe your desired outfit <span aria-hidden="true">*</span>
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your desired outfit: Measurements, Style, Occasion, Fit, Colors, Fabric, and any details you have in mind"
            rows={7}
            maxLength={MAX_DESCRIPTION}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.description)}
            aria-describedby={
              errors.description
                ? "description-help description-error"
                : "description-help"
            }
            disabled={isSubmitting}
          />
          <div className={styles.fieldFooter}>
            <span
              id="description-help"
              className={styles.fieldHelper}
              aria-live="polite"
              aria-atomic="true"
            >
              {characterCount} / {MAX_DESCRIPTION} characters
            </span>
          </div>
          {errors.description && (
            <p id="description-error" className={styles.error} aria-live="polite">
              {errors.description}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="reference-images">
            Add reference photos (fabric, styling inspiration)
          </label>
          <p id="images-help" className={styles.fieldHelper}>
            Up to 4 images. JPG, PNG, WebP, or HEIC, up to 5 MB each.
          </p>
          <input
            ref={fileInputRef}
            id="reference-images"
            className={styles.fileInput}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            onChange={(event) => addImages(event.target.files)}
            disabled={!canAddImages || isSubmitting}
            aria-describedby="images-help images-error"
          />
          <button
            type="button"
            className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneDragging : ""}`}
            onClick={() => fileInputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              if (canAddImages) setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsDragging(false);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (canAddImages) addImages(event.dataTransfer.files);
            }}
            disabled={!canAddImages || isSubmitting}
            aria-describedby="images-help images-error"
          >
            <span className={styles.uploadIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M12 16V4m0 0L7 9m5-5 5 5" />
                <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
              </svg>
            </span>
            <span className={styles.uploadTitle}>
              {isProcessingImages
                ? "Preparing your images..."
                : images.length >= MAX_IMAGES
                  ? "4 images added"
                  : "Drop photos here or tap to browse"}
            </span>
            <span className={styles.uploadHint}>
              {isProcessingImages
                ? "Images are resized for faster upload."
                : "Camera or photo library on mobile"}
            </span>
          </button>
          {errors.images && (
            <p id="images-error" className={styles.error} aria-live="polite">
              {errors.images}
            </p>
          )}
          {images.length > 0 && (
            <ul className={styles.imageGrid} aria-label="Selected reference images">
              {images.map((image, index) => (
                <li className={styles.imagePreview} key={image.preview}>
                  <Image
                    src={image.preview}
                    alt={`Reference photo ${index + 1}: ${image.name}`}
                    fill
                    sizes="(max-width: 600px) 42vw, 150px"
                    unoptimized
                  />
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => removeImage(index)}
                    disabled={isSubmitting}
                    aria-label={`Remove ${image.name}`}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="phone">
            Drop a contact number <span aria-hidden="true">*</span>
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="e.g. 0803 123 4567"
            autoComplete="tel"
            inputMode="tel"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "phone-help phone-error" : "phone-help"}
            disabled={isSubmitting}
          />
          <p id="phone-help" className={styles.fieldHelper}>
            We&apos;ll reach you on this number (WhatsApp or call).
          </p>
          {errors.phone && (
            <p id="phone-error" className={styles.error} aria-live="polite">
              {errors.phone}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="name">
            Your name <span className={styles.optional}>(optional)</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="What should we call you?"
            autoComplete="name"
            maxLength={100}
            disabled={isSubmitting}
          />
        </div>

        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor="company_name">Leave this field empty</label>
          <input
            type="text"
            id="company_name"
            name="company_name"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        {errors.submit && (
          <p className={styles.submitError} role="alert" aria-live="polite">
            {errors.submit}
          </p>
        )}

        <div className={styles.actions}>
          <button
            type="submit"
            className={styles.btn}
            disabled={isSubmitting || isProcessingImages}
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Sending your request..." : "Send my request"}
          </button>
        </div>
      </form>
    </main>
  );
}
