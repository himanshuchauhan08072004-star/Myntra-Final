// The theme transition's runner — a garment with a little face, sprinting
// across the screen with no legs, just a cartoon hop/squash cycle
// (animated separately in ThemeTransitionOverlay). Faces right by default;
// the overlay mirrors with a static scaleX(-1) wrapper for the RTL run.
// Colors are fixed (not theme-linked) so the garment stays legible and
// colorful the whole run, regardless of what's fading in behind it.

type IconProps = { size?: number };

export function RunningJacket({ size = 120 }: IconProps) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 34 27" xmlns="http://www.w3.org/2000/svg">
      {/* speed lines — trail on the left when facing/moving right */}
      <g opacity="0.45" stroke="#2b2420" strokeWidth="1.3" strokeLinecap="round">
        <path d="M1 9h4" />
        <path d="M0.5 13h5" />
        <path d="M1.5 17h3.5" />
      </g>

      {/* sleeve, behind body — navy with a red cuff stripe */}
      <path
        d="M22 8.5c2.4 0.6 4.2 2.4 4.6 5l-2.6 1.4c-.6-2-1.8-3.4-3.4-4.1Z"
        fill="#25406b"
        stroke="#152742"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M25.3 13l1.3.7" stroke="#d64545" strokeWidth="1.3" strokeLinecap="round" />

      {/* body — padded track-jacket silhouette, navy with a red racing stripe */}
      <path
        d="M13.2 3.2 10 5.6l1.7 3.4 1.8-1v3.6c-1.6.9-2.6 2.6-2.6 4.5v3.6c0 1.1.9 2 2 2h9.4c1.1 0 2-.9 2-2v-3.6c0-1.9-1-3.6-2.6-4.5V8l1.8 1 1.7-3.4-3.2-2.4-2.3 1.5h-4.2l-2.3-1.5Z"
        fill="#2c4a80"
        stroke="#152742"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M13.6 10.5v9.8" stroke="#d64545" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M20.4 10.5v9.8" stroke="#d64545" strokeWidth="1.4" strokeLinecap="round" />

      {/* ribbed collar + zip, off-white for contrast */}
      <path d="M14.5 4.4 15.6 7l1-2.7" stroke="#f4efe4" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M16 9v10" stroke="#e8b84b" strokeWidth="1" strokeDasharray="1.3 1.3" strokeLinecap="round" />
      <path d="M24.6 14.3l2.4 1.3" stroke="#f4efe4" strokeWidth="0.9" strokeLinecap="round" />

      {/* face */}
      <g className="theme-run-eyes">
        <circle cx="13.6" cy="8.4" r="1.7" fill="#fdfaf3" />
        <circle cx="18.3" cy="8.4" r="1.7" fill="#fdfaf3" />
        <circle className="theme-run-pupil" cx="13.6" cy="8.4" r="0.9" fill="#221d17" />
        <circle className="theme-run-pupil" cx="18.3" cy="8.4" r="0.9" fill="#221d17" />
      </g>
      <path d="M14.6 11.4c.9.8 2.1.8 3 0" stroke="#f4efe4" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}

export function RunningTee({ size = 120 }: IconProps) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 34 27" xmlns="http://www.w3.org/2000/svg">
      <g opacity="0.45" stroke="#2b2420" strokeWidth="1.3" strokeLinecap="round">
        <path d="M1 9h4" />
        <path d="M0.5 13h5" />
        <path d="M1.5 17h3.5" />
      </g>

      {/* sleeve — coral with a golden trim */}
      <path
        d="M22.4 8c2.1 0.7 3.7 2.4 4 4.7l-2.5 1.3c-.5-1.8-1.6-3.1-3-3.8Z"
        fill="#d1495b"
        stroke="#8f2536"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <path d="M25 12.6l1.2.6" stroke="#f2b263" strokeWidth="1.2" strokeLinecap="round" />

      {/* body — coral tee with a warm orange chest stripe */}
      <path
        d="M13 3 9.6 5.7l1.8 3.2 1.8-1.1v3.7c-1.5.9-2.4 2.5-2.4 4.3v3.5c0 1.1.9 2 2 2h8.4c1.1 0 2-.9 2-2v-3.5c0-1.8-.9-3.4-2.4-4.3V7.8l1.8 1.1 1.8-3.2L21 3l-2.5 1.7h-4.5L13 3Z"
        fill="#dd5b6a"
        stroke="#8f2536"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M12.6 13h9" stroke="#f2b263" strokeWidth="1.6" strokeLinecap="round" />

      {/* neckline — off-white rib */}
      <path d="M14.6 5.4c.7.9 1.7 1.4 2.7 1.4s2-.5 2.7-1.4" stroke="#f4efe4" strokeWidth="1" strokeLinecap="round" fill="none" />

      <g className="theme-run-eyes">
        <circle cx="13.6" cy="9.6" r="1.7" fill="#fdfaf3" />
        <circle cx="18.3" cy="9.6" r="1.7" fill="#fdfaf3" />
        <circle className="theme-run-pupil" cx="13.6" cy="9.6" r="0.9" fill="#221d17" />
        <circle className="theme-run-pupil" cx="18.3" cy="9.6" r="0.9" fill="#221d17" />
      </g>
      <path d="M14.6 12.6c.9.8 2.1.8 3 0" stroke="#f4efe4" strokeWidth="1" strokeLinecap="round" fill="none" />
    </svg>
  );
}
