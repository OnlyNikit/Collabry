import "./LoginLoader.css";

function LoginLoader({ label = "Checking your session" }) {
  return (
    <div className="clb-auth-loading" role="status" aria-live="polite">
      <div className="clb-loader-orbit">
        <svg
          className="clb-loader-svg"
          viewBox="0 0 120 120"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            className="clb-loader-ring"
            cx="60"
            cy="60"
            r="46"
          />
          <g className="clb-loader-spin">
            <circle className="clb-loader-node clb-loader-node--creator" cx="60" cy="14" r="6" />
            <circle className="clb-loader-node clb-loader-node--brand" cx="60" cy="106" r="6" />
          </g>
        </svg>
        <div className="clb-loader-mark">C</div>
      </div>

      <p className="clb-loader-text">
        {label}
        <span className="clb-loader-dots" aria-hidden="true">
          <span>.</span>
          <span>.</span>
          <span>.</span>
        </span>
      </p>
    </div>
  );
}

export default LoginLoader;