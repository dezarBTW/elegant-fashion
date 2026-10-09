import { createClient } from "@supabase/supabase-js";
import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET_NAME = "bespoke-requests";
const MAX_IMAGES = 4;
const PHONE_REGEX = /^(?:0[789]\d{9}|\+234[789]\d{9})$/;
const STORED_IMAGE_PATH_REGEX =
  /^requests\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|jpeg|png|webp|heic|heif)$/i;

const submitSchema = z.object({
  name: z
    .string()
    .trim()
    .max(100, "Your name must be 100 characters or fewer.")
    .nullish()
    .transform((value) => value || null),
  phone: z
    .string()
    .trim()
    .transform((value) => value.replace(/[\s()-]/g, ""))
    .transform((value) =>
      value.startsWith("0") ? `+234${value.slice(1)}` : value,
    )
    .pipe(
      z
        .string()
        .regex(PHONE_REGEX, "Enter a valid Nigerian mobile number."),
    ),
  description: z
    .string()
    .trim()
    .min(20, "Please add at least 20 characters.")
    .max(2000, "Your description must be 2000 characters or fewer."),
  imagePaths: z
    .array(z.string().regex(STORED_IMAGE_PATH_REGEX, "Invalid image path."))
    .max(MAX_IMAGES, "You can attach up to 4 images.")
    .refine((paths) => new Set(paths).size === paths.length, {
      message: "Image paths must be unique.",
    }),
  company_name: z.string().max(200).optional().nullable(),
});

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase server environment variables are not configured.");
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function getWhatsAppLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

