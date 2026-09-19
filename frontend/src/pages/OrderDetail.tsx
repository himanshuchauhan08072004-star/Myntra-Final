import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import type { Order } from "../types";

const TIMELINE_STEPS: Order["status"][] = ["pending", "processing", "shipped", "delivered"];
const STEP_LABEL: Partial<Record<Order["status"], string>> = {
  pending: "Order placed",
  processing: "Payment confirmed",
  shipped: "Shipped",
  delivered: "Delivered",
};

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await api.get(`/order/${id}`);
    setOrder(res.data.order);
  }

  useEffect(() => {
    refresh();
  }, [id]);

  // Live status updates — order flips pending -> processing once Stripe's
  // webhook confirms payment server-side, reflected here without a refresh.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (payload: { orderId: string }) => {
      if (payload.orderId === id) refresh();
    };
    socket.on("order:status-change", handler);
    return () => {
      socket.off("order:status-change", handler);
    };
  }, [id]);

  async function handleCancel() {
    try {
      await api.post(`/order/${id}/cancel`, { reason: "Changed my mind" });
      setMessage("Cancellation submitted");
      refresh();
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Could not cancel order");
    }
  }

  async function handleReturn() {
    try {
      await api.post(`/order/${id}/return`, { reason: "Not as expected" });
      setMessage("Return request submitted");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Could not request return");
    }
  }

  async function handleReorder() {
    try {
      await api.post(`/order/${id}/reorder`);
      setMessage("Items added as a new order");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Could not reorder");
    }
  }

  async function handleDownloadInvoice() {
    try {
      const res = await api.get(`/order/${id}/invoice.pdf`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${order?.invoiceNumber || "invoice"}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Could not download invoice");
    }
  }

  if (!order) return <div className="mx-auto max-w-3xl px-4 py-24 text-(--color-muted)">Loading...</div>;

  const stepIndex = TIMELINE_STEPS.indexOf(order.status);
  const isTerminalOther = !TIMELINE_STEPS.includes(order.status); // cancelled / returned / refunded

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="eyebrow">Order</span>
          <h1 className="mt-2 font-display text-3xl italic sm:text-4xl">{order.invoiceNumber}</h1>
        </div>
        <button onClick={handleDownloadInvoice} className="btn btn-outline">
          <Download size={15} /> Invoice
        </button>
      </div>
      <p className="stamp mt-4 inline-block text-xs text-(--color-berry)">{order.status}</p>

      {!isTerminalOther && (
        <div className="mt-10 max-w-sm">
          {TIMELINE_STEPS.map((step, i) => (
            <div key={step} className={`journal-step ${i <= stepIndex ? "journal-step--done" : ""}`}>
              <p className={`font-display text-lg italic capitalize ${i <= stepIndex ? "" : "text-(--color-muted)"}`}>
                {STEP_LABEL[step]}
              </p>
              {i === stepIndex && (
                <p className="mt-0.5 text-xs text-(--color-berry)">Current status</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-10 space-y-3 border-t border-(--color-line) pt-6">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between border-b border-(--color-line) pb-3 text-sm">
            <span>
              {item.productName} {item.size ? `(${item.size}${item.color ? `, ${item.color}` : ""})` : ""} x{item.quantity}
            </span>
            <span className="font-mono">
              ₹{((item.unitPriceCents * item.quantity) / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between font-medium">
        <span>Total</span>
        <span className="font-mono">₹{(order.totalCents / 100).toFixed(2)}</span>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        {["pending", "processing"].includes(order.status) && (
          <button onClick={handleCancel} className="btn btn-outline">
            Cancel order
          </button>
        )}
        {order.status === "delivered" && (
          <button onClick={handleReturn} className="btn btn-outline">
            Return
          </button>
        )}
        <button onClick={handleReorder} className="btn btn-accent">
          Reorder
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-(--color-muted)">{message}</p>}

      <section className="mt-10 border-t border-(--color-line) pt-6">
        <span className="eyebrow">History</span>
        <div className="mt-3 space-y-1.5 text-sm text-(--color-muted)">
          {order.statusHistory.map((h, i) => (
            <p key={i}>
              {new Date(h.occurredAt).toLocaleString()} — {h.status} {h.note ? `(${h.note})` : ""}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
