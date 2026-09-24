import { factoryApiRequest } from "./api";

export async function createPayment(factoryId, payload) {
  return factoryApiRequest(`/payments`, {
    method: "POST",
    body: payload,
    factoryId,
  });
}
