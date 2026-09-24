"use client";

import { useState } from "react";
import { useFactory } from "@/lib/factoryContext";
import { requireAuth } from "@/lib/requireAuth";
import { requireFactory } from "@/lib/requireFactory";
import { createPayment } from "@/lib/paymentCreateApi";

function CreatePaymentPage() {
  const { activeFactory } = useFactory();
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    await createPayment(activeFactory.id, {
      invoice_id: "",
      amount: 0,
      method: "",
      payment_date: "",
    });
    setLoading(false);
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Record Payment</h1>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Save Payment
      </button>
    </div>
  );
}

export default requireAuth(requireFactory(CreatePaymentPage));
