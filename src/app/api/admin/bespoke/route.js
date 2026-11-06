import { NextResponse } from "next/server";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { readAccountBody } from "@/lib/accountServer";
import {
  requireOrderAdmin,
  OrderRequestError,
} from "@/lib/orderManagement.mjs";
import { bespokeReviewSchema } from "@/lib/bespokeWorkflow.mjs";

export async function PATCH(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const input = await readAccountBody(request, bespokeReviewSchema);
    const { data, error } = await db
      .from("bespoke_requests")
      .update({ status: input.status })
      .eq("id", input.id)
      .eq("status", input.expectedStatus)
      .select("id,status")
      .maybeSingle();
    if (error?.code === "23514")
      throw new OrderRequestError("This status change is not allowed.", 409);
    if (error) throw error;
    if (!data)
      throw new OrderRequestError(
        "This request changed. Refresh before updating it.",
        409,
      );
    return NextResponse.json(
      { request: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (!(error instanceof OrderRequestError))
      console.error("Bespoke review failed", error.code);
    return NextResponse.json(
      {
        error:
          error instanceof OrderRequestError
            ? error.message
            : "Unable to update this request.",
      },
      { status: error.status || 503 },
    );
  }
}
