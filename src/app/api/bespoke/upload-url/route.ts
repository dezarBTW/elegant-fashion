import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const BUCKET_NAME = "bespoke-requests";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 4;
const MIME_BY_EXTENSION: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".heic": ["image/heic", "image/heif"],
  ".heif": ["image/heic", "image/heif"],
};

const fileSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1),
  size: z.number().int().positive().max(MAX_FILE_SIZE),
});

const legacyRequestSchema = z.object({
  fileNames: z.array(z.string().trim().min(1).max(255)).max(MAX_FILES),
  fileTypes: z.array(z.string().trim().min(1)).max(MAX_FILES),
});

const requestSchema = z.object({
  files: z.array(fileSchema).min(1).max(MAX_FILES),
});

const inMemoryRateLimit = new Map<string, { count: number; resetAt: number }>();

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

function getClientIp(request: NextRequest) {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

async function isRateLimited(request: NextRequest) {
  const ip = getClientIp(request);
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ip}:bespoke-upload`),
  );
  const ipHash = Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin.rpc(
      "consume_bespoke_request_rate_limit",
      { p_ip_hash: ipHash },
    );
    if (error) {
      console.warn("Falling back to in-memory rate limit for bespoke uploads:", error.message);
      return false;
    }
    return data === false;
  } catch (error) {
    console.warn("Supabase rate limit not available; using in-memory fallback.", error);
  }

  const now = Date.now();
  const existing = inMemoryRateLimit.get(ipHash);
  if (!existing || existing.resetAt <= now) {
    inMemoryRateLimit.set(ipHash, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }

  if (existing.count >= 5) {
    return true;
  }

  existing.count += 1;
  inMemoryRateLimit.set(ipHash, existing);
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const legacyRequest = legacyRequestSchema.safeParse(body);
    if (legacyRequest.success) {
      const { fileNames, fileTypes } = legacyRequest.data;
      if (fileNames.length !== fileTypes.length) {
        return NextResponse.json(
          { error: "The supplied image metadata is invalid." },
          { status: 400 },
        );
      }
      const files = fileNames.map((fileName, index) => ({
        fileName,
        contentType: fileTypes[index],
        size: MAX_FILE_SIZE,
      }));
      const parsed = requestSchema.safeParse({ files });
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Choose up to 4 images, each no larger than 5 MB." },
          { status: 400 },
        );
      }
      const validFiles = parsed.data.files;
      for (const file of validFiles) {
        const extension = file.fileName
          .slice(file.fileName.lastIndexOf("."))
          .toLowerCase();
        const allowedMimeTypes = MIME_BY_EXTENSION[extension];
        if (!allowedMimeTypes || !allowedMimeTypes.includes(file.contentType)) {
          return NextResponse.json(
            { error: `${file.fileName} is not a supported image type.` },
            { status: 400 },
          );
        }
      }

      const uploadData = await Promise.all(
        validFiles.map(async (file) => {
          const extension = file.fileName
            .slice(file.fileName.lastIndexOf("."))
            .toLowerCase();
          const path = `requests/${crypto.randomUUID()}${extension}`;
          const supabaseAdmin = getSupabaseAdmin();
          const { data, error } = await supabaseAdmin.storage
            .from(BUCKET_NAME)
            .createSignedUploadUrl(path, { upsert: false });

          if (error || !data?.signedUrl) {
            throw new Error(
              `Failed to generate a signed upload URL: ${error?.message || "No URL returned"}`,
            );
          }

          return { path, signedUrl: data.signedUrl };
        }),
      );

      return NextResponse.json({ uploadData });
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Choose up to 4 images, each no larger than 5 MB." },
        { status: 400 },
      );
    }

    const files = parsed.data.files;
    for (const file of files) {
      const extension = file.fileName
        .slice(file.fileName.lastIndexOf("."))
        .toLowerCase();
      const allowedMimeTypes = MIME_BY_EXTENSION[extension];
      if (!allowedMimeTypes || !allowedMimeTypes.includes(file.contentType)) {
        return NextResponse.json(
          { error: `${file.fileName} is not a supported image type.` },
          { status: 400 },
        );
      }
    }

    if (await isRateLimited(request)) {
      return NextResponse.json(
        { error: "Too many image upload requests. Please try again in an hour." },
        { status: 429 },
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const uploadData = await Promise.all(
      files.map(async (file) => {
        const extension = file.fileName
          .slice(file.fileName.lastIndexOf("."))
          .toLowerCase();
        const path = `requests/${crypto.randomUUID()}${extension}`;
        const { data, error } = await supabaseAdmin.storage
          .from(BUCKET_NAME)
          .createSignedUploadUrl(path, { upsert: false });

        if (error || !data?.signedUrl) {
          throw new Error(
            `Failed to generate a signed upload URL: ${error?.message || "No URL returned"}`,
          );
        }

        return { path, signedUrl: data.signedUrl };
      }),
    );

    return NextResponse.json({ uploadData });
  } catch (error) {
    console.error("Bespoke signed upload URL error:", error);
    return NextResponse.json(
      { error: "Could not prepare your images. Please try again." },
      { status: 500 },
    );
  }
}
