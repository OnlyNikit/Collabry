import Logo from "../../components/common/Logo";
import "../../style/login.css";

/* =========================================================
   GOOGLE LOGIN
========================================================= */

function handleGoogleLogin() {
  const apiUrl =
    import.meta.env.VITE_API_URL ||
    "http://localhost:8080";

  window.location.href =
    `${apiUrl}/api/auth/google`;
}

function Login() {
  return (
    <div className="clb-login">
      {/* Brand panel */}
      <section className="clb-login__brand">
        <Logo size={40} />

        <h1>
          Your inbox, organized for the creator economy.
        </h1>

        <p>
          Track every brand deal from first email to
          final payment — without digging through Gmail.
        </p>

        <div
          className="clb-login__orbit"
          aria-hidden="true"
        >
          <span className="clb-orbit-card clb-orbit-card--1" />
          <span className="clb-orbit-card clb-orbit-card--2" />
          <span className="clb-orbit-card clb-orbit-card--3" />
        </div>
      </section>

      {/* Sign-in panel */}
      <section className="clb-login__panel">
        <div className="clb-login__card">
          <Logo
            variant="icon"
            size={30}
          />

          <h2>Welcome back</h2>

          <p>
            Sign in with Google to see your collaborations.
          </p>

          <button
            type="button"
            className="clb-google-btn"
            onClick={handleGoogleLogin}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="clb-login__fine-print">
            By continuing, you agree to let Collabry read
            your Gmail labels and metadata.
          </p>
        </div>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84-.86-3.06-.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18Z"
      />
    </svg>
  );
}

export default Login;