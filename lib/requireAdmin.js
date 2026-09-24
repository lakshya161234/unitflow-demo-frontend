"use client";

import { useAuth } from "./authContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function requireAdmin(Component) {
  return function AdminProtected(props) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && user && !user.is_admin) {
        router.replace("/dashboard");
      }
    }, [user, loading]);

    if (loading || !user) {
      return <p>Loading...</p>;
    }

    if (!user.is_admin) {
      return null;
    }

    return <Component {...props} />;
  };
}
