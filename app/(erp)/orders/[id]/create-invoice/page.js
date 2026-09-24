"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createInvoice } from "@/lib/invoiceApi";
import { useFactory } from "@/lib/factoryContext";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";

function CreateInvoicePage() {
  const { id: orderId } = useParams();
  const { activeFactory } = useFactory();
  const router = useRouter();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const invoice = await createInvoice({
        client_id: null, // backend derives from order
        order_id: orderId,
        invoice_date: date,
        total_amount: Number(amount),
      }, activeFactory.id);

      router.replace(`/invoices/${invoice.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h1 className="text-xl font-semibold">Create Invoice</h1>

      {error && <p className="text-red-600">{error}</p>}

      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        required
        className="border p-2"
      />

      <input
        type="number"
        placeholder="Total Amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        required
        className="border p-2"
      />

      <button className="bg-blue-600 text-white px-4 py-2">
        Create Invoice
      </button>
    </form>
  );
}

export default requireAuth(requireFactory(CreateInvoicePage));
