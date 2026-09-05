import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";

import "./Toast.css";

const ToastContext = createContext(null);

export function ToastProvider({
  children,
}) {
  const [toast, setToast] =
    useState(null);

  const timeoutRef =
    useRef(null);

  const showToast =
    useCallback(
      (
        message,
        type = "success",
        duration = 3000,
      ) => {
        if (timeoutRef.current) {
          clearTimeout(
            timeoutRef.current,
          );
        }

        setToast({
          message,
          type,
        });

        timeoutRef.current =
          setTimeout(() => {
            setToast(null);
            timeoutRef.current =
              null;
          }, duration);
      },
      [],
    );

  const hideToast =
    useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current,
        );

        timeoutRef.current =
          null;
      }

      setToast(null);
    }, []);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        hideToast,
      }}
    >
      {children}

      {toast && (
        <div
          className={`clb-toast clb-toast--${toast.type}`}
          role="alert"
        >
          <span className="clb-toast__message">
            {toast.message}
          </span>

          <button
            type="button"
            className="clb-toast__close"
            onClick={hideToast}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context =
    useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast must be used inside ToastProvider",
    );
  }

  return context;
}