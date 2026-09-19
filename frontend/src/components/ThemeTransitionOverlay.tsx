import { RunningJacket, RunningTee } from "../lib/themeIcons";

export function ThemeTransitionOverlay({
  phase,
  ending,
  durationMs,
}: {
  phase: "light" | "dark";
  ending: boolean;
  durationMs: number;
}) {
  const isNight = phase === "dark";
  // Dark: a jacket runs right -> left, dragging night in behind it.
  // Light: a tee runs left -> right, dragging day in behind it.
  const Icon = isNight ? RunningJacket : RunningTee;

  return (
    <div
      className="theme-transition-overlay"
      data-ending={ending}
      aria-hidden="true"
      style={{ "--run-duration": `${durationMs}ms` } as React.CSSProperties}
    >
      <div className={`theme-run-track ${isNight ? "theme-run-track--rtl" : ""}`}>
        <div className="theme-run-bob">
          <div className={`theme-run-flip ${isNight ? "theme-run-flip--mirrored" : ""}`}>
            <Icon size={132} />
          </div>
        </div>
      </div>
    </div>
  );
}
