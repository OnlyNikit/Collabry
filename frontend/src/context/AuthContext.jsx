import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

const AuthContext = createContext(null);

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080/api";

export function AuthProvider({ children }) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  /* ========================================
     GET CURRENT USER
  ======================================== */

  const fetchCurrentUser =
    useCallback(async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data =
          await response.json();

        console.log(
          "AUTH RESPONSE:",
          response.status,
          data
        );

        if (!response.ok) {
          setUser(null);
          return null;
        }

        const currentUser =
          data?.data?.user;

        if (!currentUser) {
          setUser(null);
          return null;
        }

        setUser(currentUser);

        return currentUser;

      } catch (error) {
        console.error(
          "AUTH REQUEST FAILED:",
          error
        );

        setUser(null);

        return null;
      }
    }, []);


  /* ========================================
     UPDATE CURRENT USER
  ======================================== */

  const updateUser =
    useCallback(async (profileData) => {
      try {
        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            method: "PUT",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              profileData
            ),
          }
        );

        const data =
          await response.json();

        console.log(
          "PROFILE UPDATE RESPONSE:",
          response.status,
          data
        );

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Failed to update profile"
          );
        }

        const updatedUser =
          data?.data?.user;

        if (!updatedUser) {
          throw new Error(
            "Updated user data not received"
          );
        }

        setUser(updatedUser);

        return updatedUser;

      } catch (error) {
        console.error(
          "PROFILE UPDATE ERROR:",
          error
        );

        throw error;
      }
    }, []);


  /* ========================================
     CHECK AUTH ON APP LOAD
  ======================================== */

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/me`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        const data =
          await response.json();

        console.log(
          "INITIAL AUTH CHECK:",
          response.status,
          data
        );

        if (
          isMounted &&
          response.ok &&
          data?.data?.user
        ) {
          setUser(
            data.data.user
          );
        } else if (isMounted) {
          setUser(null);
        }

      } catch (error) {
        console.error(
          "INITIAL AUTH ERROR:",
          error
        );

        if (isMounted) {
          setUser(null);
        }

      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, []);


  /* ========================================
     LOGOUT
  ======================================== */

  const logout =
    useCallback(async () => {
      try {
        const response = await fetch(
          `${API_URL}/auth/logout`,
          {
            method: "POST",
            credentials: "include",
          }
        );

        console.log(
          "LOGOUT RESPONSE:",
          response.status
        );

      } catch (error) {
        console.error(
          "LOGOUT ERROR:",
          error
        );

      } finally {
        /*
          Even if backend request fails,
          clear frontend user state.
        */
        setUser(null);
      }
    }, []);


  /* ========================================
     CONTEXT VALUE
  ======================================== */

  const value = {
    user,

    loading,

    isAuthenticated:
      Boolean(user),

    fetchCurrentUser,

    updateUser,

    logout,
  };


  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}


/* ========================================
   CUSTOM HOOK
======================================== */

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider"
    );
  }

  return context;
}

export default AuthContext;