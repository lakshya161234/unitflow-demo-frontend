"use client";

import { useAuth } from "@/lib/authContext";
import { useFactory } from "@/lib/factoryContext";

export default function FactorySelector() {
  const { user } = useAuth();
  const { factories, activeFactory, setActiveFactory } = useFactory();

  if (!user) return null;

  const canSelect = user.is_admin || (Array.isArray(factories) && factories.length > 1);

  // Single factory (or none): show as text
  if (!canSelect) {
    return <span className="text-sm text-gray-600">{activeFactory?.name || "No factory assigned"}</span>;
  }

  // Dropdown (admin OR multiple assigned factories)
  return (
    <select
      className="border rounded px-2 py-1 text-sm"
      value={activeFactory?.id || ""}
      onChange={(e) => {
        const selected = factories.find((f) => f.id === e.target.value);
        setActiveFactory(selected || null);
      }}
    >
      <option value="">Select Factory</option>

      {factories.map((factory) => (
        <option key={factory.id} value={factory.id}>
          {factory.name}
        </option>
      ))}
    </select>
  );
}
