// // app/(erp)/clients/page.js


// "use client";

// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { requireAuth } from "@/lib/requireAuth";
// import { requireFactory } from "@/lib/requireFactory";
// import { useAuth } from "@/lib/authContext";
// import { useFactory } from "@/lib/factoryContext";
// import { fetchClients, fetchInactiveClients } from "@/lib/clientApi";
// import { fetchProducts } from "@/lib/productApi";
// import { normalizeListResponse } from "@/lib/listResponse";
// import { useAppliedSearch } from "@/lib/useAppliedSearch";
// import PaginationControls from "@/components/PaginationControls";

// function toCsv(rows) {
//   if (!rows?.length) return "";
//   const cols = [
//     { key: "id", label: "Client ID" },
//     { key: "company_name", label: "Company Name" },
//     { key: "gstin", label: "GSTIN" },
//     { key: "email", label: "Email" },
//     { key: "phone", label: "Phone" },
//     { key: "address", label: "Address" },
//     { key: "city", label: "City" },
//     { key: "state", label: "State" },
//     { key: "pincode", label: "Pincode" },
//   ];
//   const esc = (v) => {
//     const s = String(v ?? "");
//     if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
//     return s;
//   };
//   return `${cols.map((c) => esc(c.label)).join(",")}\n${rows.map((r) => cols.map((c) => esc(r[c.key])).join(",")).join("\n")}\n`;
// }

// function downloadTextFile(filename, content, mime = "text/plain") {
//   const blob = new Blob([content], { type: mime });
//   const url = window.URL.createObjectURL(blob);
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   a.remove();
//   window.URL.revokeObjectURL(url);
// }

// function ClientsPage() {
//   const { activeFactory } = useFactory();
//   const auth = useAuth();
//   const can = typeof auth?.can === "function" ? auth.can : () => true;
//   const { searchInput, setSearchInput, appliedSearch, applySearch, clearSearch, onSearchKeyDown } = useAppliedSearch("");

//   const [clients, setClients] = useState([]);
//   const [products, setProducts] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [filterProductId, setFilterProductId] = useState("");
//   const [pagination, setPagination] = useState({ page: 1, page_size: 25, total: 0, total_pages: 1 });
//   const [showInactive, setShowInactive] = useState(false);
//   const [inactiveDays, setInactiveDays] = useState(45);
//   const [inactiveRows, setInactiveRows] = useState([]);
//   const [loadingInactive, setLoadingInactive] = useState(false);

//   async function loadClients(nextPage = pagination.page, nextPageSize = pagination.page_size, opts = {}) {
//     if (!activeFactory?.id) return;
//     const q = String(opts.q ?? appliedSearch).trim();
//     const productId = opts.product_id ?? filterProductId;

//     setLoading(true);
//     setError("");
//     try {
//       const data = await fetchClients(
//         {
//           q: q || undefined,
//           product_id: productId || undefined,
//           page: nextPage,
//           page_size: nextPageSize,
//         },
//         activeFactory.id
//       );
//       const normalized = normalizeListResponse(data);
//       setClients(normalized.items || []);
//       setPagination(normalized.pagination);
//     } catch (e) {
//       setError(e?.message || "Failed to load clients");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     if (!activeFactory?.id) return;
//     fetchProducts({ page: 1, page_size: 200 }, activeFactory.id)
//       .then((data) => {
//         const normalized = normalizeListResponse(data);
//         setProducts(normalized.items || []);
//       })
//       .catch(() => setProducts([]));
//   }, [activeFactory?.id]);

//   useEffect(() => {
//     if (!activeFactory?.id) return;
//     loadClients(1, pagination.page_size);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [activeFactory?.id, appliedSearch, filterProductId]);

//   async function loadInactive() {
//     if (!activeFactory?.id) return;
//     setLoadingInactive(true);
//     setError("");
//     try {
//       const data = await fetchInactiveClients(inactiveDays, activeFactory.id);
//       setInactiveRows(Array.isArray(data) ? data : data?.clients || data?.rows || []);
//     } catch (e) {
//       setError(e?.message || "Failed to load inactive clients");
//     } finally {
//       setLoadingInactive(false);
//     }
//   }

