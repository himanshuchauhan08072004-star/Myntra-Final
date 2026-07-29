import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import type { Order } from "../types";

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

  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16">Loading...</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-display)] text-3xl italic">{order.invoiceNumber}</h1>
        <button onClick={handleDownloadInvoice} className="text-sm text-(--color-berry)">
          Download invoice
        </button>
      </div>
      <p className="stamp mt-2 inline-block text-xs">{order.status}</p>

      <div className="mt-6 space-y-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex justify-between border-b border-(--color-line) pb-3 text-sm dark:border-(--color-line)">
            <span>
              {item.productName} {item.size ? `(${item.size}${item.color ? `, ${item.color}` : ""})` : ""} x{item.quantity}
            </span>
            <span className="font-[family-name:var(--font-mono)]">
              ₹{((item.unitPriceCents * item.quantity) / 100).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex justify-between font-medium">
        <span>Total</span>
        <span className="font-[family-name:var(--font-mono)]">₹{(order.totalCents / 100).toFixed(2)}</span>
      </div>

      <div className="mt-6 flex gap-3">
        {["pending", "processing"].includes(order.status) && (
          <button onClick={handleCancel} className="rounded-full border border-(--color-line) px-4 py-2 text-sm dark:border-(--color-line)">
            Cancel order
          </button>
        )}
        {order.status === "delivered" && (
          <button onClick={handleReturn} className="rounded-full border border-(--color-line) px-4 py-2 text-sm dark:border-(--color-line)">
            Return
          </button>
        )}
        <button onClick={handleReorder} className="rounded-full bg-(--color-berry) px-4 py-2 text-sm text-white">
          Reorder
        </button>
      </div>
      {message && <p className="mt-3 text-sm text-(--color-muted)">{message}</p>}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium">Order history</h2>
        <div className="space-y-1 text-sm text-(--color-muted)">
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
