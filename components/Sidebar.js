// "use client";

// import Link from "next/link";
// import { usePathname } from "next/navigation";
// import { useAuth } from "@/lib/authContext";
// import appConfig from "@/lib/appConfig";

// export default function Sidebar() {
//   const pathname = usePathname();
//   const { can, user } = useAuth();

//   const menuItems = [
//     {
//       href: "/dashboard",
//       label: "Dashboard",
//       permission: null,
//       icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
//     },

//     { href: "/factories", label: "Factories", permission: "factories.view", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },

//     { href: "/categories", label: "Categories", permission: "categories.view", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10-10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },

//     { href: "/products", label: "Products", permission: "products.view", icon: "M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0H4m4 0v-2a2 2 0 012-2h4a2 2 0 012 2v2" },

//     { href: "/clients", label: "Clients", permission: "clients.view", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0H11" },

//     { href: "/orders", label: "Orders", permission: "orders.view", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },

//     { href: "/invoices", label: "Invoices", permission: "invoices.view", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },

//     { href: "/payments", label: "Payments", permission: "payments.view", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },

//     { href: "/production", label: "Production", permission: "production.view", icon: "M13 10V3L4 14h7v7l9-11h-7z" },

//     { href: "/inventory", label: "Inventory", permission: "inventory.view", icon: "M3 7h18M3 12h18M3 17h18" },

//     { href: "/purchases", label: "Purchases", permission: "purchases.view", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m13-9l2 9m-5-9v9m-4-9v9" },

//     { href: "/messages", label: "Messages", permission: "messages.outbox.view", icon: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
//   ];

//   const adminItems = [
//     { href: "/admin/users", label: "Users", permission: "admin.users.view", icon: "M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H2v-2a4 4 0 014-4h5m4-4a4 4 0 11-8 0 4 4 0 018 0z" },

//   ];

//   return (
//     <aside className={`w-64 bg-gradient-to-b ${appConfig.brand.sidebarGradientFrom} ${appConfig.brand.sidebarGradientTo} text-white flex flex-col h-screen sticky top-0 self-start shadow-xl`}>
//       <div className="p-6 border-b border-blue-700/50">
//         <div className="flex items-center gap-3">
//           <img src={appConfig.brand.logoPath} alt="Logo" className="h-12 w-12" />
//           <div>
//             <h1 className="text-lg font-bold">{appConfig.brand.companyName}</h1>
//           </div>
//         </div>
//       </div>

//       <nav className="flex-1 p-4 overflow-y-auto">
//         <div className="space-y-1">
//           <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider px-3 py-2">MAIN MENU</p>
//           {menuItems
//             .filter((item) => can(item.permission))
//             .map((item) => {
//               const isActive = pathname === item.href;
//               return (
//                 <Link
//                   key={item.href}
//                   href={item.href}
//                   className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? "bg-blue-700 text-white shadow-lg" : "text-blue-100 hover:bg-blue-800/50 hover:translate-x-1"}`}
//                 >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
//                   </svg>
//                   <span className="font-medium">{item.label}</span>
//                   {isActive && <div className="ml-auto h-2 w-2 bg-white rounded-full animate-pulse"></div>}
//                 </Link>
//               );
//             })}
//         </div>

//         {user?.is_admin && (
//           <div className="mt-8 space-y-1">
//             <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider px-3 py-2">ADMINISTRATION</p>
//             {adminItems
//               .filter((item) => can(item.permission))
//               .map((item) => {
//                 const isActive = pathname === item.href;
//                 return (
//                   <Link
//                     key={item.href}
//                     href={item.href}
//                     className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive ? "bg-purple-700 text-white shadow-lg" : "text-blue-100 hover:bg-blue-800/50 hover:translate-x-1"}`}
//                   >
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
//                     </svg>
//                     <span className="font-medium">{item.label}</span>
//                     <span className="ml-auto text-xs bg-purple-600 px-2 py-1 rounded-full">Admin</span>
//                   </Link>
//                 );
//               })}
//           </div>
//         )}
//       </nav>

