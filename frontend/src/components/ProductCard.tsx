import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import type { Product, RecommendedProduct } from "../types";

export function ProductCard({
  product,
  tall = false,
}: {
  product: Product | RecommendedProduct;
  tall?: boolean;
}) {
  const reason = "reason" in product ? product.reason : null;
  const { user } = useAuth();
  const { isWishlisted, toggle } = useWishlist();
  const { addToBag } = useCart();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);
  const liked = isWishlisted(product._id);
  const outOfStock = product.stock === 0;
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLikeClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate("/login");
    const result = await toggle(product._id);
    if (!result.ok) {
      setError(result.error || "Could not update wishlist");
      setTimeout(() => setError(null), 3000);
    }
  }

  // Quick add uses the first available size/color as a sane default — full
  // variant picking still happens on the product page.
  async function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) return navigate("/login");
    if (outOfStock || adding) return;
    const size = "sizes" in product ? product.sizes?.[0] : undefined;
    if (!size) {
      setError("Select options on product page");
      setTimeout(() => setError(null), 3000);
      return;
    }
    const color = "colors" in product ? product.colors?.[0] : undefined;
    setAdding(true);
    try {
      await addToBag(product._id, size, color, 1);
      setAdded(true);
      setTimeout(() => setAdded(false), 1500);
    } catch {
      setError("Could not add to bag");
      setTimeout(() => setError(null), 3000);
    } finally {
      setAdding(false);
    }
  }

  return (
    <Link to={`/product/${product._id}`} className="group block">
      <div className={`tile-media relative ${tall ? "aspect-[2/3]" : "aspect-[3/4]"}`}>
        {product.images?.[0] && !imgError ? (
          <img
            src={product.images[0]}
            alt={product.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-(--color-muted)">No image</div>
        )}

        {product.discount && (
          <span className="stamp absolute left-2 top-2 bg-(--color-paper-raised) text-(--color-berry)">
            {product.discount} off
          </span>
        )}

        <button
          onClick={handleLikeClick}
          aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={liked}
          className="tile-reveal absolute right-2 top-2 z-10 rounded-full bg-(--color-paper-raised)/95 p-1.5 shadow-sm"
        >
          <Heart size={14} className={liked ? "fill-(--color-berry) text-(--color-berry)" : "text-(--color-ink)"} />
        </button>
        {!outOfStock && (
          <button
            onClick={handleQuickAdd}
            disabled={adding}
            aria-label="Add to bag"
            className="tile-reveal absolute right-2 top-10 z-10 rounded-full bg-(--color-paper-raised)/95 p-1.5 shadow-sm disabled:opacity-60"
          >
            {added ? <Check size={14} className="text-(--color-berry)" /> : <ShoppingBag size={14} className="text-(--color-ink)" />}
          </button>
        )}
        {error && (
          <span className="absolute right-2 top-[4.6rem] z-10 max-w-[140px] rounded bg-(--color-berry) px-2 py-1 text-[10px] text-white shadow">
            {error}
          </span>
        )}

        <div className="tile-discover">
          <span className="tile-discover-label">Discover</span>
        </div>

        {outOfStock && (
          <span className="absolute inset-x-0 bottom-0 bg-(--color-ink)/80 py-1.5 text-center text-[11px] tracking-wide text-white">
            Out of stock
          </span>
        )}
      </div>

      <div className="mt-2.5">
        <p className="truncate text-xs uppercase tracking-wide text-(--color-muted)">{product.brand}</p>
        <p className="mt-0.5 truncate text-sm">{product.name}</p>
        <div className="mt-1 flex items-baseline gap-2 text-sm">
          <span className="font-mono">₹{product.price}</span>
          {product.originalPrice && (
            <span className="font-mono text-xs text-(--color-muted) line-through">₹{product.originalPrice}</span>
          )}
        </div>
        {reason && <p className="mt-1 text-xs italic text-(--color-berry)">{reason}</p>}
      </div>
    </Link>
  );
}
