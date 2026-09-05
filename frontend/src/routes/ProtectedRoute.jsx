import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import LoginLoader from "../components/common/LoginLoader"

function ProtectedRoute() {
  const { user, isAuthenticated, loading } = useAuth();

  console.log("PROTECTED ROUTE:", {
    user,
    isAuthenticated,
    loading,
  });

  if (loading) {
    return <LoginLoader/>;
  }

  if (!isAuthenticated) {
    console.log("REDIRECTING TO LOGIN — USER:", user);

    return <Navigate to="/login" replace />;
  }

  console.log("ACCESS GRANTED TO PROTECTED ROUTE");

  return <Outlet />;
}

export default ProtectedRoute;
