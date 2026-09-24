// "use client";

// import { createContext, useContext, useEffect, useState } from "react";
// import { useAuth } from "./authContext";
// import { fetchFactories } from "./factoryApi";

// const FactoryContext = createContext(null);

// export function FactoryProvider({ children }) {
//   const { user } = useAuth();

//   const [factories, setFactories] = useState([]);
//   const [activeFactory, setActiveFactory] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!user) {
//       setLoading(false);
//       return;
//     }

//     setLoading(true);

//     // 👑 ADMIN → fetch all factories
//     if (user.is_admin) {
//       fetchFactories()
//         .then((allFactories) => {
//           setFactories(allFactories);

//           const stored = localStorage.getItem("active_factory");
//           if (stored) {
//             const parsed = JSON.parse(stored);
//             const match = allFactories.find(f => f.id === parsed.id);
//             if (match) setActiveFactory(match);
//           }
//         })
//         .finally(() => setLoading(false));

//       return;
//     }

//     // 👤 STAFF → factories come directly from /auth/me
//     if (Array.isArray(user.factories)) {
//       setFactories(user.factories);

//       if (user.factories.length === 1) {
//         setActiveFactory(user.factories[0]);
//       }
//     }

//     setLoading(false);
//   }, [user]);

//   useEffect(() => {
//     if (user?.is_admin && activeFactory) {
//       localStorage.setItem(
//         "active_factory",
//         JSON.stringify(activeFactory)
//       );
//     }
//   }, [activeFactory, user]);

//   return (
//     <FactoryContext.Provider
//       value={{
//         factories,
//         activeFactory,
//         setActiveFactory,
//         loading,
//       }}
//     >
//       {children}
//     </FactoryContext.Provider>
//   );
// }

// export function useFactory() {
//   const context = useContext(FactoryContext);
//   if (!context) {
//     throw new Error("useFactory must be used inside FactoryProvider");
//   }
//   return context;
// }











"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./authContext";
import { fetchFactories } from "./factoryApi";

const FactoryContext = createContext(null);

export function FactoryProvider({ children }) {
  const { user } = useAuth();

  const [factories, setFactories] = useState([]);
  const [activeFactory, setActiveFactory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 👑 ADMIN → fetch all factories
    if (user.is_admin) {
      fetchFactories()
        .then((all) => {
          const list = Array.isArray(all) ? all : [];
          const withAll = [{ id: "all", name: "All Factories" }, ...list];
          setFactories(withAll);

          const stored = localStorage.getItem("active_factory");
          if (stored) {
            const parsed = JSON.parse(stored);
            const match = withAll.find((f) => f.id === parsed.id);
            if (match) setActiveFactory(match);
          }
        })
        .finally(() => setLoading(false));

      return;
    }

    // 👤 NON-ADMIN → factories come from /auth/me
    if (Array.isArray(user.factories)) {
      const list = user.factories;
      const withAll = list.length > 1 ? [{ id: "all", name: "All Factories" }, ...list] : list;
      setFactories(withAll);

      const stored = localStorage.getItem("active_factory");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const match = withAll.find((f) => f.id === parsed.id);
          if (match) {
            setActiveFactory(match);
          } else if (list.length === 1) {
            setActiveFactory(list[0]);
          }
        } catch {
          if (list.length === 1) setActiveFactory(list[0]);
        }
      } else if (list.length === 1) {
        setActiveFactory(list[0]);
      }
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (activeFactory) {
      localStorage.setItem("active_factory", JSON.stringify(activeFactory));
    }
  }, [activeFactory, user]);

  return (
    <FactoryContext.Provider
      value={{
        factories,
        activeFactory,
        setActiveFactory,
        loading,
      }}
    >
      {children}
    </FactoryContext.Provider>
  );
}

export function useFactory() {
  const ctx = useContext(FactoryContext);
  if (!ctx) {
    throw new Error("useFactory must be used inside FactoryProvider");
  }
  return ctx;
}
