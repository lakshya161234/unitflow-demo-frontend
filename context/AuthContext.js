// // context/AuthContext.js

// "use client";

// import { createContext, useContext, useEffect, useState } from "react";
// import { getProfile } from "../services/auth";

// const AuthContext = createContext(null);

// export function AuthProvider({ children }) {
//   const [token, setToken] = useState(null);
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const savedToken = sessionStorage.getItem("token");

//     if (!savedToken) {
//       setLoading(false);
//       return;
//     }

//     getProfile(savedToken)
//       .then((data) => {
//         setToken(savedToken);
//         setUser(data);
//       })
//       .catch(() => {
//         sessionStorage.clear();
//         setToken(null);
//         setUser(null);
//       })
//       .finally(() => setLoading(false));
//   }, []);

//   function loginUser(jwt) {
//     sessionStorage.setItem("token", jwt);
//     setToken(jwt);
//   }

//   function logout() {
//     sessionStorage.clear();
//     setToken(null);
//     setUser(null);
//     window.location.href = "/login";
//   }

//   return (
//     <AuthContext.Provider
//       value={{ token, user, loading, loginUser, logout }}
//     >
//       {children}
//     </AuthContext.Provider>
//   );
// }

// export function useAuth() {
//   return useContext(AuthContext);
// }












"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProfile } from "../services/auth";

const AuthContext = createContext(null);

function normalizeKey(p) {
  if (!p) return null;
  if (typeof p === "string") return p;
  // common shapes: { key }, { permission }, { name }
  return p.key || p.permission || p.name || null;
}

function buildPermissionSet(user) {
  const set = new Set();

  if (!user) return set;

  // direct permissions – common shapes
  // 1) user.permissions: ["orders.view"] OR [{key:"orders.view"}]
  if (Array.isArray(user.permissions)) {
    user.permissions.forEach((p) => {
      const k = normalizeKey(p);
      if (k) set.add(k);
    });
  }

  // 2) user.direct_permissions: [{key:"..."}] OR ["..."]
  if (Array.isArray(user.direct_permissions)) {
    user.direct_permissions.forEach((p) => {
      const k = normalizeKey(p);
      if (k) set.add(k);
    });
  }

  // 3) roles permissions: user.roles[].permissions[]
  if (Array.isArray(user.roles)) {
    user.roles.forEach((r) => {
      if (Array.isArray(r?.permissions)) {
        r.permissions.forEach((p) => {
          const k = normalizeKey(p);
          if (k) set.add(k);
        });
      }
    });
  }

  // 4) some APIs return flat role_permissions
  if (Array.isArray(user.role_permissions)) {
    user.role_permissions.forEach((p) => {
      const k = normalizeKey(p);
      if (k) set.add(k);
    });
  }

  // 5) fallback: permission_keys
  if (Array.isArray(user.permission_keys)) {
    user.permission_keys.forEach((k) => {
      if (typeof k === "string" && k) set.add(k);
    });
  }

  return set;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Build permission cache whenever user changes
  const permSet = useMemo(() => buildPermissionSet(user), [user]);

  // ✅ can(permissionKey): admin bypass + null allowed
  const can = (permissionKey) => {
    if (permissionKey == null) return true; // Dashboard etc.
    if (!user) return false;
    if (user?.is_admin) return true; // admin sees all
    return permSet.has(permissionKey);
  };

  async function hydrateProfile(jwt) {
    if (!jwt) return;
    const data = await getProfile(jwt);
    setToken(jwt);
    setUser(data);
  }

  useEffect(() => {
    const savedToken = sessionStorage.getItem("token");

    if (!savedToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    hydrateProfile(savedToken)
      .catch(() => {
        sessionStorage.clear();
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ login should fetch profile immediately so sidebar updates without refresh
  async function loginUser(jwt) {
    sessionStorage.setItem("token", jwt);
    setLoading(true);
    try {
      await hydrateProfile(jwt);
    } catch (e) {
      sessionStorage.clear();
      setToken(null);
      setUser(null);
      throw e;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.clear();
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        loading,
        loginUser,
        logout,
        can,              // ✅ added
        permissions: permSet, // optional debug/help
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}