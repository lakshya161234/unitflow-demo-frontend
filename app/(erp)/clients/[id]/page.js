// // app/(erp)/clients/[id]/page.js

// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import { requireAuth } from "@/lib/requireAuth";
// import { requireFactory } from "@/lib/requireFactory";
// import { useAuth } from "@/lib/authContext";
// import { useFactory } from "@/lib/factoryContext";
// import {
//   fetchClientById,
//   updateClient,
//   disableClient,
//   fetchClientOrders,
//   generateClientLetterPdf,
//   fetchClientSlipPdf,
//   reEngageClient,
// } from "@/lib/clientApi";
// import { fetchProducts } from "@/lib/productApi";
// import { addProductToClient, removeProductFromClient } from "@/lib/clientProductApi";
// import { fetchClientContacts, addClientContact, deleteClientContact } from "@/lib/clientContactApi";

// function makeBlobUrl(blob) {
//   return window.URL.createObjectURL(blob);
// }

// function triggerDownload(url, filename) {
//   const a = document.createElement("a");
//   a.href = url;
//   a.download = filename;
//   document.body.appendChild(a);
//   a.click();
//   a.remove();
// }

// function safeReplaceAll(str, map) {
//   let out = String(str || "");
//   Object.entries(map).forEach(([k, v]) => {
//     out = out.replaceAll(`{{${k}}}`, String(v ?? ""));
//   });
//   return out;
// }

// function InfoCard({ label, value }) {
//   return (
//     <div className="bg-gray-50 rounded-lg p-4">
//       <p className="text-sm text-gray-500 mb-1">{label}</p>
//       <p className="font-medium text-gray-800 break-words">{value || <span className="text-gray-400">Not provided</span>}</p>
//     </div>
//   );
// }

// const emptyForm = {
//   company_name: "",
//   gstin: "",
//   phone: "",
//   email: "",
//   address: "",
//   city: "",
//   state: "",
//   pincode: "",
// };

// function ClientDetailPage() {
//   const { id } = useParams();
//   const router = useRouter();
//   const { activeFactory } = useFactory();
//   const auth = useAuth();
//   const can = typeof auth?.can === "function" ? auth.can : () => true;

//   const [client, setClient] = useState(null);
//   const [products, setProducts] = useState([]);
//   const [contacts, setContacts] = useState([]);
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");

//   const [isEditing, setIsEditing] = useState(false);
//   const [form, setForm] = useState(emptyForm);
//   const [saving, setSaving] = useState(false);

//   const [contactForm, setContactForm] = useState({ name: "", designation: "", phone: "", email: "" });
//   const [addingContact, setAddingContact] = useState(false);

//   const [selectedProduct, setSelectedProduct] = useState("");
//   const [linking, setLinking] = useState(false);
//   const [loadingOrders, setLoadingOrders] = useState(false);

//   const [letterTitle, setLetterTitle] = useState("Payment Follow-up");
//   const [letterBody, setLetterBody] = useState(
//     "Dear {{client_name}},\n\nThis is a reminder regarding outstanding balance.\n\nAddress: {{client_address}}\nDate: {{today}}\n\nRegards,\nUnitFlow ERP"
//   );
//   const [letterCustom, setLetterCustom] = useState({
//     today: new Date().toISOString().slice(0, 10),
//     amount_due: "",
//     invoice_no: "",
//     phone: "",
//   });
//   const [letterDownloading, setLetterDownloading] = useState(false);
//   const [lastLetterUrl, setLastLetterUrl] = useState("");
//   const [slipDownloading, setSlipDownloading] = useState(false);

//   const [reengageCustomMessage, setReengageCustomMessage] = useState("");
//   const [reengagePreview, setReengagePreview] = useState(null);
//   const [reengageSending, setReengageSending] = useState(false);
//   const [reengageLoading, setReengageLoading] = useState(false);

//   async function refreshClient() {
//     if (!id) return;
//     const data = await fetchClientById(id, activeFactory?.id);
//     setClient(data);
//     setContacts(Array.isArray(data?.contacts) ? data.contacts : []);
//     setOrders(Array.isArray(data?.orders) ? data.orders : []);
//     return data;
//   }

//   useEffect(() => {
//     if (!id || !activeFactory?.id) return;
//     setLoading(true);
//     setError("");
//     Promise.all([
//       fetchClientById(id, activeFactory.id),
//       fetchProducts(activeFactory.id),
//       fetchClientContacts(id, activeFactory.id).catch(() => null),
//     ])
//       .then(([clientData, productData, contactData]) => {
//         setClient(clientData);
//         const prodRows = Array.isArray(productData) ? productData : productData?.rows || [];
//         setProducts(prodRows);
//         const apiContacts = Array.isArray(contactData) ? contactData : contactData?.rows;
//         setContacts(apiContacts ?? (Array.isArray(clientData?.contacts) ? clientData.contacts : []));
//         setOrders(Array.isArray(clientData?.orders) ? clientData.orders : []);
//       })
//       .catch((e) => setError(e?.message || "Failed to load client"))
//       .finally(() => setLoading(false));
//   }, [id, activeFactory?.id]);

