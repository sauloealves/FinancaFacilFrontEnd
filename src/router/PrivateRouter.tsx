import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../hooks/useAuth";
import type { JSX } from "react/jsx-dev-runtime";

type Props = {
  children: JSX.Element;
};

export default function PrivateRoute({ children }: Props) {
  console.log("PrivateRoute: Checking authentication");
  console.log("Is authenticated:", isAuthenticated());
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}