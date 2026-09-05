import { createContext, useContext, useState } from "react";

const LoaderContext = createContext();

export function LoaderProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading...");

  function startLoading(message = "Loading...") {
    setLoadingMessage(message);
    setIsLoading(true);
  }

  function stopLoading() {
    setIsLoading(false);
    setLoadingMessage("Loading...");
  }

  return (
    <LoaderContext.Provider
      value={{
        isLoading,
        loadingMessage,
        startLoading,
        stopLoading,
      }}
    >
      {children}
    </LoaderContext.Provider>
  );
}

export function useLoader() {
  return useContext(LoaderContext);
}