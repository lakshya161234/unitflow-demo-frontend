"use client";

import { useAuth } from "./authContext";
import { useFactory } from "./factoryContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function requireFactory(Component) {
  return function FactoryProtected(props) {
    const { user, loading: authLoading } = useAuth();
    const { activeFactory, loading: factoryLoading } = useFactory();
    const router = useRouter();

    useEffect(() => {
      // ⛔ WAIT until BOTH auth & factory are ready
      if (authLoading || factoryLoading) return;

      // 🚫 No factory even after loading
      if (!activeFactory) {
        router.replace("/dashboard");
      }
    }, [authLoading, factoryLoading, activeFactory]);

    if (authLoading || factoryLoading) {
      return <p>Loading factory...</p>;
    }

    if (!activeFactory) {
      return null;
    }

    return <Component {...props} />;
  };
}
