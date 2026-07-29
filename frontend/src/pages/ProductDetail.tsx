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

  useEffect(() => {
    if (!id) return;
    api.get(`/product/${id}`).then((res) => {
      setProduct(res.data);
      setColor(res.data.colors?.[0] || "");
      setImgError(false);
    });
    api.get(`/reviews/product/${id}`).then((res) => setReviews(res.data.data));
    api.get("/recommendations").then((res) => setRelated(res.data));

    // Recently viewed: logged-in users sync to server, guests keep local
    // history that gets merged server-side on their next login.
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

  if (!product) return <div className="mx-auto max-w-7xl px-4 py-16">Loading...</div>;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="aspect-[3/4] rounded-md bg-(--color-line)">
          {product.images?.[0] && !imgError && (
            <img
              src={product.images[0]}
              alt={product.name}
              onError={() => setImgError(true)}
              className="h-full w-full rounded-md object-cover"
            />
          )}
        </div>
        <div>
          <p className="text-(--color-muted)">{product.brand}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl italic">{product.name}</h1>
          <div className="mt-2 flex items-center gap-1 text-sm text-(--color-muted)">
            <Star size={14} className="fill-(--color-mustard) text-(--color-mustard)" />
            {product.rating.toFixed(1)} · {product.reviewCount} reviews
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-[family-name:var(--font-mono)] text-2xl">₹{product.price}</span>
            {product.originalPrice && (
              <span className="text-(--color-muted) line-through">₹{product.originalPrice}</span>
            )}
            {product.discount && <span className="stamp text-(--color-berry)">{product.discount} off</span>}
          </div>

          <p className="mt-4 text-sm text-(--color-muted)">{product.description}</p>

          {product.colors && product.colors.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Color{color ? `: ${color}` : ""}</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={c}
                    aria-pressed={color === c}
                    className={`rounded-md border px-4 py-2 text-sm ${
                      color === c
                        ? "border-(--color-ink) bg-(--color-ink) text-white dark:border-white dark:bg-white dark:text-black"
                        : "border-(--color-line) dark:border-(--color-line)"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6">
            <p className="mb-2 text-sm font-medium">Size</p>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`rounded-md border px-4 py-2 text-sm ${
                    size === s
                      ? "border-(--color-ink) bg-(--color-ink) text-white dark:border-white dark:bg-white dark:text-black"
                      : "border-(--color-line) dark:border-(--color-line)"
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

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleAddToBag}
              disabled={product.stock === 0}
              className="flex-1 rounded-full bg-(--color-berry) py-3 text-sm text-white disabled:opacity-50"
            >
              Add to bag
            </button>
            <button
              onClick={handleWishlist}
              aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={wishlisted}
              className="rounded-full border border-(--color-line) p-3 dark:border-(--color-line)"
            >
              <Heart size={18} className={wishlisted ? "fill-(--color-berry) text-(--color-berry)" : ""} />
            </button>
          </div>
          {message && <p className="mt-2 text-sm text-(--color-muted)">{message}</p>}
        </div>
      </div>

      <section className="mt-16">
        <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl italic">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-(--color-muted)">No reviews yet — be the first.</p>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r._id} className="border-b border-(--color-line) pb-4 dark:border-(--color-line)">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={12} className={i < r.rating ? "fill-(--color-mustard) text-(--color-mustard)" : "text-(--color-line)"} />
                    ))}
                  </div>
                  <span className="text-sm font-medium">{r.userId.fullName}</span>
                  {r.verifiedPurchase && <span className="stamp text-xs text-(--color-berry)">Verified</span>}
                </div>
                {r.title && <p className="mt-1 font-medium">{r.title}</p>}
                {r.comment && <p className="text-sm text-(--color-muted)">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl italic">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {related.filter((p) => p._id !== id).slice(0, 5).map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
