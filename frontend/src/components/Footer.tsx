import { Link } from "react-router-dom";

const SHOP_LINKS = [
  { label: "Women", query: "women" },
  { label: "Men", query: "men" },
  { label: "Footwear", query: "shoes" },
  { label: "Accessories", query: "accessories" },
];

const ACCOUNT_LINKS = [
  { label: "Order history", to: "/orders" },
  { label: "Profile", to: "/profile" },
  { label: "Cart", to: "/cart" },
  { label: "Wishlist", to: "/wishlist" },
];

export function Footer() {
  return (
    <footer style={{ background: "#1c2436", color: "#dfe3ee" }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 sm:px-6 md:grid-cols-4">
        <div>
          <span className="font-display text-xl italic" style={{ color: "#fdfaf3" }}>
            Myntra<span style={{ color: "#e08a63" }}>.</span>
          </span>
          <p className="mt-3 max-w-xs text-sm leading-relaxed" style={{ color: "#aab0c4" }}>
            Curated fashion, updated daily — from editorial pieces to everyday essentials.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-medium" style={{ color: "#fdfaf3" }}>Shop</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {SHOP_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={`/products?q=${encodeURIComponent(l.query)}`} className="transition-opacity hover:opacity-70">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium" style={{ color: "#fdfaf3" }}>Account</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            {ACCOUNT_LINKS.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="transition-opacity hover:opacity-70">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-medium" style={{ color: "#fdfaf3" }}>Support</h3>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <a href="mailto:himanshuchauhan08072004@gmail.com" className="transition-opacity hover:opacity-70">
                himanshuchauhan08072004@gmail.com
              </a>
            </li>
            <li style={{ color: "#aab0c4" }}>Mon–Fri, 9am–6pm</li>
          </ul>
        </div>
      </div>

      <div className="border-t px-4 py-4 text-center text-xs sm:px-6" style={{ borderColor: "#2e3750", color: "#7f87a0" }}>
        © {new Date().getFullYear()} Myntra. All rights reserved.
      </div>
    </footer>
  );
}
