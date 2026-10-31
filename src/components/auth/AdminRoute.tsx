import React from "react";
import { Link, Navigate } from "react-router-dom";
import { ShieldX, Home } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Loading } from "@/components/common/Loading";

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isStaff, loading } = useAuth();

  if (loading) {
    return <Loading fullScreen message="Verifying staff permissions with database..." />;
  }

  if (!user) {
    return <Navigate to="/login?redirect=/admin" replace />;
  }

  if (!isStaff) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950/60 text-danger-600 flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-2">403 - Staff Access Required</h1>
        <p className="text-sm text-muted max-w-md mb-6">
          This area is restricted to verified platform moderators and administrators. Your account does not have staff permissions in the database.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-700 hover:bg-brand-900 text-white rounded-lg text-sm font-semibold transition-colors min-h-[44px]"
        >
          <Home className="w-4 h-4" />
          Back to Homepage
        </Link>
      </div>
    );
  }

  return <>{children}</>;
};
