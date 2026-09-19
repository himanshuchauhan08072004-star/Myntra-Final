import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";

export function Wishlist() {
  const { items, loading, toggle } = useWishlist();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <span className="eyebrow">Saved</span>
      <h1 className="mt-2 font-display text-3xl italic sm:text-4xl">Wishlist</h1>
      {loading ? (
        <p className="mt-10 text-(--color-muted)">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-10 text-(--color-muted)">Nothing saved yet.</p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={item._id} className="surface rounded-sm p-3">
              <Link to={`/product/${item.productId._id}`}>
                <div className="aspect-square overflow-hidden rounded-sm bg-(--color-paper-sunken)">
                  {item.productId.images?.[0] && (
                    <img
                      src={item.productId.images[0]}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <p className="mt-2 truncate text-sm">{item.productId.name}</p>
              </Link>
              <button onClick={() => toggle(item.productId._id)} className="mt-1 text-xs text-(--color-berry)">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
