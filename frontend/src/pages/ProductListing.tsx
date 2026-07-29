import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import type { Product } from "../types";

export function ProductListing() {
  const [params] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
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
                p.brand.toLowerCase().includes(q.toLowerCase())
            )
          : all;
        setProducts(filtered);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl italic">
        {q ? `Results for "${q}"` : "All products"}
      </h1>
      {loading ? (
        <p className="mt-8 text-(--color-muted)">Loading...</p>
      ) : products.length === 0 ? (
        <p className="mt-8 text-(--color-muted)">No products found.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {products.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