//   useEffect(() => {
//     if (!client) return;
//     setForm({
//       company_name: client.company_name || "",
//       gstin: client.gstin || "",
//       phone: client.phone || "",
//       email: client.email || "",
//       address: client.address || "",
//       city: client.city || "",
//       state: client.state || "",
//       pincode: client.pincode || "",
//     });
//     setLetterCustom((prev) => ({ ...prev, phone: client.phone || prev.phone }));
//   }, [client]);

//   const placeholderMap = useMemo(() => ({
//     client_name: client?.company_name || "",
//     client_address: client?.address || "",
//     client_email: client?.email || "",
//     client_phone: client?.phone || "",
//     client_gstin: client?.gstin || "",
//     today: letterCustom.today || new Date().toISOString().slice(0, 10),
//     amount_due: letterCustom.amount_due || "",
//     invoice_no: letterCustom.invoice_no || "",
//     phone: letterCustom.phone || "",
//   }), [client, letterCustom]);

//   const linkedProducts = Array.isArray(client?.products) ? client.products : [];

//   async function handleSave() {
//     if (!can("clients.update")) return;
//     setSaving(true);
//     setError("");
//     setSuccess("");
//     try {
//       await updateClient(client.id, form, activeFactory?.id);
//       await refreshClient();
//       setIsEditing(false);
//       setSuccess("Client details updated.");
//     } catch (e) {
//       setError(e?.message || "Failed to update client");
//     } finally {
//       setSaving(false);
//     }
//   }

//   async function handleDisable() {
//     if (!can("clients.delete") && !can("clients.update")) return;
//     if (!confirm("Are you sure you want to disable this client?")) return;
//     setError("");
//     try {
//       await disableClient(client.id, activeFactory?.id);
//       router.push("/clients");
//     } catch (e) {
//       setError(e?.message || "Failed to disable client");
//     }
//   }

//   async function handleLink() {
//     if (!selectedProduct || !can("clients.update")) return;
//     setLinking(true);
//     setError("");
//     try {
//       await addProductToClient(client.id, selectedProduct);
//       await refreshClient();
//       setSelectedProduct("");
//     } catch (e) {
//       setError(e?.message || "Failed to link product");
//     } finally {
//       setLinking(false);
//     }
//   }

//   async function handleUnlink(productId) {
//     if (!can("clients.update")) return;
//     setError("");
//     try {
//       await removeProductFromClient(client.id, productId);
//       await refreshClient();
//     } catch (e) {
//       setError(e?.message || "Failed to unlink product");
//     }
//   }

//   async function handleAddContact() {
//     if (!contactForm.name || !can("clients.update")) return;
//     setAddingContact(true);
//     setError("");
//     try {
//       await addClientContact(id, contactForm, activeFactory.id);
//       const updated = await fetchClientContacts(id, activeFactory.id).catch(() => null);
//       const rows = Array.isArray(updated) ? updated : updated?.rows;
//       if (rows) setContacts(rows);
//       else await refreshClient();
//       setContactForm({ name: "", designation: "", phone: "", email: "" });
//     } catch (e) {
//       setError(e?.message || "Failed to add contact");
//     } finally {
//       setAddingContact(false);
//     }
//   }

//   async function handleDeleteContact(contactId) {
//     if (!can("clients.update")) return;
//     if (!confirm("Delete this contact?")) return;
//     setError("");
//     try {
//       await deleteClientContact(id, contactId, activeFactory.id);
//       const updated = await fetchClientContacts(id, activeFactory.id).catch(() => null);
//       const rows = Array.isArray(updated) ? updated : updated?.rows;
//       if (rows) setContacts(rows);
//       else await refreshClient();
//     } catch (e) {
//       setError(e?.message || "Failed to delete contact");
//     }
//   }

//   async function loadOrders() {
//     if (!activeFactory?.id || !can("clients.view")) return;
//     setLoadingOrders(true);
//     setError("");
//     try {
//       const data = await fetchClientOrders(id, activeFactory.id);
//       const rows = Array.isArray(data) ? data : data?.rows || data?.orders || [];
//       setOrders(rows);
//     } catch (e) {
//       setError(e?.message || "Failed to load client orders");
//     } finally {
//       setLoadingOrders(false);
//     }
//   }

//   async function downloadLetterPdf() {
//     if (!can("clients.letter")) return;
//     setLetterDownloading(true);
//     setError("");
//     try {
//       const finalTitle = safeReplaceAll(letterTitle, placeholderMap);
//       const finalBody = safeReplaceAll(letterBody, placeholderMap);
//       const blob = await generateClientLetterPdf(id, { title: finalTitle, body: finalBody, custom_fields: letterCustom });
//       if (lastLetterUrl) window.URL.revokeObjectURL(lastLetterUrl);
//       const url = makeBlobUrl(blob);
//       setLastLetterUrl(url);
//       const filename = `client-letter-${(client?.company_name || id).replaceAll(" ", "_")}.pdf`;
//       triggerDownload(url, filename);
//     } catch (e) {
//       setError(e?.message || "Failed to generate letter");
//     } finally {
//       setLetterDownloading(false);
//     }
//   }

//   async function downloadClientSlip() {
//     setSlipDownloading(true);
//     setError("");
//     try {
//       const blob = await fetchClientSlipPdf(id);
//       const url = makeBlobUrl(blob);
//       const filename = `client-slip-${(client?.company_name || id).replaceAll(" ", "_")}.pdf`;
//       triggerDownload(url, filename);
//       setTimeout(() => window.URL.revokeObjectURL(url), 1500);
//     } catch (e) {
//       setError(e?.message || "Failed to download slip");
//     } finally {
//       setSlipDownloading(false);
//     }
//   }

