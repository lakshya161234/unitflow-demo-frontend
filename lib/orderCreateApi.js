// // lib/orderCreateApi.js
// import { factoryApiRequest } from "./api";

// export function createOrder(factoryId, data) {
//   return factoryApiRequest(`/orders`, {
//     method: "POST",
//     body: data,
//     factoryId,
//   });
// }

// // Proforma/Draft invoice PDF generated from order form (does not create order)
// // Backend should implement: POST /orders/proforma/pdf -> application/pdf
// export function fetchProformaPdf(factoryId, data) {
//   return factoryApiRequest(`/orders/proforma/pdf`, {
//     method: "POST",
//     body: data,
//     factoryId,
//     parseAs: "blob",
//   });
// }








// lib/orderCreateApi.js
import { factoryApiRequest } from "./api";

export function createOrder(factoryId, data) {
  return factoryApiRequest(`/orders`, {
    method: "POST",
    body: data,
    factoryId,
  });
}

// Proforma/Draft invoice PDF generated from order form (does not create order)
// ✅ Backend: POST /orders/proforma/preview.pdf -> application/pdf
export function fetchProformaPdf(factoryId, data) {
  return factoryApiRequest(`/orders/proforma/preview.pdf`, {
    method: "POST",
    body: data,
    factoryId,
    parseAs: "blob",
  });
}