//   const visibleClients = useMemo(() => {
//     const q = String(appliedSearch || "").toLowerCase();
//     if (!q) return clients;
//     return clients.filter((c) => {
//       const company = String(c.company_name || "").toLowerCase();
//       const gst = String(c.gstin || "").toLowerCase();
//       const email = String(c.email || "").toLowerCase();
//       const phone = String(c.phone || "").toLowerCase();
//       const city = String(c.city || "").toLowerCase();
//       const state = String(c.state || "").toLowerCase();
//       return company.includes(q) || gst.includes(q) || email.includes(q) || phone.includes(q) || city.includes(q) || state.includes(q);
//     });
//   }, [clients, appliedSearch]);

//   function clearAllFilters() {
//     clearSearch();
//     setFilterProductId("");
//   }

//   if (!activeFactory) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md">
//           <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a Factory</h3>
//           <p className="text-gray-600">Please select a factory from the top bar to view clients.</p>
//         </div>
//       </div>
//     );
//   }

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-64">
//         <div className="text-center">
//           <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
//           <p className="text-gray-600">Loading clients...</p>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 space-y-6">
//       <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
//           <p className="text-gray-600">Manage customer records for {activeFactory.name}</p>
//         </div>
//         <div className="flex gap-3">
//           {can("clients.create") && (
//             <Link href="/clients/new" className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
//               Create Client
//             </Link>
//           )}
//           <button onClick={() => downloadTextFile(`clients-${activeFactory.id}.csv`, toCsv(visibleClients), "text/csv;charset=utf-8")} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
//             Export CSV
//           </button>
//         </div>
//       </div>

//       {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div> : null}

//       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//         <div className="p-6 border-b border-gray-200 space-y-4">
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             <div className="md:col-span-2 flex gap-2">
//               <input
//                 value={searchInput}
//                 onChange={(e) => setSearchInput(e.target.value)}
//                 onKeyDown={onSearchKeyDown}
//                 placeholder="Search by company, GSTIN, email, phone, city"
//                 className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
//               />
//               <button onClick={applySearch} className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
//                 Search
//               </button>
//             </div>
//             <select value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)} className="px-4 py-3 border border-gray-300 rounded-lg bg-white">
//               <option value="">All products</option>
//               {products.map((p) => (
//                 <option key={p.id} value={p.id}>
//                   {p.name || p.product_name}
//                 </option>
//               ))}
//             </select>
//             <button onClick={clearAllFilters} className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
//               Clear Filters
//             </button>
//           </div>

//           <div className="flex flex-wrap items-center gap-3">
//             <button onClick={() => setShowInactive((v) => !v)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
//               {showInactive ? "Hide" : "Show"} Inactive Clients
//             </button>
//             {showInactive ? (
//               <>
//                 <input type="number" min="1" value={inactiveDays} onChange={(e) => setInactiveDays(Number(e.target.value) || 45)} className="w-32 px-4 py-2 border border-gray-300 rounded-lg" />
//                 <button onClick={loadInactive} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
//                   {loadingInactive ? "Loading..." : "Load"}
//                 </button>
//               </>
//             ) : null}
//           </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
//                 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contact</th>
//                 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Location</th>
//                 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Linked</th>
//                 <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-200">
//               {visibleClients.length === 0 ? (
//                 <tr>
//                   <td colSpan={5} className="px-6 py-10 text-center text-gray-500">No clients found.</td>
//                 </tr>
//               ) : (
//                 visibleClients.map((client) => (
//                   <tr key={client.id} className="hover:bg-gray-50">
//                     <td className="px-6 py-4">
//                       <div className="font-medium text-gray-900">{client.company_name}</div>
//                       <div className="text-xs text-gray-500">GSTIN: {client.gstin || "-"}</div>
//                     </td>
//                     <td className="px-6 py-4 text-gray-700">
//                       <div>{client.email || "-"}</div>
//                       <div className="text-xs text-gray-500">{client.phone || "-"}</div>
//                     </td>
//                     <td className="px-6 py-4 text-gray-700">
//                       <div>{client.city || "-"}</div>
//                       <div className="text-xs text-gray-500">{client.state || "-"}</div>
//                     </td>
//                     <td className="px-6 py-4 text-gray-700">
//                       <div className="text-sm">Contacts: {client?._count?.contacts ?? 0}</div>
//                       <div className="text-xs text-gray-500">Products: {client?._count?.products ?? 0}</div>
//                     </td>
//                     <td className="px-6 py-4">
//                       <Link href={`/clients/${client.id}`} className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
//                         View
//                       </Link>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>

//         <PaginationControls pagination={pagination} currentCount={clients.length} itemLabel="clients" pageSizeOptions={[10, 20, 25, 50]} onPageChange={(page) => loadClients(page, pagination.page_size)} onPageSizeChange={(size) => loadClients(1, size)} />
//       </div>

