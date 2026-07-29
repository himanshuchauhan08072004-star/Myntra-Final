import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Heart, Bell, Sun, Moon, Monitor, User as UserIcon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { theme, setTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const [query, setQuery] = useState("");
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Click-outside closes whichever dropdown is open — avoids the classic
  // hover-gap bug where moving the cursor from trigger to menu crosses a
  // dead zone and the menu disappears before you can click anything in it.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) navigate(`/products?q=${encodeURIComponent(query)}`);
  }

  const ThemeIcon = { light: Sun, dark: Moon, system: Monitor }[theme];

  return (
    <header className="sticky top-0 z-40 border-b border-(--color-line) bg-(--color-paper)/95 backdrop-blur dark:bg-(--color-paper)/95 dark:border-(--color-line)">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6">
        <Link to="/" className="shrink-0 font-[family-name:var(--font-display)] text-2xl font-semibold italic tracking-tight">
          Myntra<span className="text-(--color-berry)">.</span>
        </Link>

        <form onSubmit={handleSearch} className="hidden flex-1 items-center gap-2 rounded-full border border-(--color-line) bg-(--color-paper-raised) px-4 py-2 sm:flex dark:bg-(--color-paper-raised) dark:border-(--color-line)">
          <Search size={16} className="text-(--color-muted)" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for products, brands..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-(--color-muted)"
          />
        </form>

        <nav className="ml-auto flex items-center gap-4 text-sm">
          <Link to="/products" className="hidden sm:inline hover:text-(--color-berry)">
            Shop
          </Link>

          <button
            onClick={() => setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light")}
            aria-label="Toggle theme"
            className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
          >
            <ThemeIcon size={18} />
          </button>

          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifs((s) => !s)}
                aria-label="Notifications"
                className="relative rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-berry) text-[10px] text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && <NotificationDropdown onClose={() => setShowNotifs(false)} />}
            </div>
          )}

          <Link to="/wishlist" aria-label="Wishlist" className="relative rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10">
            <Heart size={18} />
            {wishlistItems.length > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-berry) text-[10px] text-white">
                {wishlistItems.length > 9 ? "9+" : wishlistItems.length}
              </span>
            )}
          </Link>

          <Link to="/cart" aria-label="Cart" className="relative rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10">
            <ShoppingBag size={18} />
            {itemCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-berry) text-[10px] text-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu((s) => !s)}
                aria-label="Profile"
                aria-expanded={showProfileMenu}
                className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10"
              >
                <UserIcon size={18} />
              </button>
              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-(--color-line) bg-(--color-paper-raised) py-1 shadow-lg dark:bg-(--color-paper-raised) dark:border-(--color-line)">
                  <Link
                    to="/profile"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Profile
                  </Link>
                  <Link
                    to="/orders"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Orders
                  </Link>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="block w-full px-4 py-2 text-left text-sm hover:bg-black/5 dark:hover:bg-white/10"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="rounded-full bg-(--color-ink) px-4 py-2 text-sm text-white dark:bg-white dark:text-black">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, markRead, markAllRead } = useNotifications();
  return (
    <div className="fixed inset-x-4 top-16 z-50 rounded-lg border border-(--color-line) bg-(--color-paper-raised) shadow-lg sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:z-auto sm:mt-2 sm:w-80 dark:bg-(--color-paper-raised) dark:border-(--color-line)">
      <div className="flex items-center justify-between border-b border-(--color-line) px-4 py-2 dark:border-(--color-line)">
        <span className="text-sm font-medium">Notifications</span>
        <button onClick={markAllRead} className="text-xs text-(--color-berry)">Mark all read</button>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-(--color-muted)">You're all caught up.</p>
        )}
        {notifications.map((n) => (
          <button
            key={n._id}
            onClick={() => {
              markRead(n._id);
              onClose();
            }}
            className={`block w-full border-b border-(--color-line) px-4 py-3 text-left text-sm last:border-0 hover:bg-black/5 dark:border-(--color-line) dark:hover:bg-white/10 ${!n.isRead ? "bg-(--color-berry)/5" : ""}`}
          >
            <p className="font-medium">{n.title}</p>
            <p className="text-(--color-muted)">{n.message}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
