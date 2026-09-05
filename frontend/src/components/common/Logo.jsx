import '../../style/logo.css';

/**
 * Collabry logo — icon + wordmark.
 *
 * The mark is an open envelope shaped like a "C": brand emails coming in,
 * with a small gold dot standing in for the moment a deal gets caught
 * and organized instead of getting lost in the inbox.
 *
 * Props:
 *  - variant: 'full' (icon + wordmark) | 'icon' (icon only) — default 'full'
 *  - size: pixel height of the icon; the wordmark scales with it
 */
function Logo({ variant = 'full', size = 40 }) {
  return (
    <div className="clb-logo" style={{ '--clb-logo-size': `${size}px` }}>
      <svg
        className="clb-logo__mark"
        viewBox="0 0 48 48"
        width={size}
        height={size}
        role="img"
        aria-label="Collabry"
      >
        <defs>
          <linearGradient id="clbLogoGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--clb-pink)" />
            <stop offset="100%" stopColor="var(--clb-gold)" />
          </linearGradient>
        </defs>

        {/* soft "C" halo behind the envelope, ties the mark to the name */}
        <path
          d="M24 4C12.95 4 4 12.95 4 24c0 6.2 2.82 11.75 7.25 15.43L14 33l7 4 7-4 4.5 6.2C36.9 35.9 44 30.7 44 24 44 12.95 35.05 4 24 4Z"
          fill="url(#clbLogoGrad)"
          opacity="0.15"
        />

        {/* envelope body */}
        <rect
          x="7" y="16" width="34" height="18" rx="3"
          fill="none"
          stroke="url(#clbLogoGrad)"
          strokeWidth="2.5"
        />
        {/* envelope flap */}
        <path
          d="M7.5 17.5 24 28l16.5-10.5"
          fill="none"
          stroke="url(#clbLogoGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* accent dot — the deal that got caught */}
        <circle cx="38" cy="13" r="4.5" fill="var(--clb-gold)" />
      </svg>

      {variant === 'full' && <span className="clb-logo__word">Collabry</span>}
    </div>
  );
}

export default Logo;