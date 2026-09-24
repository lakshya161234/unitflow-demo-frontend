"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchMe, clearToken, getToken } from "./auth";
import { buildPermissionSet, canAccess } from "./permissions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissionSet, setPermissionSet] = useState(null);
  const [loading, setLoading] = useState(true);

  // async function loadUser() {
  //   const token = getToken();

  //   if (!token) {
  //     setUser(null);
  //     setLoading(false);
  //     return;
  //   }

  //   try {
  //     const me = await fetchMe();
  //     setUser(me);
  //   } catch {
  //     clearToken();
  //     setUser(null);
  //   } finally {
  //     setLoading(false);
  //   }
  // }

  async function loadUser() {
    const token = getToken();

    if (!token) {
      setUser(null);
      setPermissionSet(null);
      setLoading(false);
      return;
    }

    try {
      const me = await fetchMe();
      setUser(me);
      setPermissionSet(buildPermissionSet(me));
    } catch (err) {
      if (err.message === "UNAUTHORIZED") {
        clearToken();
        setUser(null);
        setPermissionSet(null);
      }
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadUser();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, reloadUser: loadUser, permissionSet, can: (key) => canAccess({ user, permissionSet }, key) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
