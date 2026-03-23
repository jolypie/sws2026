import { Navigate } from "react-router-dom";
import { isTokenValid } from "../utils/jwt";

export default function PrivateRoute({ children }) {
  const token = localStorage.getItem("authToken");

  if (!isTokenValid(token)) {
    localStorage.removeItem("authToken");
    return <Navigate to="/login" replace />;
  }

  return children;
}
