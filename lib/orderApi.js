
// // lib/orderApi.js

// import { factoryApiRequest } from "./api";


// export function fetchOrders(arg1, arg2) {
//   // old usage: fetchOrders(factoryId)
//   if (typeof arg1 === "string" && !arg2) {
//     const factoryId = arg1;
//     return factoryApiRequest(`/orders`, { factoryId });
//   }

//   // new usage: fetchOrders(filters, factoryId)
//   const filters = arg1 || {};
//   const factoryId = arg2;

//   const qs = new URLSearchParams();
//   Object.entries(filters).forEach(([k, v]) => {
//     if (v === undefined || v === null || v === "") return;
//     qs.set(k, String(v));
//   });

//   const url = qs.toString() ? `/orders?${qs.toString()}` : `/orders`;
//   return factoryApiRequest(url, { factoryId });
// }

// export function fetchOrderById(orderId, factoryId) {
//   return factoryApiRequest(`/orders/${orderId}`, { factoryId });
// }

// export function updateOrder(orderId, payload, factoryId) {
//   // PUT /orders/:id (qty editing should be rejected/ignored by backend)
//   return factoryApiRequest(`/orders/${orderId}`, {
//     method: "PUT",
//     body: payload,
//     factoryId,
//   });
// }

// export function cancelOrder(orderId, payload, factoryId) {
//   // backend expects { reason: "..." } (but keeping payload flexible)
//   return factoryApiRequest(`/orders/${orderId}/cancel`, {
//     method: "PUT",
//     body: payload,
//     factoryId,
//   });
// }

// export function changeOrderStatus(orderId, payload, factoryId) {
//   return factoryApiRequest(`/orders/${orderId}/status`, {
//     method: "PUT",
//     body: payload,
//     factoryId,
//   });
// }

// // ✅ Alias used by the updated Order Detail page
// export function updateOrderStatus(orderId, payload, factoryId) {
//   return changeOrderStatus(orderId, payload, factoryId);
// }

// export function fetchOrderLabelPdf(orderId, factoryId) {
//   return factoryApiRequest(`/orders/${orderId}/label`, {
//     factoryId,
//     parseAs: "blob",
//   });
// }











// lib/orderApi.js

import { factoryApiRequest } from "./api";

/**
 * Fetch orders
 * Supports:
 * 1) fetchOrders(factoryId)
 * 2) fetchOrders(filters, factoryId)
 */
export function fetchOrders(arg1, arg2) {
  // old usage: fetchOrders(factoryId)
  if (typeof arg1 === "string" && !arg2) {
    const factoryId = arg1;
    return factoryApiRequest(`/orders`, { factoryId });
  }

  // new usage: fetchOrders(filters, factoryId)
  const filters = arg1 || {};
  const factoryId = arg2;

  const qs = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    qs.set(k, String(v));
  });

  const url = qs.toString() ? `/orders?${qs.toString()}` : `/orders`;
  return factoryApiRequest(url, { factoryId });
}

export function fetchOrderById(orderId, factoryId) {
  return factoryApiRequest(`/orders/${orderId}`, { factoryId });
}

/**
 * PUT /orders/:id
 * Backend should reject/ignore items qty edits.
 */
export function updateOrder(orderId, payload, factoryId) {
  return factoryApiRequest(`/orders/${orderId}`, {
    method: "PUT",
    body: payload,
    factoryId,
  });
}

/**
 * PUT /orders/:id/cancel
 * Backend expects { reason: "..." } (keeping payload flexible)
 */
export function cancelOrder(orderId, payload, factoryId) {
  return factoryApiRequest(`/orders/${orderId}/cancel`, {
    method: "PUT",
    body: payload,
    factoryId,
  });
}

/**
 * PUT /orders/:id/status
 * { status: "...", note?: "..." }
 */
export function changeOrderStatus(orderId, payload, factoryId) {
  return factoryApiRequest(`/orders/${orderId}/status`, {
    method: "PUT",
    body: payload,
    factoryId,
  });
}

// ✅ Alias used by Order Detail page
export function updateOrderStatus(orderId, payload, factoryId) {
  return changeOrderStatus(orderId, payload, factoryId);
}

/**
 * GET /orders/:id/label (PDF)
 */
export function fetchOrderLabelPdf(orderId, factoryId) {
  return factoryApiRequest(`/orders/${orderId}/label`, {
    factoryId,
    parseAs: "blob",
  });
}





/**
 * GET /orders/recent
 * Returns last 3 orders for dashboard widget
 */
export function fetchRecentOrders(factoryId) {
  return factoryApiRequest(`/orders/recent`, { factoryId });
}