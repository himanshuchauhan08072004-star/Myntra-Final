import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { ThemeProvider } from "./context/ThemeContext";
import { NotificationProvider } from "./context/NotificationContext";
import { WishlistProvider } from "./context/WishlistContext";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Home } from "./pages/Home";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ProductListing } from "./pages/ProductListing";
import { ProductDetail } from "./pages/ProductDetail";
import { Cart } from "./pages/Cart";
import { Checkout } from "./pages/Checkout";
import { Orders } from "./pages/Orders";
import { OrderDetail } from "./pages/OrderDetail";
import { Wishlist } from "./pages/Wishlist";
import { Profile } from "./pages/Profile";

// The nav is a floating fixed element now, so every page needs top spacing
// to clear it — except the homepage, whose hero deliberately bleeds full
// height behind the transparent nav.
function PageBody({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  return (
    <main className={`min-h-screen ${isHome ? "" : "pt-[var(--nav-h)]"}`}>
      {children}
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <CartProvider>
            <WishlistProvider>
            <NotificationProvider>
              <Navbar />
              <PageBody>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/products" element={<ProductListing />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                  <Route path="/orders/:id" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
                  <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                </Routes>
              </PageBody>
              <Footer />
            </NotificationProvider>
            </WishlistProvider>
          </CartProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
