import { useEffect, useLayoutEffect, useRef, useState } from "react";
// ROUTE INTEGRATION: this page assumes react-router-dom is installed and
// <Landing /> is mounted at "/" in your router (App.jsx / routes/).
import { Link } from "react-router-dom";
import Logo from "../../components/common/Logo";
import "../../style/landing.css";
import InstallButton from "../../components/common/InstallButton";

// ----------------------------------------------------------------------
// Mock data — swap for real API calls once the backend exists.
// TODO(api): replace `heroDeals` with a small rotating sample of the
// user's real "Brand Deals" labeled emails:
//   GET /api/emails?label=brand-deals&limit=3
// ----------------------------------------------------------------------
const heroDeals = [
  {
    brand: "Aurora Skincare",
    tag: "Paid Collaboration",
    amount: "$1,200",
    progress: "100%",
  },
  {
    brand: "Northline Studio",
    tag: "Negotiating",
    amount: "$650",
    progress: "45%",
  },
  {
    brand: "Kettle & Co.",
    tag: "Content In Progress",
    amount: "$900",
    progress: "70%",
  },
];

const statuses = [
  "Paid Collaboration",
  "Negotiating",
  "Content In Progress",
  "Awaiting Your Reply",
  "Deadline This Week",
  "Completed",
];

const features = [
  {
    icon: "inbox",
    title: "Brand emails, sorted automatically",
    body: "Collabry pulls brand and client emails out of promotions and spam, and files them under the right label the moment they land.",
  },
  {
    icon: "card",
    title: "One card per collaboration",
    body: "Every deal gets a single place for status, deadline, budget, payment, and notes — not a scavenger hunt through old threads.",
  },
  {
    icon: "bell",
    title: "Never miss a follow-up",
    body: "See exactly what\u2019s pending, what\u2019s awaiting your reply, and what\u2019s about to hit a deadline — before it becomes a problem.",
  },
];

// Mock pipeline preview (static illustration of the product).
const board = [
  {
    name: "Negotiating",
    tone: "gold",
    items: [
      { brand: "Northline Studio", note: "Counter-offer sent", amount: "$650" },
      { brand: "Velvet Audio", note: "Waiting on rates", amount: "$480" },
    ],
  },
  {
    name: "In progress",
    tone: "pink",
    items: [
      { brand: "Kettle & Co.", note: "Reel due Friday", amount: "$900" },
      { brand: "Moss & Marlow", note: "Draft approved", amount: "$750" },
    ],
  },
  {
    name: "Paid",
    tone: "mint",
    items: [
      { brand: "Aurora Skincare", note: "Payment received", amount: "$1,200" },
      { brand: "Tidewater Tea", note: "Payment received", amount: "$320" },
    ],
  },
];

// A real, ordered sequence — numbering here communicates actual order,
// not decoration.
const steps = [
  {
    number: "01",
    title: "Connect Gmail",
    body: "Sign in with Google. Collabry reads labels and metadata — never your full inbox by default.",
  },
  {
    number: "02",
    title: "Deals get sorted",
    body: "Brand and client emails are labeled and turned into collaboration cards automatically.",
  },
  {
    number: "03",
    title: "Track it to payment",
    body: "Move each deal through negotiating, in progress, and completed — right up to getting paid.",
  },
];

