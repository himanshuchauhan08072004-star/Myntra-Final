import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star, Heart } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { pushGuestView } from "../context/AuthContext";
import { ProductCard } from "../components/ProductCard";
import type { Product, Review, RecommendedProduct } from "../types";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToBag } = useCart();
  const { isWishlisted, toggle } = useWishlist();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState<string>("");
  const [color, setColor] = useState<string>("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [related, setRelated] = useState<RecommendedProduct[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;
    api.get(`/product/${id}`).then((res) => {
      setProduct(res.data);
      setColor(res.data.colors?.[0] || "");
      setImgError(false);
      setActiveImage(0);
    });
    api.get(`/reviews/product/${id}`).then((res) => setReviews(res.data.data));
    api.get("/recommendations").then((res) => setRelated(res.data));

    if (user) {
      api.post("/history", { productId: id }).catch(() => {});
    } else {
      pushGuestView(id);
    }
  }, [id, user]);

  async function handleAddToBag() {
    if (!user) return setMessage("Log in to add items to your bag");
    if (!size) return setMessage("Select a size first");
    try {
      await addToBag(id!, size, color || undefined);
      setMessage("Added to bag");
    } catch (err: any) {
      setMessage(err.response?.data?.message || "Could not add to bag");
    }
  }

  const wishlisted = id ? isWishlisted(id) : false;

  async function handleWishlist() {
    if (!user) return setMessage("Log in to save to wishlist");
    const wasWishlisted = wishlisted;
    const result = await toggle(id!);
    setMessage(
      result.ok
        ? wasWishlisted
          ? "Removed from wishlist"
          : "Added to wishlist"
        : result.error || "Could not update wishlist — please try again"
    );
  }

  if (!product) return <div className="mx-auto max-w-7xl px-4 py-32 text-(--color-muted)">Loading...</div>;

  const images = product.images?.length ? product.images : [];

  return (
    <div>
      <div className="mx-auto grid max-w-[100rem] gap-0 px-4 pb-16 sm:px-6 lg:grid-cols-[56px_1fr_400px] lg:gap-6">
        {/* Left rail — vertical editorial label, desktop only */}
        <div className="hidden pt-4 lg:block">
          <div className="sticky top-32 flex flex-col items-center gap-6">
            <span className="vertical-label">{product.brand}</span>
            <button
              onClick={handleWishlist}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
              className="icon-btn"
            >
              <Heart size={17} className={wishlisted ? "fill-(--color-berry) text-(--color-berry)" : ""} />
            </button>
          </div>
        </div>

        {/* Center — the product is the hero of the page */}
        <div className="pt-4">
          <div className="aspect-[4/5] overflow-hidden rounded-sm bg-(--color-paper-sunken) sm:aspect-[16/10] lg:aspect-[3/4]">
            {images[activeImage] && !imgError && (
              <img
                src={images[activeImage]}
                alt={product.name}
                onError={() => setImgError(true)}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-3">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveImage(i);
                    setImgError(false);
                  }}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-sm border transition-colors ${
                    activeImage === i ? "border-(--color-ink)" : "border-(--color-line) opacity-70"
                  }`}
                >
                  <img src={img} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="mt-2 lg:hidden">
            <span className="eyebrow">{product.brand}</span>
          </div>
        </div>

        {/* Right — floating purchase panel */}
        <div className="lg:sticky lg:top-28 lg:self-start lg:pt-4">
          <h1 className="mt-4 font-display text-3xl italic leading-tight sm:text-4xl lg:mt-0">{product.name}</h1>
          <div className="mt-3 flex items-center gap-1.5 text-sm text-(--color-muted)">
            <Star size={14} className="fill-(--color-mustard) text-(--color-mustard)" />
            {product.rating.toFixed(1)} · {product.reviewCount} reviews
          </div>
          <div className="mt-5 flex items-center gap-3">
            <span className="font-mono text-2xl">₹{product.price}</span>
            {product.originalPrice && (
              <span className="font-mono text-(--color-muted) line-through">₹{product.originalPrice}</span>
            )}
            {product.discount && <span className="stamp text-(--color-berry)">{product.discount} off</span>}
          </div>

          <p className="mt-5 text-sm leading-relaxed text-(--color-muted)">{product.description}</p>

          {product.colors && product.colors.length > 0 && (
            <div className="mt-7">
              <p className="mb-2 text-xs uppercase tracking-wide text-(--color-muted)">Color{color ? `: ${color}` : ""}</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={c}
                    aria-pressed={color === c}
                    className={`rounded-sm border px-4 py-2 text-sm transition-colors ${
                      color === c
                        ? "border-(--color-ink) bg-(--color-ink) text-(--color-paper)"
                        : "border-(--color-line) hover:border-(--color-ink)"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-wide text-(--color-muted)">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-sm border px-4 py-2 text-sm transition-colors ${
                    size === s
                      ? "border-(--color-ink) bg-(--color-ink) text-(--color-paper)"
                      : "border-(--color-line) hover:border-(--color-ink)"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <p className="mt-3 text-xs text-(--color-muted)">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>

          <div className="mt-7 flex gap-3">
            <button onClick={handleAddToBag} disabled={product.stock === 0} className="btn btn-accent flex-1">
              Add to bag
            </button>
            <button
              onClick={handleWishlist}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
              className="btn btn-outline lg:hidden"
            >
              <Heart size={18} className={wishlisted ? "fill-(--color-berry) text-(--color-berry)" : ""} />
            </button>
          </div>
          {message && <p className="mt-3 text-sm text-(--color-muted)">{message}</p>}
        </div>
      </div>

      <section className="mx-auto max-w-3xl border-t border-(--color-line) px-4 py-16 sm:px-6">
        <span className="eyebrow">Word on the street</span>
        <h2 className="mt-2 mb-6 font-display text-2xl italic">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-(--color-muted)">No reviews yet — be the first.</p>
        ) : (
          <div className="space-y-5">
            {reviews.map((r) => (
              <div key={r._id} className="border-b border-(--color-line) pb-5">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < r.rating ? "fill-(--color-mustard) text-(--color-mustard)" : "text-(--color-line)"} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.userId.fullName}</span>
                  {r.verifiedPurchase && <span className="stamp text-xs text-(--color-berry)">Verified</span>}
                </div>
                {r.title && <p className="mt-1.5 font-medium">{r.title}</p>}
                {r.comment && <p className="text-sm text-(--color-muted)">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mx-auto max-w-7xl border-t border-(--color-line) px-4 py-16 sm:px-6">
          <span className="eyebrow">Complete the look</span>
          <h2 className="mt-2 mb-6 font-display text-2xl italic">You might also like</h2>
          <div className="masonry">
            {related.filter((p) => p._id !== id).slice(0, 5).map((p, i) => (
              <ProductCard key={p._id} product={p} tall={i % 5 === 0} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
