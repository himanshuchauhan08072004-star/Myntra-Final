import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import type { Order } from "../types";

const STATUS_LABEL: Record<Order["status"], string> = {
  pending: "Payment pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  refunded: "Refunded",
};

const SORT_OPTIONS = [
  { value: "placedAt:desc", label: "Newest first" },
  { value: "placedAt:asc", label: "Oldest first" },
  { value: "total:desc", label: "Total: high to low" },
  { value: "total:asc", label: "Total: low to high" },
];

export function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState("placedAt:desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    const [sortBy, sortDir] = sort.split(":");
    setLoading(true);
    api
      .get(`/order/user/${user._id}`, {
        params: {
          page,
          pageSize: 10,
          ...(status && { status }),
          ...(paymentMethod && { paymentMethod }),
          ...(dateFrom && { dateFrom }),
          ...(dateTo && { dateTo }),
          sortBy,
          sortDir,
        },
      })
      .then((res) => {
        setOrders(res.data.data);
        setPagination(res.data.pagination);
      })
      .finally(() => setLoading(false));
  }, [user, status, paymentMethod, dateFrom, dateTo, sort, page]);

  // Any filter change resets back to page 1 — otherwise you can land on an
  // empty page 3 of a now-3-result filtered list.
  function updateFilter(setter: (v: string) => void) {
    return (value: string) => {
      setter(value);
      setPage(1);
    };
  }

  const selectClass = "rounded-md border border-(--color-line) bg-(--color-paper) px-3 py-1.5 text-sm";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <span className="eyebrow">Account</span>
      <h1 className="mt-2 font-display text-3xl italic sm:text-4xl">Your orders</h1>

      <div className="mt-8 flex flex-wrap items-center gap-3 border-b border-(--color-line) pb-6">
        <select className={selectClass} value={status} onChange={(e) => updateFilter(setStatus)(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={paymentMethod}
          onChange={(e) => updateFilter(setPaymentMethod)(e.target.value)}
        >
          <option value="">All payment methods</option>
          <option value="card">Card</option>
        </select>

        <label className="flex items-center gap-2 text-sm text-(--color-muted)">
          From
          <input
            type="date"
            className={selectClass}
            value={dateFrom}
            onChange={(e) => updateFilter(setDateFrom)(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-(--color-muted)">
          To
          <input
            type="date"
            className={selectClass}
            value={dateTo}
            onChange={(e) => updateFilter(setDateTo)(e.target.value)}
          />
        </label>

        <select className={`${selectClass} ml-auto`} value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="mt-8 text-(--color-muted)">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="mt-8 text-(--color-muted)">No orders match these filters.</p>
      ) : (
        <>
          <div className="mt-2 divide-y divide-(--color-line)">
            {orders.map((o) => (
              <Link
                key={o._id}
                to={`/orders/${o._id}`}
                className="group flex items-center justify-between py-5 transition-colors hover:bg-(--color-paper-sunken)/40"
              >
                <div>
                  <p className="font-medium">{o.invoiceNumber}</p>
                  <p className="text-sm text-(--color-muted)">{new Date(o.placedAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="stamp text-xs">{STATUS_LABEL[o.status]}</p>
                    <p className="mt-1 font-mono text-sm">₹{(o.totalCents / 100).toFixed(2)}</p>
                  </div>
                  <ArrowRight size={16} className="text-(--color-muted) transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <button
                className="disabled:opacity-40"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className="text-(--color-muted)">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} orders
              </span>
              <button
                className="disabled:opacity-40"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
