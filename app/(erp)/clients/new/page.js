// // app/(erp)/clients/new/page.js


// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import { requireAuth } from "@/lib/requireAuth";
// import { requireFactory } from "@/lib/requireFactory";
// import { createClient } from "@/lib/clientApi";
// import { useFactory } from "@/lib/factoryContext";

// function NewClientPage() {
//   const router = useRouter();
//   const { activeFactory } = useFactory();

//   const [form, setForm] = useState({
//     company_name: "",
//     gstin: "",
//     phone: "",
//     email: "",
//     address: "",
//     city: "",
//     state: "",
//     pincode: "",
//   });

//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   function handleChange(e) {
//     const { name, value } = e.target;
//     setForm((prev) => ({ ...prev, [name]: value }));
//   }

//   async function handleSubmit(e) {
//     e.preventDefault();
//     if (!activeFactory?.id) return;

//     setError("");
//     setLoading(true);

//     try {
//       const created = await createClient(
//         {
//           company_name: form.company_name.trim(),
//           gstin: form.gstin.trim() || null,
//           phone: form.phone.trim() || null,
//           email: form.email.trim() || null,
//           address: form.address.trim() || null,
//           city: form.city.trim() || null,
//           state: form.state.trim() || null,
//           pincode: form.pincode.trim() || null,
//         },
//         activeFactory.id
//       );
//       router.push(`/clients/${created.id}`);
//     } catch (err) {
//       setError(err?.message || "Failed to create client");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="max-w-4xl space-y-6 p-6">
//       <div>
//         <h1 className="text-2xl font-bold text-gray-800">Add New Client</h1>
//         <p className="text-gray-600">Create a client record with all supported backend fields.</p>
//       </div>

//       {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">Company Name</label>
//               <input name="company_name" required value={form.company_name} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
//             </div>
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">GSTIN</label>
//               <input name="gstin" value={form.gstin} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
//             </div>
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
//               <input name="phone" value={form.phone} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
//             </div>
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
//               <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
//             </div>
//             <div className="md:col-span-2">
//               <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
//               <textarea name="address" value={form.address} onChange={handleChange} rows={4} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
//             </div>
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
//               <input name="city" value={form.city} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
//             </div>
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
//               <input name="state" value={form.state} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
//             </div>
//             <div>
//               <label className="mb-1 block text-sm font-medium text-gray-700">Pincode</label>
//               <input name="pincode" value={form.pincode} onChange={handleChange} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
//             </div>
//           </div>
//         </div>

//         <div className="flex gap-3">
//           <button type="button" onClick={() => router.push("/clients")} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
//             Cancel
//           </button>
//           <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60">
//             {loading ? "Saving..." : "Create Client"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

// export default requireAuth(requireFactory(NewClientPage));
























"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { createClient } from "@/lib/clientApi";
import { useFactory } from "@/lib/factoryContext";

function NewClientPage() {
  const router = useRouter();
  const { activeFactory } = useFactory();

  const [form, setForm] = useState({
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
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!activeFactory?.id) return;

    setError("");
    setLoading(true);

    try {
      const created = await createClient(
        {
          company_name: form.company_name.trim(),
          gstin: form.gstin.trim() || null,
          registration_type: form.registration_type.trim() || null,
          pan_it_no: form.pan_it_no.trim() || null,
          phone: form.phone.trim() || null,
          mobile_no: form.mobile_no.trim() || null,
          email: form.email.trim() || null,
          address: form.address.trim() || null,
          city: form.city.trim() || null,
          state: form.state.trim() || null,
          country: form.country.trim() || null,
          pincode: form.pincode.trim() || null,
        },
        activeFactory.id
      );

      router.push(`/clients/${created.id}`);
    } catch (err) {
      setError(err?.message || "Failed to create client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Add New Client</h1>
        <p className="text-gray-600">Create a client record with all supported backend fields.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Company Name</label>
              <input
                name="company_name"
                required
                value={form.company_name}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">GSTIN</label>
              <input
                name="gstin"
                value={form.gstin}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Registration Type</label>
              <input
                name="registration_type"
                value={form.registration_type}
                onChange={handleChange}
                placeholder="Proprietorship"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">PAN / IT No</label>
              <input
                name="pan_it_no"
                value={form.pan_it_no}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Mobile No</label>
              <input
                name="mobile_no"
                value={form.mobile_no}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="India"
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
              <input
                name="city"
                value={form.city}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
              <input
                name="state"
                value={form.state}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Pincode</label>
              <input
                name="pincode"
                value={form.pincode}
                onChange={handleChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/clients")}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Create Client"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default requireAuth(requireFactory(NewClientPage));