//       {showInactive ? (
//         <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
//           <div className="p-4 border-b">
//             <h3 className="font-semibold text-gray-800">Inactive Clients</h3>
//             <p className="text-sm text-gray-500">Clients with no recent orders in the selected period.</p>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="w-full">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Company</th>
//                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Email</th>
//                   <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Phone</th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-200">
//                 {inactiveRows.length === 0 ? (
//                   <tr>
//                     <td colSpan={3} className="px-6 py-10 text-center text-gray-500">No inactive clients loaded.</td>
//                   </tr>
//                 ) : (
//                   inactiveRows.map((row) => (
//                     <tr key={row.id} className="hover:bg-gray-50">
//                       <td className="px-6 py-4 font-medium text-gray-900">{row.company_name}</td>
//                       <td className="px-6 py-4 text-gray-700">{row.email || "-"}</td>
//                       <td className="px-6 py-4 text-gray-700">{row.phone || "-"}</td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }

// export default requireAuth(requireFactory(ClientsPage));


























"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useAuth } from "@/lib/authContext";
import { useFactory } from "@/lib/factoryContext";
import { fetchClients, fetchInactiveClients } from "@/lib/clientApi";
import { fetchProducts } from "@/lib/productApi";
import { normalizeListResponse } from "@/lib/listResponse";
import { useAppliedSearch } from "@/lib/useAppliedSearch";
import PaginationControls from "@/components/PaginationControls";

function toCsv(rows) {
  if (!rows?.length) return "";
  const cols = [
    { key: "id", label: "Client ID" },
    { key: "company_name", label: "Company Name" },
    { key: "gstin", label: "GSTIN" },
    { key: "registration_type", label: "Registration Type" },
    { key: "pan_it_no", label: "PAN / IT No" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "mobile_no", label: "Mobile No" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "state", label: "State" },
    { key: "country", label: "Country" },
    { key: "pincode", label: "Pincode" },
  ];

  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  return `${cols.map((c) => esc(c.label)).join(",")}\n${rows
    .map((r) => cols.map((c) => esc(r[c.key])).join(","))
    .join("\n")}\n`;
}

function downloadTextFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function ClientsPage() {
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;
  const {
    searchInput,
    setSearchInput,
    appliedSearch,
    applySearch,
    clearSearch,
    onSearchKeyDown,
  } = useAppliedSearch("");

  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterProductId, setFilterProductId] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total: 0,
    total_pages: 1,
  });
  const [showInactive, setShowInactive] = useState(false);
  const [inactiveDays, setInactiveDays] = useState(45);
  const [inactiveRows, setInactiveRows] = useState([]);
  const [loadingInactive, setLoadingInactive] = useState(false);

  async function loadClients(nextPage = pagination.page, nextPageSize = pagination.page_size, opts = {}) {
    if (!activeFactory?.id) return;
    const q = String(opts.q ?? appliedSearch).trim();
    const productId = opts.product_id ?? filterProductId;

    setLoading(true);
    setError("");
    try {
      const data = await fetchClients(
        {
          q: q || undefined,
          product_id: productId || undefined,
          page: nextPage,
          page_size: nextPageSize,
        },
        activeFactory.id
      );
      const normalized = normalizeListResponse(data);
      setClients(normalized.items || []);
      setPagination(normalized.pagination);
    } catch (e) {
      setError(e?.message || "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!activeFactory?.id) return;
    fetchProducts({ page: 1, page_size: 200 }, activeFactory.id)
      .then((data) => {
        const normalized = normalizeListResponse(data);
        setProducts(normalized.items || []);
      })
      .catch(() => setProducts([]));
  }, [activeFactory?.id]);

  useEffect(() => {
    if (!activeFactory?.id) return;
    loadClients(1, pagination.page_size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFactory?.id, appliedSearch, filterProductId]);

  async function loadInactive() {
    if (!activeFactory?.id) return;
    setLoadingInactive(true);
    setError("");
    try {
      const data = await fetchInactiveClients(inactiveDays, activeFactory.id);
      setInactiveRows(Array.isArray(data) ? data : data?.clients || data?.rows || []);
    } catch (e) {
      setError(e?.message || "Failed to load inactive clients");
    } finally {
      setLoadingInactive(false);
    }
  }

  const visibleClients = useMemo(() => {
    const q = String(appliedSearch || "").toLowerCase();
    if (!q) return clients;

    return clients.filter((c) => {
      const company = String(c.company_name || "").toLowerCase();
      const gst = String(c.gstin || "").toLowerCase();
      const email = String(c.email || "").toLowerCase();
      const phone = String(c.phone || "").toLowerCase();
      const mobile = String(c.mobile_no || "").toLowerCase();
      const city = String(c.city || "").toLowerCase();
      const state = String(c.state || "").toLowerCase();
      const country = String(c.country || "").toLowerCase();
      const registrationType = String(c.registration_type || "").toLowerCase();
      const panItNo = String(c.pan_it_no || "").toLowerCase();

      return (
        company.includes(q) ||
        gst.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        mobile.includes(q) ||
        city.includes(q) ||
        state.includes(q) ||
        country.includes(q) ||
        registrationType.includes(q) ||
        panItNo.includes(q)
      );
    });
  }, [clients, appliedSearch]);

  function clearAllFilters() {
    clearSearch();
    setFilterProductId("");
  }

  if (!activeFactory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200 max-w-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Select a Factory</h3>
          <p className="text-gray-600">Please select a factory from the top bar to view clients.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clients</h1>
          <p className="text-gray-600">Manage customer records for {activeFactory.name}</p>
        </div>
        <div className="flex gap-3">
          {can("clients.create") && (
            <Link href="/clients/new" className="px-4 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800">
              Create Client
            </Link>
          )}
          <button
            onClick={() =>
              downloadTextFile(
                `clients-${activeFactory.id}.csv`,
                toCsv(visibleClients),
                "text/csv;charset=utf-8"
              )
            }
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>
      ) : null}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 flex gap-2">
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={onSearchKeyDown}
                placeholder="Search by company, GSTIN, PAN, email, phone, mobile, city, country"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
              />
              <button
                onClick={applySearch}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Search
              </button>
            </div>

            <select
              value={filterProductId}
              onChange={(e) => setFilterProductId(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">All products</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.product_name}
                </option>
              ))}
            </select>

            <button
              onClick={clearAllFilters}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowInactive((v) => !v)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {showInactive ? "Hide" : "Show"} Inactive Clients
            </button>

            {showInactive ? (
              <>
                <input
                  type="number"
                  min="1"
                  value={inactiveDays}
                  onChange={(e) => setInactiveDays(Number(e.target.value) || 45)}
                  className="w-32 px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={loadInactive}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {loadingInactive ? "Loading..." : "Load"}
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tax / Registration
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Linked
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {visibleClients.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    No clients found.
                  </td>
                </tr>
              ) : (
                visibleClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{client.company_name}</div>
                      <div className="text-xs text-gray-500">GSTIN: {client.gstin || "-"}</div>
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      <div>{client.registration_type || "-"}</div>
                      <div className="text-xs text-gray-500">PAN / IT: {client.pan_it_no || "-"}</div>
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      <div>{client.email || "-"}</div>
                      <div className="text-xs text-gray-500">Phone: {client.phone || "-"}</div>
                      <div className="text-xs text-gray-500">Mobile: {client.mobile_no || "-"}</div>
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      <div>
                        {[client.city, client.state].filter(Boolean).join(", ") || "-"}
                      </div>
                      <div className="text-xs text-gray-500">{client.country || "-"}</div>
                    </td>

                    <td className="px-6 py-4 text-gray-700">
                      <div className="text-sm">Contacts: {client?._count?.contacts ?? 0}</div>
                      <div className="text-xs text-gray-500">Products: {client?._count?.products ?? 0}</div>
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/clients/${client.id}`}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          pagination={pagination}
          currentCount={clients.length}
          itemLabel="clients"
          pageSizeOptions={[10, 20, 25, 50]}
          onPageChange={(page) => loadClients(page, pagination.page_size)}
          onPageSizeChange={(size) => loadClients(1, size)}
        />
      </div>

      {showInactive ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800">Inactive Clients</h3>
            <p className="text-sm text-gray-500">Clients with no recent orders in the selected period.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Mobile
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {inactiveRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                      No inactive clients loaded.
                    </td>
                  </tr>
                ) : (
                  inactiveRows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{row.company_name}</td>
                      <td className="px-6 py-4 text-gray-700">{row.email || "-"}</td>
                      <td className="px-6 py-4 text-gray-700">{row.phone || "-"}</td>
                      <td className="px-6 py-4 text-gray-700">{row.mobile_no || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default requireAuth(requireFactory(ClientsPage));