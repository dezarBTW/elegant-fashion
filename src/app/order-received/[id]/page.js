import ReceiptConfirmation from "./ReceiptConfirmation";

export const metadata = { title: "Confirm order received", robots: { index: false, follow: false }, referrer: "no-referrer" };

export default async function OrderReceived({ params }) {
  const { id } = await params;
  return <ReceiptConfirmation orderId={id} />;
}
