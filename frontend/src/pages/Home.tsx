import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";
import { useAuth } from "../context/AuthContext";
import { ProductCard } from "../components/ProductCard";
import type { Product, RecommendedProduct } from "../types";

const HERO_IMAGE = "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80";

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
      {/* Hero — signature stamp element, editorial fashion-mag composition */}
      <section className="border-b border-(--color-line) dark:border-(--color-line)">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-2 md:items-center">
          <div>
            <span className="stamp text-(--color-berry)">New Season</span>
            <h1 className="mt-4 font-[family-name:var(--font-display)] text-5xl italic leading-tight sm:text-6xl">
              Dress with intent.
            </h1>
            <p className="mt-4 max-w-md text-(--color-muted)">
              Curated fashion, updated daily. Recommendations that actually
              learn from what you browse — not just what's trending.
            </p>
            <Link
              to="/products"
              className="mt-6 inline-block rounded-full bg-(--color-berry) px-6 py-3 text-sm text-white"
            >
              Shop the edit
            </Link>
          </div>
          <div className="aspect-[4/5] overflow-hidden rounded-md bg-(--color-line)">
            {!heroImgError && (
              <img
                src={HERO_IMAGE}
                alt="Editorial fashion look"
                onError={() => setHeroImgError(true)}
                className="h-full w-full object-cover"
              />
            )}
          </div>
        </div>
      </section>

      {continueShopping.length > 0 && (
        <Section title="Continue shopping">
          <Grid>
            {continueShopping.map((item) => (
              <ProductCard key={item.productId._id} product={item.productId} />
            ))}
          </Grid>
        </Section>
      )}

      {recentlyViewed.length > 0 && (
        <Section title="Recently viewed">
          <Grid>
            {recentlyViewed.map((item) => (
              <ProductCard key={item.productId._id} product={item.productId} />
            ))}
          </Grid>
        </Section>
      )}

      <Section title={user ? "Picked for you" : "Trending now"}>
        <Grid>
          {recommended.map((p) => (
            <ProductCard key={p._id} product={p} />
          ))}
        </Grid>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl italic">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">{children}</div>;
}