//       <div className="p-4 border-t border-blue-700/50">
//         <div className="flex items-center gap-3 px-3 py-2">
//           <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center font-semibold">U</div>
//           <div className="flex-1 min-w-0">
//             <p className="text-sm font-medium truncate">User Profile</p>
//             <p className="text-xs text-blue-200 truncate">Online</p>
//           </div>
//         </div>
//       </div>
//     </aside>
//   );
// }











"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/authContext";
import appConfig from "@/lib/appConfig";

export default function Sidebar() {
  const pathname = usePathname();
  const { can, user } = useAuth();

  const menuItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      permission: null, // always visible
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },

    { href: "/factories", label: "Factories", permission: "factories.view", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
    { href: "/categories", label: "Categories", permission: "categories.view", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10-10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zm0 10a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { href: "/products", label: "Products", permission: "products.view", icon: "M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6m16 0H4m4 0v-2a2 2 0 012-2h4a2 2 0 012 2v2" },
    { href: "/clients", label: "Clients", permission: "clients.view", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13 0H11" },
    { href: "/orders", label: "Orders", permission: "orders.view", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { href: "/invoices", label: "Invoices", permission: "invoices.view", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { href: "/payments", label: "Payments", permission: "payments.view", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { href: "/production", label: "Production", permission: "production.view", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { href: "/inventory", label: "Inventory", permission: "inventory.view", icon: "M3 7h18M3 12h18M3 17h18" },
    { href: "/purchases", label: "Purchases", permission: "purchases.view", icon: "M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m13-9l2 9m-5-9v9m-4-9v9" },
    { href: "/chat", label: "Chat", permission: "im.chat.view", icon: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
    { href: "/announcements", label: "Announcements", permission: "im.broadcast.view", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },

    { href: "/messages", label: "Messages", permission: "messages.outbox.view", icon: "M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  ];

  const adminItems = [
    { href: "/admin/users", label: "Users", permission: "admin.users.view", icon: "M17 20h5v-2a4 4 0 00-4-4h-1m-4 6H2v-2a4 4 0 014-4h5m4-4a4 4 0 11-8 0 4 4 0 018 0z" },
    
  ];

  // ✅ Ensure Dashboard (permission null) works even if can(null) isn't handled in authContext yet
  const canItem = (perm) => perm == null ? true : can(perm);

  const visibleMain = menuItems.filter((item) => canItem(item.permission));
  const visibleAdmin = adminItems.filter((item) => canItem(item.permission));

  const showAdminSection =
    Boolean(user?.is_admin) ||
    can("admin.access") ||
    visibleAdmin.length > 0;

  return (
    <aside className={`w-64 bg-gradient-to-b ${appConfig.brand.sidebarGradientFrom} ${appConfig.brand.sidebarGradientTo} text-white flex flex-col h-screen sticky top-0 self-start shadow-xl`}>
      <div className="p-6 border-b border-blue-800">
        <div className="flex items-center gap-3">
          <img src={appConfig.brand.logoPath} alt="Logo" className="h-8 w-40 " />
          {/* <div>
            <h1 className="text-lg font-bold">{appConfig.brand.companyName}</h1>
          </div> */}
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider px-3 py-2">MAIN MENU</p>
          {visibleMain.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive ? "bg-blue-700 text-white shadow-lg" : "text-blue-100 hover:bg-blue-800/50 hover:translate-x-1"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
                <span className="font-medium">{item.label}</span>
                {isActive && <div className="ml-auto h-2 w-2 bg-white rounded-full animate-pulse"></div>}
              </Link>
            );
          })}
        </div>

        {showAdminSection && (
          <div className="mt-8 space-y-1">
            <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider px-3 py-2">ADMINISTRATION</p>

            {visibleAdmin.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive ? "bg-purple-700 text-white shadow-lg" : "text-blue-100 hover:bg-blue-800/50 hover:translate-x-1"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="font-medium">{item.label}</span>
                  <span className="ml-auto text-xs bg-purple-600 px-2 py-1 rounded-full">Admin</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-blue-700/50">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center font-semibold">
            {(user?.name || "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || "User"}</p>
            <p className="text-xs text-blue-200 truncate">{user?.email || "Online"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}