//   async function previewReengage() {
//     if (!can("clients.reengage")) return;
//     setReengageLoading(true);
//     setError("");
//     setSuccess("");
//     try {
//       const payload = { send: false };
//       if (reengageCustomMessage.trim()) payload.message = safeReplaceAll(reengageCustomMessage, placeholderMap);
//       const preview = await reEngageClient(id, payload);
//       setReengagePreview(preview);
//     } catch (e) {
//       setError(e?.message || "Failed to preview re-engagement email");
//     } finally {
//       setReengageLoading(false);
//     }
//   }

//   async function sendReengage() {
//     if (!can("clients.reengage")) return;
//     setReengageSending(true);
//     setError("");
//     setSuccess("");
//     try {
//       const payload = { send: true };
//       if (reengageCustomMessage.trim()) payload.message = safeReplaceAll(reengageCustomMessage, placeholderMap);
//       const resp = await reEngageClient(id, payload);
//       setSuccess(`Re-engagement email sent successfully.${resp?.log_id ? ` Log ID: ${resp.log_id}` : ""}`);
//       await previewReengage();
//     } catch (e) {
//       setError(e?.message || "Failed to send re-engagement email");
//     } finally {
//       setReengageSending(false);
//     }
//   }

//   if (!activeFactory) return <div className="p-6 text-gray-600">Select a factory to view client details.</div>;

//   if (loading) {
//     return <div className="flex items-center justify-center h-64"><div className="text-center"><div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div><p className="text-gray-600">Loading client details...</p></div></div>;
//   }

//   if (!client) {
//     return (
//       <div className="text-center py-12">
//         <h2 className="text-xl font-semibold text-gray-700 mb-2">Client Not Found</h2>
//         <p className="text-gray-500 mb-6">The requested client could not be found.</p>
//         <button onClick={() => router.push("/clients")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Back to Clients</button>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 space-y-6">
//       <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
//         <div>
//           <div className="flex items-center gap-3 mb-2">
//             <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
//               {(client.company_name || "C").charAt(0).toUpperCase()}
//             </div>
//             <div>
//               <h1 className="text-2xl font-bold text-gray-800">{client.company_name}</h1>
//               <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 flex-wrap">
//                 <span>Client ID: {client.id}</span>
//                 {client.gstin ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">GST Registered</span> : null}
//               </div>
//             </div>
//           </div>
//           <p className="text-gray-500 mt-1">Factory: <span className="font-medium text-blue-700">{activeFactory?.name}</span></p>
//         </div>
//         <div className="flex gap-2">
//           {!isEditing ? (
//             <button onClick={() => setIsEditing(true)} disabled={!can("clients.update")} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60">Edit Details</button>
//           ) : null}
//         </div>
//       </div>

//       {error ? <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div> : null}
//       {success ? <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">{success}</div> : null}

//       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
//         <div className="xl:col-span-2 space-y-6">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center justify-between mb-6">
//               <h2 className="text-lg font-semibold text-gray-800">Client Information</h2>
//               {isEditing ? (
//                 <div className="flex gap-2">
//                   <button onClick={handleSave} disabled={saving || !can("clients.update")} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60">{saving ? "Saving..." : "Save Changes"}</button>
//                   <button onClick={() => { setIsEditing(false); setForm(emptyForm); if (client) setForm({ company_name: client.company_name || "", gstin: client.gstin || "", phone: client.phone || "", email: client.email || "", address: client.address || "", city: client.city || "", state: client.state || "", pincode: client.pincode || "" }); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Cancel</button>
//                 </div>
//               ) : null}
//             </div>

//             {isEditing ? (
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label><input value={form.company_name} onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
//                 <div><label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label><input value={form.gstin} onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
//                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
//                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
//                 <div><label className="block text-sm font-medium text-gray-700 mb-1">City</label><input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
//                 <div><label className="block text-sm font-medium text-gray-700 mb-1">State</label><input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
//                 <div><label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label><input value={form.pincode} onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
//                 <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
//               </div>
//             ) : (
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <InfoCard label="GSTIN" value={client.gstin} />
//                 <InfoCard label="Email" value={client.email} />
//                 <InfoCard label="Phone" value={client.phone} />
//                 <InfoCard label="City" value={client.city} />
//                 <InfoCard label="State" value={client.state} />
//                 <InfoCard label="Pincode" value={client.pincode} />
//                 <div className="md:col-span-2"><InfoCard label="Address" value={client.address} /></div>
//               </div>
//             )}
//           </div>

