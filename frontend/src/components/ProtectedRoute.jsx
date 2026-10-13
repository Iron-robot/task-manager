import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

/** Renders children only for logged-in users; otherwise redirects to /login. */
export default function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();
  if (initializing) return <p className="page-status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
