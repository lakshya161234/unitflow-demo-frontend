"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getFactories } from "../services/factories";
import { useAuth } from "./AuthContext";

const FactoryContext = createContext(null);

export function FactoryProvider({ children }) {
  const { token, user } = useAuth();

  const [factories, setFactories] = useState([]);
  const [factory, setFactory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !user) {
      setLoading(false);
      return;
    }

    getFactories(token)
      .then((list) => {
        setFactories(list);

        const savedFactory = sessionStorage.getItem("factory_id");

        if (savedFactory && list.find((f) => f.id === savedFactory)) {
          setFactory(savedFactory);
          return;
        }

        // Staff with only one factory → auto select
        if (!user.is_admin && list.length === 1) {
          setFactory(list[0].id);
          sessionStorage.setItem("factory_id", list[0].id);
        }
      })
      .finally(() => setLoading(false));
  }, [token, user]);

  function selectFactory(id) {
    setFactory(id);
    sessionStorage.setItem("factory_id", id);
  }

  function clearFactory() {
    setFactory(null);
    sessionStorage.removeItem("factory_id");
  }

  return (
    <FactoryContext.Provider
      value={{
        factories,
        factory,
        loading,
        selectFactory,
        clearFactory,
      }}
    >
      {children}
    </FactoryContext.Provider>
  );
}

export function useFactory() {
  return useContext(FactoryContext);
}
