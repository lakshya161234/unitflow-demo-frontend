// "use client";

// import { useAuth } from "./authContext";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";

// export function requireAuth(Component) {
//   return function ProtectedPage(props) {
//     const { user, loading } = useAuth();
//     const router = useRouter();
//     const [mounted, setMounted] = useState(false);

//     useEffect(() => {
//       setMounted(true);
//     }, []);

//     useEffect(() => {
//       if (!mounted || loading) return;
//       if (!user) router.replace("/login");
//     }, [mounted, loading, user]);

//     if (!mounted || loading) {
//       return null; // ✅ hydration-safe
//     }

//     if (!user) {
//       return null;
//     }

//     return <Component {...props} />;
//   };
// }





// "use client";

// import { useAuth } from "./authContext";
// import { useRouter } from "next/navigation";
// import { useEffect, useRef } from "react";

// export function requireAuth(Component) {
//   return function ProtectedPage(props) {
//     const { user, loading } = useAuth();
//     const router = useRouter();
//     const redirected = useRef(false);

//     useEffect(() => {
//       if (loading) return;

//       if (!user && !redirected.current) {
//         redirected.current = true;
//         router.replace("/login");
//       }
//     }, [user, loading, router]);

//     if (loading) {
//       return <p>Loading session...</p>;
//     }

//     if (!user) {
//       return null;
//     }

//     return <Component {...props} />;
//   };
// }





"use client";

import { useAuth } from "./authContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function requireAuth(Component) {
  return function ProtectedPage(props) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const redirected = useRef(false);

    useEffect(() => {
      if (loading) return;

      if (!user && !redirected.current) {
        redirected.current = true;
        router.replace("/login");
      }
    }, [user, loading]);

    if (loading) return <p>Loading session...</p>;
    if (!user) return null;

    return <Component {...props} />;
  };
}