//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center justify-between mb-4">
//               <h3 className="font-semibold text-gray-800">Client Order History</h3>
//               <button onClick={loadOrders} disabled={loadingOrders || !can("clients.view")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{loadingOrders ? "Loading..." : "Refresh Orders"}</button>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="min-w-full">
//                 <thead>
//                   <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
//                     <th className="py-3 px-4">Order No</th>
//                     <th className="py-3 px-4">Status</th>
//                     <th className="py-3 px-4">Total</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y">
//                   {orders.map((o) => (
//                     <tr key={o.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/orders/${o.id}`)}>
//                       <td className="py-3 px-4 font-medium text-gray-900">{o.order_no || o.id}</td>
//                       <td className="py-3 px-4 text-gray-600">{o.status}</td>
//                       <td className="py-3 px-4 text-gray-600">₹{o.total_amount ?? o.total ?? "-"}</td>
//                     </tr>
//                   ))}
//                   {!loadingOrders && orders.length === 0 ? <tr><td className="py-6 px-4 text-gray-500" colSpan={3}>No orders loaded.</td></tr> : null}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center justify-between mb-6">
//               <h2 className="text-lg font-semibold text-gray-800">Contact Persons</h2>
//               <span className="text-sm text-gray-500">{contacts.length} contacts</span>
//             </div>

//             {contacts.length > 0 ? (
//               <div className="space-y-4">
//                 {contacts.map((contact) => (
//                   <div key={contact.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
//                     <div>
//                       <h3 className="font-medium text-gray-800">{contact.name}</h3>
//                       <p className="text-sm text-gray-600">{contact.designation || "Not specified"}</p>
//                       <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
//                         {contact.email ? <div>{contact.email}</div> : null}
//                         {contact.phone ? <div>{contact.phone}</div> : null}
//                       </div>
//                     </div>
//                     <button onClick={() => handleDeleteContact(contact.id)} disabled={!can("clients.update")} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-60">Delete</button>
//                   </div>
//                 ))}
//               </div>
//             ) : <div className="text-center py-8 text-gray-500">No contact information available.</div>}

//             <div className="mt-8 pt-6 border-t border-gray-200">
//               <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Contact</h3>
//               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                 <input placeholder="Name *" value={contactForm.name} onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
//                 <input placeholder="Designation" value={contactForm.designation} onChange={(e) => setContactForm((p) => ({ ...p, designation: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
//                 <input placeholder="Phone" value={contactForm.phone} onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
//                 <input placeholder="Email" value={contactForm.email} onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))} className="w-full px-4 py-3 border border-gray-300 rounded-lg" />
//               </div>
//               <button onClick={handleAddContact} disabled={!contactForm.name || addingContact || !can("clients.update")} className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{addingContact ? "Adding..." : "Add Contact Person"}</button>
//             </div>
//           </div>
//         </div>

//         <div className="space-y-6">
//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <h3 className="font-semibold text-gray-800 mb-4">Client Engagement</h3>
//             <div className="space-y-3">
//               <button onClick={downloadClientSlip} disabled={slipDownloading} className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60">{slipDownloading ? "Preparing Slip..." : "Download Client Slip"}</button>
//               <button onClick={downloadLetterPdf} disabled={letterDownloading || !can("clients.letter")} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{letterDownloading ? "Generating Letter..." : "Download Client Letter PDF"}</button>
//               {lastLetterUrl ? <button onClick={() => window.open(lastLetterUrl, "_blank", "noopener,noreferrer")} className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Open Last Letter</button> : null}
//             </div>

//             <div className="mt-6 space-y-3 border-t pt-6">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Letter Title</label>
//                 <input value={letterTitle} onChange={(e) => setLetterTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Letter Body</label>
//                 <textarea value={letterBody} onChange={(e) => setLetterBody(e.target.value)} rows={6} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
//               </div>
//             </div>

//             <div className="mt-6 space-y-3 border-t pt-6">
//               <h4 className="font-medium text-gray-800">Re-engage Email</h4>
//               <p className="text-xs text-gray-500">Preview uses backend draft generation. Send uses the real SMTP-backed path and now surfaces backend/provider errors directly.</p>
//               <textarea value={reengageCustomMessage} onChange={(e) => setReengageCustomMessage(e.target.value)} rows={4} placeholder="Optional custom message. {{client_name}} is supported." className="w-full border border-gray-300 rounded-lg px-3 py-2" />
//               <div className="grid grid-cols-2 gap-3">
//                 <button onClick={previewReengage} disabled={reengageLoading || !can("clients.reengage")} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60">{reengageLoading ? "Previewing..." : "Preview Email"}</button>
//                 <button onClick={sendReengage} disabled={reengageSending || !can("clients.reengage")} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60">{reengageSending ? "Sending..." : "Send Re-engage Email"}</button>
//               </div>

