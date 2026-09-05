import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

function AuthSuccess() {
  const navigate = useNavigate();

  const { login } = useAuth();

  const [error, setError] =
    useState("");

  const hasProcessed =
    useRef(false);

  useEffect(() => {
    if (hasProcessed.current) {
      return;
    }

    hasProcessed.current = true;

    const handleAuthSuccess =
      async () => {
        const params =
          new URLSearchParams(
            window.location.search
          );

        const token =
          params.get("token");

        if (!token) {
          navigate(
            "/login?error=authentication_failed",
            {
              replace: true,
            }
          );

          return;
        }

        const user =
          await login(token);

        if (!user) {
          setError(
            "Authentication failed. Please try again."
          );

          return;
        }

        /*
          Remove token from URL
          only after successful authentication.
        */

        window.history.replaceState(
          {},
          document.title,
          "/auth/success"
        );

        navigate(
          "/dashboard",
          {
            replace: true,
          }
        );
      };

    handleAuthSuccess();
  }, [login, navigate]);

  return (
    <div className="clb-auth-success">
      {error ? (
        <p>{error}</p>
      ) : (
        <p>
          Signing you in...
        </p>
      )}
    </div>
  );
}

export default AuthSuccess;