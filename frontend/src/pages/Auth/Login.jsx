import { useState } from "react";
import { Link } from "react-router-dom";
import Logo from "../../components/common/Logo";
import "../../style/login.css";

const orbitDeals = [
  { brand: "Aurora Skincare", amount: "$1,200", tone: "pink" },
  { brand: "Kettle & Co.", amount: "$900", tone: "gold" },
  { brand: "Northline Studio", amount: "$650", tone: "pink" },
];

const perks = [
  "Brand emails sorted from promotions and spam",
  "One card per collaboration, from reply to payment",
  "Deadline and follow-up reminders",
];

function Login() {
  const [loading, setLoading] = useState(false);

  /* =========================================================
     GOOGLE LOGIN
  ========================================================= */
  function handleGoogleLogin() {
    if (loading) return;
    setLoading(true);

    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8080";

    window.location.href = `${apiUrl}/api/auth/google`;
  }

  return (
    <div className="clb-login">
      {/* Brand panel */}
      <section className="clb-login__brand">
        <div className="clb-login__blob" aria-hidden="true" />

        <div className="clb-login__brand-inner">
          <Logo size={40} />

          <h1>Your inbox, organized for the creator economy.</h1>

          <p>
            Track every brand deal from first email to final payment — without
            digging through Gmail.
          </p>

          <ul className="clb-login__perks">
            {perks.map((perk) => (
              <li key={perk}>
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="m5 12 5 5 9-10" />
                </svg>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="clb-login__orbit" aria-hidden="true">
          {orbitDeals.map((deal, index) => (
            <span
              className={`clb-orbit-card clb-orbit-card--${index + 1}`}
              data-tone={deal.tone}
              key={deal.brand}
            >
              <i>{deal.brand.charAt(0)}</i>
              <em>{deal.brand}</em>
              <b>{deal.amount}</b>
            </span>
          ))}
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="clb-login__panel">
        <div className="clb-login__wrap">
          <Link to="/" className="clb-login__back">
            <span aria-hidden="true">&larr;</span> Back to home
          </Link>

          <div className="clb-login__card clb-spin-border clb-spin-border--always">
            <Logo variant="icon" size={30} />

            <h2>Welcome back</h2>

            <p>Sign in with Google to see your collaborations.</p>

            <button
              type="button"
              className="clb-google-btn"
              onClick={handleGoogleLogin}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? <span className="clb-spinner" aria-hidden="true" /> : <GoogleIcon />}
              {loading ? "Redirecting to Google…" : "Continue with Google"}
            </button>

            <p className="clb-login__fine-print">
              By continuing, you agree to let Collabry read your Gmail labels
              and metadata.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9087-2.2581c-.8059.54-1.8368.859-3.0477.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z"
      />
      <path
        fill="#EA4335"
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
      />
    </svg>
  );
}

export default Login;