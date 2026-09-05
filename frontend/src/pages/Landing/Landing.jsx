import { useEffect, useRef, useState } from 'react';
// ROUTE INTEGRATION: this page assumes react-router-dom is installed and
// <Landing /> is mounted at "/" in your router (App.jsx / routes/).
import { Link } from 'react-router-dom';
import Logo from '../../components/common/Logo';
import '../../style/landing.css'

// ----------------------------------------------------------------------
// Mock data — swap for real API calls once the backend exists.
// TODO(api): replace `heroDeals` with a small rotating sample of the
// user's real "Brand Deals" labeled emails:
//   GET /api/emails?label=brand-deals&limit=3
// ----------------------------------------------------------------------
const heroDeals = [
  { brand: 'Aurora Skincare', tag: 'Paid Collaboration', amount: '$1,200' },
  { brand: 'Northline Studio', tag: 'Negotiating', amount: '$650' },
  { brand: 'Kettle & Co.', tag: 'Content In Progress', amount: '$900' },
];

const features = [
  {
    title: 'Brand emails, sorted automatically',
    body: 'Collabry pulls brand and client emails out of promotions and spam, and files them under the right label the moment they land.',
  },
  {
    title: 'One card per collaboration',
    body: 'Every deal gets a single place for status, deadline, budget, payment, and notes — not a scavenger hunt through old threads.',
  },
  {
    title: 'Never miss a follow-up',
    body: 'See exactly what\u2019s pending, what\u2019s awaiting your reply, and what\u2019s about to hit a deadline — before it becomes a problem.',
  },
];

// A real, ordered sequence — numbering here communicates actual order,
// not decoration.
const steps = [
  { number: '01', title: 'Connect Gmail', body: 'Sign in with Google. Collabry reads labels and metadata — never your full inbox by default.' },
  { number: '02', title: 'Deals get sorted', body: 'Brand and client emails are labeled and turned into collaboration cards automatically.' },
  { number: '03', title: 'Track it to payment', body: 'Move each deal through negotiating, in progress, and completed — right up to getting paid.' },
];

function Landing() {
  const heroRef = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  // Perspective tilt on the hero card stack, driven by pointer position.
  // Respects prefers-reduced-motion by simply never attaching the listener.
  useEffect(() => {
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReduced) return undefined;

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

    node.addEventListener('pointermove', handlePointerMove);
    node.addEventListener('pointerleave', resetTilt);
    return () => {
      node.removeEventListener('pointermove', handlePointerMove);
      node.removeEventListener('pointerleave', resetTilt);
    };
  }, []);

  return (
    <div className="clb-landing">
      {/* ---------------------------------------------------------- Nav */}
      <header className="clb-nav">
        <Logo />
        <nav className="clb-nav__links">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        {/* ROUTE INTEGRATION: /login should render <Login /> */}
        <Link to="/login" className="clb-btn clb-btn--ghost">
          Log in
        </Link>
      </header>

      {/* --------------------------------------------------------- Hero */}
      <section className="clb-hero" ref={heroRef}>
        <div className="clb-hero__copy">
          <p className="clb-hero__eyebrow">For creators drowning in brand DMs</p>
          <h1>
            Every brand deal.
            <br />
            One clean inbox.
          </h1>
          <p className="clb-hero__sub">
            Collabry pulls brand collaborations out of the noise, so you
            always know what&rsquo;s pending, what&rsquo;s paid, and what&rsquo;s next.
          </p>
          <div className="clb-hero__actions">
            {/* ROUTE INTEGRATION: /login kicks off the Google OAuth flow */}
            <Link to="/login" className="clb-btn clb-btn--primary">
              Get started free
            </Link>
            <a href="#how-it-works" className="clb-btn clb-btn--text">
              See how it works <span>&rarr;</span>
            </a>
          </div>
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
              style={{ '--i': index }}
            >
              <span className="clb-deal-card__tag">{deal.tag}</span>
              <strong className="clb-deal-card__brand">{deal.brand}</strong>
              <span className="clb-deal-card__amount">{deal.amount}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------- Features */}
      <section id="features" className="clb-features">
        <h2>Built around how creators actually get paid</h2>
        <div className="clb-features__grid">
          {features.map((feature) => (
            <article className="clb-feature-card" key={feature.title}>
              <h3>{feature.title}</h3>
              <p>{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------- How it works */}
      <section id="how-it-works" className="clb-steps">
        <h2>How it works</h2>
        <div className="clb-steps__list">
          {steps.map((step) => (
            <div className="clb-step" key={step.number}>
              <span className="clb-step__number">{step.number}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section className="clb-cta">
        <h2>Stop losing brand deals in your inbox.</h2>
        <Link to="/login" className="clb-btn clb-btn--primary">
          Connect Gmail
        </Link>
      </section>

      <footer className="clb-footer">
        <Logo variant="icon" size={22} />
        <p>&copy; {new Date().getFullYear()} Collabry</p>
      </footer>
    </div>
  );
}

export default Landing;