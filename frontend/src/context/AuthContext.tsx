import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { connectSocket, disconnectSocket } from "../lib/socket";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const GUEST_HISTORY_KEY = "guest_recently_viewed";

// Guests browsing without an account get their view history stashed here;
// on login we push it to the server to merge with (or seed) their real history.
export function pushGuestView(productId: string) {
  const raw = localStorage.getItem(GUEST_HISTORY_KEY);
  const items: { productId: string; viewedAt: string }[] = raw ? JSON.parse(raw) : [];
  const filtered = items.filter((i) => i.productId !== productId);
  filtered.unshift({ productId, viewedAt: new Date().toISOString() });
  localStorage.setItem(GUEST_HISTORY_KEY, JSON.stringify(filtered.slice(0, 20)));
}

async function mergeGuestHistory() {
  const raw = localStorage.getItem(GUEST_HISTORY_KEY);
  if (!raw) return;
  const items = JSON.parse(raw);
  if (!Array.isArray(items) || items.length === 0) return;
  try {
    await api.post("/history/merge-guest", { items });
    localStorage.removeItem(GUEST_HISTORY_KEY);
  } catch {
    // non-fatal — guest history stays in localStorage, retried next login
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      connectSocket(storedToken);
    }
    setLoading(false);
  }, []);

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    disconnectSocket();
    setToken(null);
    setUser(null);
  }

  // A stale/expired token (e.g. from an earlier test session) makes the API
  // 401 on the very first background request — previously that triggered a
  // hard `window.location.href` reload, which looked like the whole app
  // flashing and disappearing. Log out through React state + router instead,
  // so it's a clean redirect rather than a full-page blank flash.
  useEffect(() => {
    function handleUnauthorized() {
      logout();
      if (!window.location.pathname.startsWith("/login")) {
        navigate("/login");
      }
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [navigate]);

  function applySession(newToken: string, newUser: User) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    connectSocket(newToken);
  }

  async function login(email: string, password: string) {
    const res = await api.post("/user/login", { email, password });
    applySession(res.data.token, res.data.user);
    await mergeGuestHistory();
  }

  async function signup(fullName: string, email: string, password: string) {
    const res = await api.post("/user/signup", { fullName, email, password });
    applySession(res.data.token, res.data.user);
    await mergeGuestHistory();
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
