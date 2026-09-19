import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { ProductCard } from "../components/ProductCard";
import type { Product, RecommendedProduct } from "../types";

const HERO_IMAGE = "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80";

const WORLDS = [
  { label: "Women", query: "women", img: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=900&q=80" },
  { label: "Men", query: "men", img: "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=900&q=80" },
  { label: "Footwear", query: "shoes", img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=900&q=80" },
  { label: "Accessories", query: "accessories", img: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=900&q=80" },
];

export function Home() {
  const { user } = useAuth();
  const [recommended, setRecommended] = useState<RecommendedProduct[]>([]);
  const [continueShopping, setContinueShopping] = useState<{ productId: Product }[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<{ productId: Product }[]>([]);
  const [heroImgError, setHeroImgError] = useState(false);

  useEffect(() => {
    api.get("/recommendations").then((res) => setRecommended(res.data));
    if (user) {
      api.get("/history/continue-shopping").then((res) => setContinueShopping(res.data)).catch(() => {});
      api.get("/history").then((res) => setRecentlyViewed(res.data)).catch(() => {});
    } else {
      setContinueShopping([]);
      setRecentlyViewed([]);
    }
  }, [user]);

  // Real-time sync: backend emits this on every view/remove/merge, on this
  // device or any other one logged into the same account.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();
    if (!socket) return;
    const handler = (updated: { productId: Product }[]) => {
      setRecentlyViewed(updated);
      api.get("/history/continue-shopping").then((res) => setContinueShopping(res.data)).catch(() => {});
    };
    socket.on("recently-viewed:updated", handler);
    return () => {
      socket.off("recently-viewed:updated", handler);
    };
  }, [user]);

  return (
    <div>
      {/* Full-viewport cinematic hero — bleeds behind the transparent floating nav */}
      <section className="relative flex min-h-[100dvh] items-end overflow-hidden bg-(--color-ink)">
        <div className="absolute inset-0">
          {!heroImgError && (
            <img
              src={HERO_IMAGE}
              alt="Fashion campaign"
              onError={() => setHeroImgError(true)}
              className="h-full w-full scale-105 object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/50" />
        </div>

        <span className="vertical-label absolute right-6 top-28 hidden text-white/70 sm:block">
          Autumn / Winter — 2026
        </span>

        <div className="relative z-10 w-full px-4 pb-16 sm:px-8 sm:pb-24">
          <div className="mx-auto max-w-7xl">
            <span className="eyebrow text-white/70">The New Season</span>
            <h1 className="mt-4 font-display text-[15vw] font-medium italic leading-[0.88] tracking-tight text-white sm:text-[7.5rem] sm:leading-[0.85]">
              Dress with
              <br />
              intent.
            </h1>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-6">
              <p className="max-w-sm text-sm leading-relaxed text-white/75">
                Curated fashion, updated daily — recommendations that learn
                from what you browse, not just what's trending.
              </p>
              <Link to="/products" className="btn btn-accent">
                Explore the edit <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-white/60">
          <ArrowDown size={16} className="animate-bounce" />
        </div>
      </section>

      {/* Category worlds — large hover panels, not pills */}
      <section className="border-b border-(--color-line) px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <span className="eyebrow eyebrow--accent">Enter a world</span>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {WORLDS.map((w) => (
              <Link
                key={w.label}
                to={`/products?q=${encodeURIComponent(w.query)}`}
                className="group relative block aspect-[3/4] overflow-hidden rounded-sm bg-(--color-paper-sunken) transition-transform duration-500 hover:-translate-y-1"
              >
                <img
                  src={w.img}
                  alt={w.label}
                  onError={(e) => (e.currentTarget.style.display = "none")}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/5 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
                  <span className="font-display text-2xl italic text-white">{w.label}</span>
                  <ArrowRight size={16} className="mb-1 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {continueShopping.length > 0 && (
        <Section title="Continue shopping">
          <Masonry items={continueShopping.map((i) => i.productId)} />
        </Section>
      )}

      {recentlyViewed.length > 0 && (
        <Section title="Recently viewed">
          <Masonry items={recentlyViewed.map((i) => i.productId)} />
        </Section>
      )}

      <Section title={user ? "Picked for you" : "Trending now"} last>
        <Masonry items={recommended} />
      </Section>
    </div>
  );
}

function Section({ title, children, last }: { title: string; children: React.ReactNode; last?: boolean }) {
  return (
    <section className={`mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 ${!last ? "border-b border-(--color-line)" : ""}`}>
      <div className="mb-8 flex items-end justify-between">
        <div>
          <span className="eyebrow">Edit</span>
          <h2 className="mt-2 font-display text-3xl italic sm:text-4xl">{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

// Asymmetric editorial catalog — every third tile runs tall, breaking the
// grid rhythm instead of a uniform column count.
function Masonry({ items }: { items: (Product | RecommendedProduct)[] }) {
  return (
    <div className="masonry">
      {items.map((p, i) => (
        <ProductCard key={p._id} product={p} tall={i % 5 === 0} />
      ))}
    </div>
  );
}
