import { NextResponse } from "next/server";
import { z } from "zod";
import { checkoutDatabase } from "@/lib/checkoutServer";
import { readAccountBody } from "@/lib/accountServer";
import {
  requireOrderAdmin,
  OrderRequestError,
} from "@/lib/orderManagement.mjs";
import { sendPaidOrderNotifications } from "@/lib/paidOrderNotifications.mjs";

export const maxDuration = 60;
export async function POST(request) {
  try {
    const db = checkoutDatabase();
    await requireOrderAdmin(request, db);
    const { orderId } = await readAccountBody(
      request,
      z.object({ orderId: z.uuid() }).strict(),
    );
    const { data: order, error } = await db
      .from("shop_orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw error;
    if (
      !order ||
      order.payment_status !== "paid" ||
      !order.email_tracking_started_at
    )
      throw new OrderRequestError(
        "No tracked paid-order notification is available for this order.",
        409,
      );
    const result = await sendPaidOrderNotifications(db, order);
    return NextResponse.json(
      {
        ...result,
        message: result.failed
          ? "Some notifications are unsent, in progress, or require provider reconciliation. Inspect delivery records before retrying older attempts."
          : "Payment notifications are sent.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (!(error instanceof OrderRequestError))
      console.error(
        "Order email retry failed",
        error.code || "notification_error",
      );
    return NextResponse.json(
      {
        error:
          error instanceof OrderRequestError
            ? error.message
            : "Unable to retry payment notifications.",
      },
      { status: error.status || 503 },
    );
  }
}