function Icon({ name }) {
  const paths = {
    inbox: (
      <>
        <path d="M3 13h5l1.5 3h5L16 13h5" />
        <path d="M5.5 5h13L21 13v6H3v-6l2.5-8Z" />
      </>
    ),
    card: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M3 10h18M7 15h4" />
      </>
    ),
    bell: (
      <>
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7 2 7H4s2-1 2-7Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

// Cursor-following spotlight inside a card (sets --mx / --my for CSS).
function trackSpotlight(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty(
    "--mx",
    `${event.clientX - rect.left}px`,
  );
  event.currentTarget.style.setProperty(
    "--my",
    `${event.clientY - rect.top}px`,
  );
}

function Landing() {
  const rootRef = useRef(null);
  const heroRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Scroll reveal. Hidden state is only applied after JS runs
  // (`clb-js` class), so nothing stays invisible if JS/IO is missing.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const targets = root.querySelectorAll("[data-reveal]");
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      targets.forEach((node) => node.classList.add("is-visible"));
      return undefined;
    }

    root.classList.add("clb-js");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      root.classList.remove("clb-js");
    };
  }, []);

  // Sticky nav gets a blurred background after scrolling a little.
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu with Escape or when the viewport gets wide.
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    function onResize() {
      if (window.innerWidth > 960) setMenuOpen(false);
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Perspective tilt on the hero card stack, driven by pointer position.
  // Skipped for reduced-motion users and touch screens.
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (prefersReduced || isTouch) return undefined;

    const node = heroRef.current;
    if (!node) return undefined;

    function handlePointerMove(event) {
      const rect = node.getBoundingClientRect();
      const relativeX = (event.clientX - rect.left) / rect.width - 0.5;
      const relativeY = (event.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: relativeX * 12, y: relativeY * -12 });
    }

    function resetTilt() {
      setTilt({ x: 0, y: 0 });
    }

    node.addEventListener("pointermove", handlePointerMove);
    node.addEventListener("pointerleave", resetTilt);
    return () => {
      node.removeEventListener("pointermove", handlePointerMove);
      node.removeEventListener("pointerleave", resetTilt);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="clb-landing" ref={rootRef}>
      {/* ---------------------------------------------------------- Nav */}
      <header
        className={`clb-nav ${scrolled || menuOpen ? "is-scrolled" : ""}`}
      >
        <div className="clb-nav__inner">
          <Logo />

          <nav className="clb-nav__links" aria-label="Primary">
            <a href="#features">Features</a>
            <a href="#preview">Preview</a>
            <a href="#how-it-works">How it works</a>
          </nav>

          <div className="clb-nav__actions">
            {/* ROUTE INTEGRATION: /login should render <Login /> */}
            <Link to="/login" className="clb-btn clb-btn--ghost clb-nav__login">
              Log in
            </Link>
            <button
              type="button"
              className="clb-nav__toggle"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="clb-mobile-menu"
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
        </div>

        <div
          id="clb-mobile-menu"
          className={`clb-nav__menu ${menuOpen ? "is-open" : ""}`}
        >
          <nav className="clb-nav__menu-inner" aria-label="Mobile">
            <a href="#features" onClick={closeMenu}>
              Features
            </a>
            <a href="#preview" onClick={closeMenu}>
              Preview
            </a>
            <a href="#how-it-works" onClick={closeMenu}>
              How it works
            </a>
          </nav>
        </div>
      </header>

      {/* --------------------------------------------------------- Hero */}
      <div className="clb-hero-wrap">
        <div className="clb-glow" aria-hidden="true" />

        <section className="clb-hero" ref={heroRef}>
          <div className="clb-hero__copy">
            <p className="clb-hero__eyebrow">
              For creators drowning in brand DMs
            </p>
            <h1>
              Every brand deal.
              <br />
              <span className="clb-gradient-text">One clean inbox.</span>
            </h1>
            <p className="clb-hero__sub">
              Collabry pulls brand collaborations out of the noise, so you
              always know what&rsquo;s pending, what&rsquo;s paid, and
              what&rsquo;s next.
            </p>
            <div className="clb-hero__actions">
              {/* ROUTE INTEGRATION: /login kicks off the Google OAuth flow */}
              <Link to="/login" className="clb-btn clb-btn--primary">
                Get started free
              </Link>

              {/* App install ho gaya ho to ye apne aap gayab ho jata hai */}
              <InstallButton className="clb-btn clb-btn--ghost">
                Download app
              </InstallButton>

              <a href="#how-it-works" className="clb-btn clb-btn--text">
                See how it works <span>&rarr;</span>
              </a>
            </div>
            <p className="clb-hero__note">
              Reads Gmail labels and metadata only.
            </p>
          </div>

          <div
            className="clb-hero__stack"
            style={{
              transform: `perspective(1200px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
            }}
          >
            {heroDeals.map((deal, index) => (
              <div
                className="clb-deal-card"
                key={deal.brand}
                style={{ "--i": index }}
              >
                <span className="clb-deal-card__tag">{deal.tag}</span>
                <div className="clb-deal-card__row">
                  <span className="clb-deal-card__avatar" aria-hidden="true">
                    {deal.brand.charAt(0)}
                  </span>
                  <strong className="clb-deal-card__brand">{deal.brand}</strong>
                  <span className="clb-deal-card__amount">{deal.amount}</span>
                </div>
                <span className="clb-deal-card__bar" aria-hidden="true">
                  <i style={{ width: deal.progress }} />
                </span>
              </div>
            ))}

            <div className="clb-chip clb-chip--a" aria-hidden="true">
              <span className="clb-chip__dot" />
              New brand email
            </div>
            <div className="clb-chip clb-chip--b" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 12 5 5 9-10" />
              </svg>
              Payment received
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------------------------------ Marquee */}
      <div className="clb-marquee" aria-hidden="true">
        <div className="clb-marquee__track">
          {[...statuses, ...statuses].map((status, index) => (
            <span className="clb-marquee__item" key={`${status}-${index}`}>
              {status}
            </span>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------- Features */}
      <section id="features" className="clb-section clb-features">
        <div className="clb-section__head" data-reveal>
          <h2>Built around how creators actually get paid</h2>
        </div>
        <div className="clb-features__grid">
          {features.map((feature, index) => (
            <div data-reveal style={{ "--d": index }} key={feature.title}>
              <article
                className="clb-feature-card clb-spin-border"
                onPointerMove={trackSpotlight}
              >
                <span className="clb-feature-card__icon">
                  <Icon name={feature.icon} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------ Preview */}
      <section id="preview" className="clb-section clb-board">
        <div className="clb-section__head" data-reveal>
          <h2>See every deal at a glance</h2>
          <p className="clb-section__sub">
            Negotiating, in progress, paid — each collaboration moves across
            your board as the conversation moves along.
          </p>
        </div>

        <div className="clb-window clb-spin-border" data-reveal>
          <div className="clb-window__bar">
            <span />
            <span />
            <span />
            <b>Collaborations</b>
          </div>
          <div className="clb-board__cols">
            {board.map((column) => (
              <div
                className="clb-col"
                data-tone={column.tone}
                key={column.name}
              >
                <div className="clb-col__head">
                  <span className="clb-col__dot" />
                  <h3>{column.name}</h3>
                  <span className="clb-col__count">{column.items.length}</span>
                </div>
                {column.items.map((item) => (
                  <div className="clb-mini" key={item.brand}>
                    <span className="clb-mini__avatar" aria-hidden="true">
                      {item.brand.charAt(0)}
                    </span>
                    <div className="clb-mini__text">
                      <strong>{item.brand}</strong>
                      <span>{item.note}</span>
                    </div>
                    <span className="clb-mini__amount">{item.amount}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- How it works */}
      <section id="how-it-works" className="clb-section clb-steps">
        <div className="clb-section__head" data-reveal>
          <h2>How it works</h2>
        </div>
        <div className="clb-steps__list">
          {steps.map((step, index) => (
            <div data-reveal style={{ "--d": index }} key={step.number}>
              <div className="clb-step clb-spin-border">
                <span className="clb-step__number">{step.number}</span>
                <div className="clb-step__text">
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section className="clb-section clb-cta" data-reveal>
        <div className="clb-cta__panel clb-spin-border clb-spin-border--always">
          <h2>Stop losing brand deals in your inbox.</h2>
          <Link to="/login" className="clb-btn clb-btn--primary">
            Connect Gmail
          </Link>
        </div>
      </section>

      <footer className="clb-footer">
        <div className="clb-footer__brand">
          <Logo variant="icon" size={22} />
          <p>&copy; {new Date().getFullYear()} Collabry</p>
        </div>
        <Link to="/login" className="clb-footer__link">
          Log in
        </Link>
      </footer>
    </div>
  );
}

export default Landing;
