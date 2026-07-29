import { Link } from "react-router-dom";
import { useWishlist } from "../context/WishlistContext";

export function Wishlist() {
  const { items, loading, toggle } = useWishlist();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="font-[family-name:var(--font-display)] text-3xl italic">Wishlist</h1>
      {loading ? (
        <p className="mt-8 text-(--color-muted)">Loading...</p>
      ) : items.length === 0 ? (
        <p className="mt-8 text-(--color-muted)">Nothing saved yet.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item) => (
            <div key={item._id} className="rounded-md border border-(--color-line) p-3 dark:border-(--color-line)">
              <Link to={`/product/${item.productId._id}`}>
                <div className="aspect-square rounded-md bg-(--color-line)">
                  {item.productId.images?.[0] && (
                    <img
                      src={item.productId.images[0]}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                      className="h-full w-full rounded-md object-cover"
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
