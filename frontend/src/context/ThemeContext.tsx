import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { ThemeTransitionOverlay } from "../components/ThemeTransitionOverlay";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setThemeExplicit: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

// The stored value may still be "system" (or any legacy value) from before
// the app only supported two themes — resolve it once against the OS
// preference so old accounts land on a real light/dark value.
function resolveTheme(raw: string | null | undefined): Theme {
  if (raw === "light" || raw === "dark") return raw;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Timing for the running garment: the theme itself flips almost
// immediately (colors crossfade smoothly via the global CSS transition
// above — no opaque curtain blocking the page), while the garment keeps
// running for the full duration as a purely decorative flourish, then
// fades out.
const RUN_DURATION = 1750;
const FLIP_AT = 40;
const HOLD_AFTER_FULL = 110;
const OVERLAY_TOTAL = RUN_DURATION + HOLD_AFTER_FULL;
const FADE_MS = 220;
const UNMOUNT_AT = OVERLAY_TOTAL + FADE_MS;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => resolveTheme(localStorage.getItem("theme")));
  const [transitioning, setTransitioning] = useState(false);
  const [ending, setEnding] = useState(false);
  const [pendingTheme, setPendingTheme] = useState<Theme | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    applyTheme(theme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.theme) {
      const resolved = resolveTheme(user.theme);
      setThemeState(resolved);
      applyTheme(resolved);
    }
  }, [user]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  async function persist(t: Theme) {
    localStorage.setItem("theme", t);
    if (user) {
      try {
        await api.put("/notifications/theme", { theme: t });
      } catch {
        // non-fatal — theme still applied locally even if sync fails
      }
    }
  }

  function goToTheme(next: Theme) {
    if (next === theme || transitioning) return;

    if (prefersReducedMotion()) {
      setThemeState(next);
      applyTheme(next);
      persist(next);
      return;
    }

    setPendingTheme(next);
    setTransitioning(true);
    setEnding(false);

    const flip = setTimeout(() => {
      setThemeState(next);
      applyTheme(next);
      persist(next);
    }, FLIP_AT);

    const startFade = setTimeout(() => setEnding(true), OVERLAY_TOTAL);

    const unmount = setTimeout(() => {
      setTransitioning(false);
      setEnding(false);
      setPendingTheme(null);
    }, UNMOUNT_AT);

    timers.current.push(flip, startFade, unmount);
  }

  function toggleTheme() {
    goToTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeExplicit: goToTheme }}>
      {children}
      {transitioning && pendingTheme && (
        <ThemeTransitionOverlay phase={pendingTheme} ending={ending} durationMs={RUN_DURATION} />
      )}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
