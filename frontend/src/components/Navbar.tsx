import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, ShoppingBag, Heart, Bell, Sun, Moon, User as UserIcon, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useTheme } from "../context/ThemeContext";
import { useNotifications } from "../context/NotificationContext";

export function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { theme, toggleTheme } = useTheme();
  const { unreadCount } = useNotifications();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const isHome = location.pathname === "/";
  const transparent = isHome && !scrolled;

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 56);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click-outside closes whichever dropdown is open.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileMenu(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/products?q=${encodeURIComponent(query)}`);
      setMobileOpen(false);
      setSearchOpen(false);
    }
  }

  const textColor = transparent ? "#fdfaf3" : "var(--color-ink)";

  return (
    <header className={`fashion-nav ${!transparent ? "fashion-nav--solid" : ""}`}>
      <div className="fashion-nav-inner" data-solid={!transparent || undefined} style={{ color: textColor }}>
        <Link to="/" className="shrink-0 font-display text-xl font-medium italic tracking-tight" style={{ color: textColor }}>
          Myntra<span style={{ color: "var(--color-berry)" }}>.</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          <Link to="/products" className="px-3 py-2 text-sm transition-opacity hover:opacity-60">
            Shop
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            onClick={() => setSearchOpen((s) => !s)}
            aria-label="Search"
            className="icon-btn hidden sm:inline-flex"
            style={{ color: textColor }}
          >
            <Search size={17} />
          </button>

          <button onClick={toggleTheme} aria-label="Toggle theme" className="theme-portal-btn mx-1">
            {theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
          </button>

          {user && (
            <div className="relative hidden sm:block" ref={notifRef}>
              <button onClick={() => setShowNotifs((s) => !s)} aria-label="Notifications" className="icon-btn relative" style={{ color: textColor }}>
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-berry) text-[10px] text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {showNotifs && <NotificationDropdown onClose={() => setShowNotifs(false)} />}
            </div>
          )}

          <Link to="/wishlist" aria-label="Wishlist" className="icon-btn relative hidden sm:inline-flex" style={{ color: textColor }}>
            <Heart size={17} />
            {wishlistItems.length > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-berry) text-[10px] text-white">
                {wishlistItems.length > 9 ? "9+" : wishlistItems.length}
              </span>
            )}
          </Link>

          <Link to="/cart" aria-label="Cart" className="icon-btn relative" style={{ color: textColor }}>
            <ShoppingBag size={17} />
            {itemCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-(--color-berry) text-[10px] text-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative hidden sm:block" ref={profileRef}>
              <button onClick={() => setShowProfileMenu((s) => !s)} aria-label="Profile" aria-expanded={showProfileMenu} className="icon-btn" style={{ color: textColor }}>
                <UserIcon size={17} />
              </button>
              {showProfileMenu && (
                <div className="surface absolute right-0 mt-2 w-48 rounded-md py-1 shadow-xl" style={{ color: "var(--color-ink)" }}>
                  <Link to="/profile" onClick={() => setShowProfileMenu(false)} className="block px-4 py-2.5 text-sm transition-colors hover:bg-(--color-paper-sunken)">
                    Profile
                  </Link>
                  <Link to="/orders" onClick={() => setShowProfileMenu(false)} className="block px-4 py-2.5 text-sm transition-colors hover:bg-(--color-paper-sunken)">
                    Orders
                  </Link>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      logout();
                    }}
                    className="block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-(--color-paper-sunken)"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary ml-2 hidden sm:inline-flex">
              Log in
            </Link>
          )}

          <button onClick={() => setMobileOpen(true)} aria-label="Open menu" className="icon-btn sm:hidden" style={{ color: textColor }}>
            <Menu size={19} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="mx-auto mt-2 hidden max-w-2xl px-4 sm:block">
          <form onSubmit={handleSearch} className="surface flex items-center gap-3 rounded-full px-5 py-3 shadow-xl">
            <Search size={16} className="text-(--color-muted)" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for products, brands, styles..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-(--color-muted)"
              style={{ color: "var(--color-ink)" }}
            />
          </form>
        </div>
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-(--color-paper) sm:hidden" style={{ color: "var(--color-ink)" }}>
          <div className="flex items-center justify-between border-b border-(--color-line) px-4 py-4">
            <span className="font-display text-xl italic">Menu</span>
            <button onClick={() => setMobileOpen(false)} aria-label="Close menu" className="icon-btn">
              <X size={20} />
            </button>
          </div>
          <div className="flex flex-col gap-1 p-4">
            <form onSubmit={handleSearch} className="mb-4 flex items-center gap-3 border-b border-(--color-line) py-2">
              <Search size={16} className="text-(--color-muted)" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-(--color-muted)"
              />
            </form>
            <Link to="/products" onClick={() => setMobileOpen(false)} className="py-3 text-lg font-display italic">
              Shop
            </Link>
            <Link to="/wishlist" onClick={() => setMobileOpen(false)} className="py-3 text-lg font-display italic">
              Wishlist {wishlistItems.length > 0 && `(${wishlistItems.length})`}
            </Link>
            {user ? (
              <>
                <Link to="/orders" onClick={() => setMobileOpen(false)} className="py-3 text-lg font-display italic">
                  Orders
                </Link>
                <Link to="/profile" onClick={() => setMobileOpen(false)} className="py-3 text-lg font-display italic">
                  Profile
                </Link>
                <button
                  onClick={() => {
                    setMobileOpen(false);
                    logout();
                  }}
                  className="py-3 text-left text-lg font-display italic text-(--color-berry)"
                >
                  Log out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setMobileOpen(false)} className="py-3 text-lg font-display italic">
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const { notifications, markRead, markAllRead } = useNotifications();
  return (
    <div className="surface absolute right-0 z-50 mt-2 w-80 rounded-md shadow-xl" style={{ color: "var(--color-ink)" }}>
      <div className="flex items-center justify-between border-b border-(--color-line) px-4 py-3">
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
            className={`block w-full border-b border-(--color-line) px-4 py-3 text-left text-sm last:border-0 transition-colors hover:bg-(--color-paper-sunken) ${!n.isRead ? "bg-(--color-berry)/5" : ""}`}
          >
            <p className="font-medium">{n.title}</p>
            <p className="text-(--color-muted)">{n.message}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
