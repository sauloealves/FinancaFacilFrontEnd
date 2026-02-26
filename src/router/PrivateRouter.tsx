  
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/auth/AuthContext";
import type { JSX } from "react";

export default function PrivateRoute({
  children,
}: Readonly<{
  children: JSX.Element;
}>) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}