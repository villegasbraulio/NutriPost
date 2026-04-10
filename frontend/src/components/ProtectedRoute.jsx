import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { LoadingSkeleton } from "./LoadingSkeleton";

export function ProtectedRoute({ children }) {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSkeleton className="mx-auto mt-20 h-96 max-w-5xl rounded-[32px]" />;
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ from: location }} />;
  }

  return children;
}
