import { apiRequest } from "./api";

export function fetchConversations() {
  return apiRequest(`/chat/conversations`);
}

export function startDirectConversation(userId) {
  return apiRequest(`/chat/direct/${userId}`, {
    method: "POST",
    body: {},
  });
}

export function fetchMessages(conversationId, params = {}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));

  const url = qs.toString()
    ? `/chat/conversations/${conversationId}/messages?${qs.toString()}`
    : `/chat/conversations/${conversationId}/messages`;

  return apiRequest(url);
}

export function sendMessage(conversationId, body) {
  return apiRequest(`/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { body },
  });
}

export function deleteChatMessage(conversationId, messageId) {
  return apiRequest(`/chat/conversations/${conversationId}/messages/${messageId}`, {
    method: "DELETE",
  });
}

export function deleteConversation(conversationId) {
  return apiRequest(`/chat/conversations/${conversationId}`, {
    method: "DELETE",
  });
}