//               {reengagePreview ? (
//                 <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm space-y-2">
//                   <div><span className="font-medium text-gray-900">Eligible:</span> {reengagePreview.eligible ? "Yes" : "No"}</div>
//                   <div><span className="font-medium text-gray-900">Days since last order:</span> {reengagePreview.days_since_last_order ?? "—"}</div>
//                   <div><span className="font-medium text-gray-900">To:</span> {reengagePreview.to_email || "—"}</div>
//                   <div><span className="font-medium text-gray-900">Subject:</span> {reengagePreview.subject || "—"}</div>
//                   <div>
//                     <span className="font-medium text-gray-900">Message:</span>
//                     <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white border border-gray-200 p-3 text-xs text-gray-700">{reengagePreview.message || "—"}</pre>
//                   </div>
//                 </div>
//               ) : null}
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
//             <div className="flex items-center justify-between mb-6">
//               <h2 className="text-lg font-semibold text-gray-800">Linked Products</h2>
//               <span className="text-sm text-gray-500">{linkedProducts.length || 0} products</span>
//             </div>
//             <div className="mb-6">
//               <label className="block text-sm font-medium text-gray-700 mb-2">Link New Product</label>
//               <div className="flex gap-2">
//                 <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white">
//                   <option value="">Select a product...</option>
//                   {products.map((p) => <option key={p.id} value={p.id}>{p.name || p.product_name}</option>)}
//                 </select>
//                 <button onClick={handleLink} disabled={!selectedProduct || linking || !can("clients.update")} className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">{linking ? "Adding..." : "Add"}</button>
//               </div>
//             </div>
//             {linkedProducts.length > 0 ? (
//               <div className="space-y-3">
//                 {linkedProducts.map((cp) => (
//                   <div key={cp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
//                     <div className="flex flex-col">
//                       <span className="font-medium text-gray-800">{cp.product?.name || "Product"}</span>
//                       {cp.default_price != null ? <span className="text-xs text-gray-500">Default Price: {cp.default_price}</span> : null}
//                     </div>
//                     <button onClick={() => handleUnlink(cp.product_id)} disabled={!can("clients.update")} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-60">Unlink</button>
//                   </div>
//                 ))}
//               </div>
//             ) : <div className="text-center py-6 text-gray-500">No products linked yet.</div>}
//           </div>

//           <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg p-6 text-white">
//             <h3 className="font-semibold mb-4">Client Overview</h3>
//             <div className="space-y-4">
//               <div><p className="text-sm text-blue-200 mb-1">Linked Products</p><p className="text-2xl font-bold">{linkedProducts.length || 0}</p></div>
//               <div><p className="text-sm text-blue-200 mb-1">Contact Persons</p><p className="text-2xl font-bold">{contacts.length}</p></div>
//               <div><p className="text-sm text-blue-200 mb-1">Orders Loaded</p><p className="text-2xl font-bold">{orders.length}</p></div>
//             </div>
//           </div>

//           <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
//             <h3 className="font-semibold text-red-700 mb-4">Danger Zone</h3>
//             <button onClick={handleDisable} disabled={!can("clients.delete") && !can("clients.update")} className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">Disable Client</button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default requireAuth(requireFactory(ClientDetailPage));

















"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { useAuth } from "@/lib/authContext";
import { useFactory } from "@/lib/factoryContext";
import {
  fetchClientById,
  updateClient,
  disableClient,
  fetchClientOrders,
  generateClientLetterPdf,
  fetchClientSlipPdf,
  reEngageClient,
} from "@/lib/clientApi";
import { fetchProducts } from "@/lib/productApi";
import { addProductToClient, removeProductFromClient } from "@/lib/clientProductApi";
import { fetchClientContacts, addClientContact, deleteClientContact } from "@/lib/clientContactApi";

function makeBlobUrl(blob) {
  return window.URL.createObjectURL(blob);
}

function triggerDownload(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function safeReplaceAll(str, map) {
  let out = String(str || "");
  Object.entries(map).forEach(([k, v]) => {
    out = out.replaceAll(`{{${k}}}`, String(v ?? ""));
  });
  return out;
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className="font-medium text-gray-800 break-words">
        {value || <span className="text-gray-400">Not provided</span>}
      </p>
    </div>
  );
}

const emptyForm = {
  company_name: "",
  gstin: "",
  registration_type: "",
  pan_it_no: "",
  phone: "",
  mobile_no: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
};

function ClientDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { activeFactory } = useFactory();
  const auth = useAuth();
  const can = typeof auth?.can === "function" ? auth.can : () => true;

  const [client, setClient] = useState(null);
  const [products, setProducts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [contactForm, setContactForm] = useState({
    name: "",
    designation: "",
    phone: "",
    email: "",
  });
  const [addingContact, setAddingContact] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState("");
  const [linking, setLinking] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [letterTitle, setLetterTitle] = useState("Payment Follow-up");
  const [letterBody, setLetterBody] = useState(
    "Dear {{client_name}},\n\nThis is a reminder regarding outstanding balance.\n\nAddress: {{client_address}}\nDate: {{today}}\n\nRegards,\nUnitFlow ERP"
  );
  const [letterCustom, setLetterCustom] = useState({
    today: new Date().toISOString().slice(0, 10),
    amount_due: "",
    invoice_no: "",
    phone: "",
  });
  const [letterDownloading, setLetterDownloading] = useState(false);
  const [lastLetterUrl, setLastLetterUrl] = useState("");
  const [slipDownloading, setSlipDownloading] = useState(false);

  const [reengageCustomMessage, setReengageCustomMessage] = useState("");
  const [reengagePreview, setReengagePreview] = useState(null);
  const [reengageSending, setReengageSending] = useState(false);
  const [reengageLoading, setReengageLoading] = useState(false);

  async function refreshClient() {
    if (!id) return;
    const data = await fetchClientById(id, activeFactory?.id);
    setClient(data);
    setContacts(Array.isArray(data?.contacts) ? data.contacts : []);
    setOrders(Array.isArray(data?.orders) ? data.orders : []);
    return data;
  }

  useEffect(() => {
    if (!id || !activeFactory?.id) return;
    setLoading(true);
    setError("");

    Promise.all([
      fetchClientById(id, activeFactory.id),
      fetchProducts(activeFactory.id),
      fetchClientContacts(id, activeFactory.id).catch(() => null),
    ])
      .then(([clientData, productData, contactData]) => {
        setClient(clientData);
        const prodRows = Array.isArray(productData) ? productData : productData?.rows || [];
        setProducts(prodRows);
        const apiContacts = Array.isArray(contactData) ? contactData : contactData?.rows;
        setContacts(apiContacts ?? (Array.isArray(clientData?.contacts) ? clientData.contacts : []));
        setOrders(Array.isArray(clientData?.orders) ? clientData.orders : []);
      })
      .catch((e) => setError(e?.message || "Failed to load client"))
      .finally(() => setLoading(false));
  }, [id, activeFactory?.id]);

  useEffect(() => {
    if (!client) return;
    setForm({
      company_name: client.company_name || "",
      gstin: client.gstin || "",
      registration_type: client.registration_type || "",
      pan_it_no: client.pan_it_no || "",
      phone: client.phone || "",
      mobile_no: client.mobile_no || "",
      email: client.email || "",
      address: client.address || "",
      city: client.city || "",
      state: client.state || "",
      country: client.country || "",
      pincode: client.pincode || "",
    });
    setLetterCustom((prev) => ({
      ...prev,
      phone: client.mobile_no || client.phone || prev.phone,
    }));
  }, [client]);

  const placeholderMap = useMemo(
    () => ({
      client_name: client?.company_name || "",
      client_address: client?.address || "",
      client_email: client?.email || "",
      client_phone: client?.mobile_no || client?.phone || "",
      client_gstin: client?.gstin || "",
      today: letterCustom.today || new Date().toISOString().slice(0, 10),
      amount_due: letterCustom.amount_due || "",
      invoice_no: letterCustom.invoice_no || "",
      phone: letterCustom.phone || "",
    }),
    [client, letterCustom]
  );

  const linkedProducts = Array.isArray(client?.products) ? client.products : [];

  async function handleSave() {
    if (!can("clients.update")) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateClient(client.id, form, activeFactory?.id);
      await refreshClient();
      setIsEditing(false);
      setSuccess("Client details updated.");
    } catch (e) {
      setError(e?.message || "Failed to update client");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisable() {
    if (!can("clients.delete") && !can("clients.update")) return;
    if (!confirm("Are you sure you want to disable this client?")) return;
    setError("");
    try {
      await disableClient(client.id, activeFactory?.id);
      router.push("/clients");
    } catch (e) {
      setError(e?.message || "Failed to disable client");
    }
  }

  async function handleLink() {
    if (!selectedProduct || !can("clients.update")) return;
    setLinking(true);
    setError("");
    try {
      await addProductToClient(client.id, selectedProduct);
      await refreshClient();
      setSelectedProduct("");
    } catch (e) {
      setError(e?.message || "Failed to link product");
    } finally {
      setLinking(false);
    }
  }

  async function handleUnlink(productId) {
    if (!can("clients.update")) return;
    setError("");
    try {
      await removeProductFromClient(client.id, productId);
      await refreshClient();
    } catch (e) {
      setError(e?.message || "Failed to unlink product");
    }
  }

  async function handleAddContact() {
    if (!contactForm.name || !can("clients.update")) return;
    setAddingContact(true);
    setError("");
    try {
      await addClientContact(id, contactForm, activeFactory.id);
      const updated = await fetchClientContacts(id, activeFactory.id).catch(() => null);
      const rows = Array.isArray(updated) ? updated : updated?.rows;
      if (rows) setContacts(rows);
      else await refreshClient();
      setContactForm({ name: "", designation: "", phone: "", email: "" });
    } catch (e) {
      setError(e?.message || "Failed to add contact");
    } finally {
      setAddingContact(false);
    }
  }

  async function handleDeleteContact(contactId) {
    if (!can("clients.update")) return;
    if (!confirm("Delete this contact?")) return;
    setError("");
    try {
      await deleteClientContact(id, contactId, activeFactory.id);
      const updated = await fetchClientContacts(id, activeFactory.id).catch(() => null);
      const rows = Array.isArray(updated) ? updated : updated?.rows;
      if (rows) setContacts(rows);
      else await refreshClient();
    } catch (e) {
      setError(e?.message || "Failed to delete contact");
    }
  }

  async function loadOrders() {
    if (!activeFactory?.id || !can("clients.view")) return;
    setLoadingOrders(true);
    setError("");
    try {
      const data = await fetchClientOrders(id, activeFactory.id);
      const rows = Array.isArray(data) ? data : data?.rows || data?.orders || [];
      setOrders(rows);
    } catch (e) {
      setError(e?.message || "Failed to load client orders");
    } finally {
      setLoadingOrders(false);
    }
  }

  async function downloadLetterPdf() {
    if (!can("clients.letter")) return;
    setLetterDownloading(true);
    setError("");
    try {
      const finalTitle = safeReplaceAll(letterTitle, placeholderMap);
      const finalBody = safeReplaceAll(letterBody, placeholderMap);
      const blob = await generateClientLetterPdf(id, {
        title: finalTitle,
        body: finalBody,
        custom_fields: letterCustom,
      });
      if (lastLetterUrl) window.URL.revokeObjectURL(lastLetterUrl);
      const url = makeBlobUrl(blob);
      setLastLetterUrl(url);
      const filename = `client-letter-${(client?.company_name || id).replaceAll(" ", "_")}.pdf`;
      triggerDownload(url, filename);
    } catch (e) {
      setError(e?.message || "Failed to generate letter");
    } finally {
      setLetterDownloading(false);
    }
  }

  async function downloadClientSlip() {
    setSlipDownloading(true);
    setError("");
    try {
      const blob = await fetchClientSlipPdf(id);
      const url = makeBlobUrl(blob);
      const filename = `client-slip-${(client?.company_name || id).replaceAll(" ", "_")}.pdf`;
      triggerDownload(url, filename);
      setTimeout(() => window.URL.revokeObjectURL(url), 1500);
    } catch (e) {
      setError(e?.message || "Failed to download slip");
    } finally {
      setSlipDownloading(false);
    }
  }

  async function previewReengage() {
    if (!can("clients.reengage")) return;
    setReengageLoading(true);
    setError("");
    setSuccess("");
    try {
      const payload = { send: false };
      if (reengageCustomMessage.trim()) {
        payload.message = safeReplaceAll(reengageCustomMessage, placeholderMap);
      }
      const preview = await reEngageClient(id, payload);
      setReengagePreview(preview);
    } catch (e) {
      setError(e?.message || "Failed to preview re-engagement email");
    } finally {
      setReengageLoading(false);
    }
  }

  async function sendReengage() {
    if (!can("clients.reengage")) return;
    setReengageSending(true);
    setError("");
    setSuccess("");
    try {
      const payload = { send: true };
      if (reengageCustomMessage.trim()) {
        payload.message = safeReplaceAll(reengageCustomMessage, placeholderMap);
      }
      const resp = await reEngageClient(id, payload);
      setSuccess(
        `Re-engagement email sent successfully.${resp?.log_id ? ` Log ID: ${resp.log_id}` : ""}`
      );
      await previewReengage();
    } catch (e) {
      setError(e?.message || "Failed to send re-engagement email");
    } finally {
      setReengageSending(false);
    }
  }

  if (!activeFactory) {
    return <div className="p-6 text-gray-600">Select a factory to view client details.</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Client Not Found</h2>
        <p className="text-gray-500 mb-6">The requested client could not be found.</p>
        <button
          onClick={() => router.push("/clients")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Back to Clients
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {(client.company_name || "C").charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{client.company_name}</h1>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 flex-wrap">
                <span>Client ID: {client.id}</span>
                {client.gstin ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    GST Registered
                  </span>
                ) : null}
                {client.registration_type ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {client.registration_type}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <p className="text-gray-500 mt-1">
            Factory: <span className="font-medium text-blue-700">{activeFactory?.name}</span>
          </p>
        </div>

        <div className="flex gap-2">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              disabled={!can("clients.update")}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Edit Details
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Client Information</h2>
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || !can("clients.update")}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setForm(emptyForm);
                      if (client) {
                        setForm({
                          company_name: client.company_name || "",
                          gstin: client.gstin || "",
                          registration_type: client.registration_type || "",
                          pan_it_no: client.pan_it_no || "",
                          phone: client.phone || "",
                          mobile_no: client.mobile_no || "",
                          email: client.email || "",
                          address: client.address || "",
                          city: client.city || "",
                          state: client.state || "",
                          country: client.country || "",
                          pincode: client.pincode || "",
                        });
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : null}
            </div>

            {isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    value={form.company_name}
                    onChange={(e) => setForm((p) => ({ ...p, company_name: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
                  <input
                    value={form.gstin}
                    onChange={(e) => setForm((p) => ({ ...p, gstin: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registration Type</label>
                  <input
                    value={form.registration_type}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, registration_type: e.target.value }))
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN / IT No</label>
                  <input
                    value={form.pan_it_no}
                    onChange={(e) => setForm((p) => ({ ...p, pan_it_no: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No</label>
                  <input
                    value={form.mobile_no}
                    onChange={(e) => setForm((p) => ({ ...p, mobile_no: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    value={form.email}
                    onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    value={form.country}
                    onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    value={form.state}
                    onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                  <input
                    value={form.pincode}
                    onChange={(e) => setForm((p) => ({ ...p, pincode: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoCard label="GSTIN" value={client.gstin} />
                <InfoCard label="Registration Type" value={client.registration_type} />
                <InfoCard label="PAN / IT No" value={client.pan_it_no} />
                <InfoCard label="Email" value={client.email} />
                <InfoCard label="Phone" value={client.phone} />
                <InfoCard label="Mobile No" value={client.mobile_no} />
                <InfoCard label="City" value={client.city} />
                <InfoCard label="State" value={client.state} />
                <InfoCard label="Country" value={client.country} />
                <InfoCard label="Pincode" value={client.pincode} />
                <div className="md:col-span-2">
                  <InfoCard label="Address" value={client.address} />
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">Client Order History</h3>
              <button
                onClick={loadOrders}
                disabled={loadingOrders || !can("clients.view")}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {loadingOrders ? "Loading..." : "Refresh Orders"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    <th className="py-3 px-4">Order No</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {orders.map((o) => (
                    <tr
                      key={o.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => router.push(`/orders/${o.id}`)}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">{o.order_no || o.id}</td>
                      <td className="py-3 px-4 text-gray-600">{o.status}</td>
                      <td className="py-3 px-4 text-gray-600">₹{o.total_amount ?? o.total ?? "-"}</td>
                    </tr>
                  ))}
                  {!loadingOrders && orders.length === 0 ? (
                    <tr>
                      <td className="py-6 px-4 text-gray-500" colSpan={3}>
                        No orders loaded.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Contact Persons</h2>
              <span className="text-sm text-gray-500">{contacts.length} contacts</span>
            </div>

            {contacts.length > 0 ? (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <h3 className="font-medium text-gray-800">{contact.name}</h3>
                      <p className="text-sm text-gray-600">{contact.designation || "Not specified"}</p>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                        {contact.email ? <div>{contact.email}</div> : null}
                        {contact.phone ? <div>{contact.phone}</div> : null}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      disabled={!can("clients.update")}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">No contact information available.</div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Add New Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Name *"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <input
                  placeholder="Designation"
                  value={contactForm.designation}
                  onChange={(e) => setContactForm((p) => ({ ...p, designation: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <input
                  placeholder="Phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
                <input
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg"
                />
              </div>
              <button
                onClick={handleAddContact}
                disabled={!contactForm.name || addingContact || !can("clients.update")}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {addingContact ? "Adding..." : "Add Contact Person"}
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Client Engagement</h3>
            <div className="space-y-3">
              <button
                onClick={downloadClientSlip}
                disabled={slipDownloading}
                className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-60"
              >
                {slipDownloading ? "Preparing Slip..." : "Download Client Slip"}
              </button>

              <button
                onClick={downloadLetterPdf}
                disabled={letterDownloading || !can("clients.letter")}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {letterDownloading ? "Generating Letter..." : "Download Client Letter PDF"}
              </button>

              {lastLetterUrl ? (
                <button
                  onClick={() => window.open(lastLetterUrl, "_blank", "noopener,noreferrer")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Open Last Letter
                </button>
              ) : null}
            </div>

            <div className="mt-6 space-y-3 border-t pt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Letter Title</label>
                <input
                  value={letterTitle}
                  onChange={(e) => setLetterTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Letter Body</label>
                <textarea
                  value={letterBody}
                  onChange={(e) => setLetterBody(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3 border-t pt-6">
              <h4 className="font-medium text-gray-800">Re-engage Email</h4>
              <p className="text-xs text-gray-500">
                Preview uses backend draft generation. Send uses the real SMTP-backed path and now
                surfaces backend/provider errors directly.
              </p>

              <textarea
                value={reengageCustomMessage}
                onChange={(e) => setReengageCustomMessage(e.target.value)}
                rows={4}
                placeholder="Optional custom message. {{client_name}} is supported."
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={previewReengage}
                  disabled={reengageLoading || !can("clients.reengage")}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-60"
                >
                  {reengageLoading ? "Previewing..." : "Preview Email"}
                </button>

                <button
                  onClick={sendReengage}
                  disabled={reengageSending || !can("clients.reengage")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {reengageSending ? "Sending..." : "Send Re-engage Email"}
                </button>
              </div>

              {reengagePreview ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm space-y-2">
                  <div>
                    <span className="font-medium text-gray-900">Eligible:</span>{" "}
                    {reengagePreview.eligible ? "Yes" : "No"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Days since last order:</span>{" "}
                    {reengagePreview.days_since_last_order ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">To:</span>{" "}
                    {reengagePreview.to_email || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Subject:</span>{" "}
                    {reengagePreview.subject || "—"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-900">Message:</span>
                    <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-white border border-gray-200 p-3 text-xs text-gray-700">
                      {reengagePreview.message || "—"}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-800">Linked Products</h2>
              <span className="text-sm text-gray-500">{linkedProducts.length || 0} products</span>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Link New Product</label>
              <div className="flex gap-2">
                <select
                  value={selectedProduct}
                  onChange={(e) => setSelectedProduct(e.target.value)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">Select a product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || p.product_name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleLink}
                  disabled={!selectedProduct || linking || !can("clients.update")}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {linking ? "Adding..." : "Add"}
                </button>
              </div>
            </div>

            {linkedProducts.length > 0 ? (
              <div className="space-y-3">
                {linkedProducts.map((cp) => (
                  <div
                    key={cp.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-800">{cp.product?.name || "Product"}</span>
                      {cp.default_price != null ? (
                        <span className="text-xs text-gray-500">Default Price: {cp.default_price}</span>
                      ) : null}
                    </div>
                    <button
                      onClick={() => handleUnlink(cp.product_id)}
                      disabled={!can("clients.update")}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-60"
                    >
                      Unlink
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">No products linked yet.</div>
            )}
          </div>

          <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-xl shadow-lg p-6 text-white">
            <h3 className="font-semibold mb-4">Client Overview</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-blue-200 mb-1">Linked Products</p>
                <p className="text-2xl font-bold">{linkedProducts.length || 0}</p>
              </div>
              <div>
                <p className="text-sm text-blue-200 mb-1">Contact Persons</p>
                <p className="text-2xl font-bold">{contacts.length}</p>
              </div>
              <div>
                <p className="text-sm text-blue-200 mb-1">Orders Loaded</p>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
            <h3 className="font-semibold text-red-700 mb-4">Danger Zone</h3>
            <button
              onClick={handleDisable}
              disabled={!can("clients.delete") && !can("clients.update")}
              className="w-full px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60"
            >
              Disable Client
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default requireAuth(requireFactory(ClientDetailPage));