async function sendNotificationEmail(data: {
  name: string | null;
  phone: string;
  description: string;
  imagePaths: string[];
  createdAt: string;
  requestId: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.BESPOKE_NOTIFY_EMAIL;
  const sender = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !recipient || !sender) {
    console.warn(
      "Bespoke email notification is disabled: configure RESEND_API_KEY, BESPOKE_NOTIFY_EMAIL, and RESEND_FROM_EMAIL.",
    );
    return;
  }

  const supabaseAdmin = getSupabaseAdmin();
  const attachments: { filename: string; content: string }[] = [];
  const imageLinks: { filename: string; url: string }[] = [];

  const imageResults = await Promise.all(
    data.imagePaths.map(async (path) => {
      const fileName = path.split("/").pop() || "reference-image";
      let link: { filename: string; url: string } | null = null;
      try {
        const { data: signedData, error: signedError } =
          await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .createSignedUrl(path, 7 * 24 * 60 * 60);
        if (signedError || !signedData?.signedUrl) {
          throw new Error(
            signedError?.message || `Could not sign image link for ${path}`,
          );
        }

        link = { filename: fileName, url: signedData.signedUrl };
        const imageResponse = await fetch(signedData.signedUrl, {
          signal: AbortSignal.timeout(12000),
        });
        if (!imageResponse.ok) {
          throw new Error(`Could not download ${fileName} for email attachment.`);
        }
        const content = Buffer.from(await imageResponse.arrayBuffer()).toString(
          "base64",
        );
        return {
          link,
          attachment: { filename: fileName, content },
        };
      } catch (error) {
        console.error(
          `Could not prepare bespoke reference image ${path} for email:`,
          error,
        );
        return { link, attachment: null };
      }
    }),
  );

  for (const result of imageResults) {
    if (result.link) imageLinks.push(result.link);
    if (result.attachment) attachments.push(result.attachment);
  }

  const time = new Date(data.createdAt).toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });
  const safeName = escapeHtml(data.name || "Not provided");
  const safePhone = escapeHtml(data.phone);
  const safeDescription = escapeHtml(data.description);
  const whatsappUrl = getWhatsAppLink(data.phone);
  const telUrl = `tel:${data.phone}`;
  const linksText = imageLinks.length
    ? imageLinks.map(({ filename, url }) => `${filename}: ${url}`).join("\n")
    : data.imagePaths.length
      ? "Image links could not be generated."
      : "No reference images attached.";
  const linksHtml = imageLinks.length
    ? `<ul>${imageLinks
        .map(
          ({ filename, url }) =>
            `<li><a href="${escapeHtml(url)}">${escapeHtml(filename)}</a></li>`,
        )
        .join("")}</ul>`
    : data.imagePaths.length
      ? "<p>Image links could not be generated.</p>"
      : "<p>No reference images attached.</p>";
  const subjectName = (data.name || data.phone)
    .replace(/[\r\n]+/g, " ")
    .slice(0, 100);
  const subject = `New bespoke request: ${subjectName}`;
  const text = [
    "New bespoke request",
    "",
    `Name: ${data.name || "Not provided"}`,
    `Phone: ${data.phone}`,
    `Call: ${telUrl}`,
    `WhatsApp: ${whatsappUrl}`,
    "",
    "Description:",
    data.description,
    "",
    `Submitted: ${time}`,
    "",
    "Reference images (signed links valid for 7 days):",
    linksText,
  ].join("\n");
  const html = `
    <h1>New bespoke request</h1>
    <p><strong>Name:</strong> ${safeName}</p>
    <p><strong>Phone:</strong> <a href="${telUrl}">${safePhone}</a></p>
    <p><a href="${whatsappUrl}">Message on WhatsApp</a></p>
    <h2>Description</h2>
    <p style="white-space:pre-wrap">${safeDescription}</p>
    <p><strong>Submitted:</strong> ${escapeHtml(time)}</p>
    <h2>Reference images (signed links valid for 7 days)</h2>
    ${linksHtml}
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: [recipient],
      subject,
      text,
      html,
      ...(attachments.length ? { attachments } : {}),
    }),
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Resend returned ${response.status}: ${responseText}`);
  }

  console.info(
    `Bespoke notification sent for request ${data.requestId}; ${attachments.length}/${data.imagePaths.length} image attachments included.`,
  );
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Please check the highlighted fields and try again.",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  if (parsed.data.company_name?.trim()) {
    return NextResponse.json({
      success: true,
      phone: parsed.data.phone,
    });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const ipDigest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(getClientIp(request)),
    );
    const ipHash = Array.from(new Uint8Array(ipDigest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc(
      "consume_bespoke_request_rate_limit",
      { p_ip_hash: ipHash },
    );

    if (rateLimitError) {
      console.error("Bespoke request rate limit check failed:", rateLimitError);
      return NextResponse.json(
        { error: "We could not accept your request right now. Please try again shortly." },
        { status: 503 },
      );
    }
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again in an hour." },
        { status: 429 },
      );
    }

    for (const path of parsed.data.imagePaths) {
      const fileName = path.split("/").pop();
      const { data: storedFiles, error: storageError } =
        await supabaseAdmin.storage.from(BUCKET_NAME).list("requests", {
          limit: 100,
          search: fileName,
        });

      if (storageError) {
        throw new Error(`Could not verify an uploaded image: ${storageError.message}`);
      }
      if (!storedFiles?.some((file) => file.name === fileName)) {
        return NextResponse.json(
          { error: "One of your reference images could not be found. Please upload it again." },
          { status: 400 },
        );
      }
    }

    const { name, phone, description, imagePaths } = parsed.data;
    const { data: savedRequest, error: databaseError } = await supabaseAdmin
      .from("bespoke_requests")
      .insert({
        name,
        phone,
        description,
        image_paths: imagePaths,
        status: "new",
        ip_hash: ipHash,
      })
      .select("id, created_at")
      .single();

    if (databaseError) {
      console.error("Could not save bespoke request:", databaseError);
      return NextResponse.json(
        { error: "Your request could not be saved. Please try again." },
        { status: 500 },
      );
    }

    after(async () => {
      try {
        await sendNotificationEmail({
          name,
          phone,
          description,
          imagePaths,
          createdAt: savedRequest.created_at,
          requestId: savedRequest.id,
        });
      } catch (error) {
        console.error(
          `Bespoke request ${savedRequest.id} was saved, but its email notification failed:`,
          error,
        );
      }
    });

    return NextResponse.json({
      success: true,
      requestId: savedRequest.id,
      phone,
    });
  } catch (error) {
    console.error("Bespoke request submission failed:", error);
    return NextResponse.json(
      { error: "Your request could not be sent. Please try again." },
      { status: 500 },
    );
  }
}
