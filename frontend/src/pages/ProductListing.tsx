import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../types";

const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "rating", label: "Highest rated" },
];

export function ProductListing() {
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("featured");
  const [category, setCategory] = useState("all");
  const q = params.get("q") || "";

  useEffect(() => {
    setLoading(true);
    api
      .get("/product")
      .then((res) => {
        const all: Product[] = res.data;
        const filtered = q
          ? all.filter(
              (p) =>
                p.name.toLowerCase().includes(q.toLowerCase()) ||
                p.brand.toLowerCase().includes(q.toLowerCase()) ||
                p.category?.toLowerCase().includes(q.toLowerCase())
            )
          : all;
        setProducts(filtered);
      })
      .finally(() => setLoading(false));
  }, [q]);

  useEffect(() => {
    setCategory("all");
  }, [q]);

  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return ["all", ...Array.from(set)];
  }, [products]);

  const visible = useMemo(() => {
    let list = category === "all" ? products : products.filter((p) => p.category === category);
    list = [...list];
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    return list;
  }, [products, category, sort]);

  return (
    <div>
      <div className="border-b border-(--color-line) px-4 pb-8 pt-10 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-7xl">
          <span className="eyebrow">{q ? "Search" : "Catalog"}</span>
          <h1 className="mt-3 font-display text-5xl italic leading-none sm:text-7xl">
            {q ? `"${q}"` : "The Edit"}
          </h1>
          {!loading && (
            <p className="mt-3 text-sm text-(--color-muted)">
              {visible.length} {visible.length === 1 ? "piece" : "pieces"}
              {q ? " found" : " in the current collection"}
            </p>
          )}
        </div>
      </div>

      {!loading && products.length > 0 && (
        <div className="sticky top-[var(--nav-h)] z-20 border-b border-(--color-line) bg-(--color-paper)/92 px-4 py-3 backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs capitalize transition-colors ${
                    category === c
                      ? "border-(--color-ink) bg-(--color-ink) text-(--color-paper)"
                      : "border-(--color-line) text-(--color-muted) hover:border-(--color-ink) hover:text-(--color-ink)"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-md border border-(--color-line) bg-(--color-paper) px-3 py-1.5 text-xs"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        {loading ? (
          <p className="text-(--color-muted)">Loading...</p>
        ) : visible.length === 0 ? (
          <p className="text-(--color-muted)">No products found.</p>
        ) : (
          <div className="masonry">
            {visible.map((p, i) => (
              <ProductCard key={p._id} product={p} tall={i % 5 === 0} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
