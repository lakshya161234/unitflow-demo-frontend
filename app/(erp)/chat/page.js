// app/(erp)/chat/page.js

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { requireAuth } from "@/lib/requireAuth";
import { useAuth } from "@/lib/authContext";
import {
  fetchConversations,
  fetchMessages,
  sendMessage,
  startDirectConversation,
  deleteChatMessage,
  deleteConversation,
} from "@/lib/internalMessagingApi";
import { getSocket } from "@/lib/socketClient";
import { fetchUsers } from "@/lib/adminApi";

function fmtTs(ts) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// Best-effort sender id extraction (backend variations)
function getSenderId(m) {
  return (
    m?.sender_id ||
    m?.senderId ||
    m?.sender?.id ||
    m?.from_user_id ||
    m?.fromUserId ||
    m?.from?.id ||
    null
  );
}

// Best-effort sender display name extraction
function getSenderLabel(m) {
  const s =
    m?.sender ||
    m?.from ||
    m?.sender_user ||
    m?.senderUser ||
    m?.user ||
    null;

  return (
    s?.name ||
    s?.full_name ||
    s?.email ||
    m?.sender_name ||
    m?.from_name ||
    ""
  );
}

function getInitial(label) {
  const t = (label || "").trim();
  return t ? t.charAt(0).toUpperCase() : "?";
}

function ChatPage() {
  const { user } = useAuth();

  // Fallback token read for socket (some authContext versions don't expose token)
  const [authToken, setAuthToken] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token") ||
      localStorage.getItem("erp_token") ||
      localStorage.getItem("access_token") ||
      null;
    setAuthToken(t);
  }, []);

  const [convos, setConvos] = useState([]);
  const [activeConvoId, setActiveConvoId] = useState("");
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);

  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState("");
  const [deletingConversation, setDeletingConversation] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  // Admin helper: start 1:1 with any employee
  const [staffQuery, setStaffQuery] = useState("");
  const [staff, setStaff] = useState([]);
  const isAdmin = Boolean(user?.is_admin);

  const listRef = useRef(null);

  async function loadConversations(selectFirst = true) {
    setLoadingConvos(true);
    setError("");
    try {
      const data = await fetchConversations();
      const rows = Array.isArray(data)
        ? data
        : data?.items || data?.rows || data?.conversations || [];

      setConvos(rows);

      if (selectFirst && rows.length && !activeConvoId) {
        setActiveConvoId(rows[0].id);
      }
    } catch (e) {
      setError(e?.message || "Failed to load conversations");
    } finally {
      setLoadingConvos(false);
    }
  }

  async function loadMessages(conversationId, reset = true) {
    if (!conversationId) return;

    setLoadingMsgs(true);
    setError("");
    try {
      const data = await fetchMessages(conversationId, {
        cursor: reset ? undefined : cursor,
        limit: 30,
      });

      const rows = Array.isArray(data)
        ? data
        : data?.items || data?.rows || data?.messages || [];
      const next = data?.nextCursor ?? data?.next_cursor ?? null;

      setCursor(next);

      // Merge and sort so UI always shows oldest -> newest
      setMessages((prev) => {
        const merged = reset ? [...rows] : [...rows, ...(prev || [])];
        merged.sort((a, b) => {
          const ta = new Date(a?.created_at || a?.createdAt || 0).getTime();
          const tb = new Date(b?.created_at || b?.createdAt || 0).getTime();
          return ta - tb;
        });
        return merged;
      });

      if (reset) {
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 0);
      }
    } catch (e) {
      setError(e?.message || "Failed to load messages");
    } finally {
      setLoadingMsgs(false);
    }
  }

  useEffect(() => {
    loadConversations(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeConvoId) return;
    loadMessages(activeConvoId, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvoId]);

  // socket realtime
  useEffect(() => {
    if (!authToken) return;

    const s = getSocket(authToken);
    if (!s) return;

    const onNew = (payload) => {
      const cid = payload?.conversationId || payload?.conversation_id;
      if (!cid) return;

      if (String(cid) === String(activeConvoId) && payload?.message) {
        setMessages((prev) => {
          const merged = [...(prev || []), payload.message];
          merged.sort((a, b) => {
            const ta = new Date(a?.created_at || a?.createdAt || 0).getTime();
            const tb = new Date(b?.created_at || b?.createdAt || 0).getTime();
            return ta - tb;
          });
          return merged;
        });
        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 0);
      }

      loadConversations(false);
    };

    const onDeleted = (payload) => {
      const cid = payload?.conversationId || payload?.conversation_id;
      const mid = payload?.messageId || payload?.message_id;
      if (String(cid || "") !== String(activeConvoId || "")) return;
      if (!mid) return;
      setMessages((prev) => (prev || []).filter((m) => String(m.id) !== String(mid)));
      loadConversations(false);
    };

    const onConversationDeleted = (payload) => {
      const cid = payload?.conversationId || payload?.conversation_id;
      if (!cid) return;
      setConvos((prev) => (prev || []).filter((c) => String(c.id) !== String(cid)));
      if (String(cid) === String(activeConvoId)) {
        setActiveConvoId("");
        setMessages([]);
      }
    };

    s.on("chat:new", onNew);
    s.on("chat:deleted", onDeleted);
    s.on("chat:conversation_deleted", onConversationDeleted);

    return () => {
      s.off("chat:new", onNew);
      s.off("chat:deleted", onDeleted);
      s.off("chat:conversation_deleted", onConversationDeleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, activeConvoId]);

  // Admin staff picker
  useEffect(() => {
    if (!isAdmin) return;

    fetchUsers()
      .then((data) =>
        setStaff(Array.isArray(data) ? data : data?.rows || data?.items || [])
      )
      .catch(() => setStaff([]));
  }, [isAdmin]);

  const filteredStaff = useMemo(() => {
    if (!isAdmin) return [];
    const q = staffQuery.trim().toLowerCase();
    const arr = staff || [];
    if (!q) return arr;

    return arr.filter(
      (u) =>
        (u?.name || "").toLowerCase().includes(q) ||
        (u?.email || "").toLowerCase().includes(q)
    );
  }, [isAdmin, staff, staffQuery]);

  async function onStartChat(userId) {
    setError("");
    try {
      const convo = await startDirectConversation(userId);
      await loadConversations(false);

      if (convo?.id) setActiveConvoId(convo.id);
      else if (convo?.conversation?.id) setActiveConvoId(convo.conversation.id);
    } catch (e) {
      setError(e?.message || "Failed to start conversation");
    }
  }

  async function onSend() {
    if (!activeConvoId) return;

    const body = text.trim();
    if (!body) return;

    setSending(true);
    setError("");
    try {
      const sent = await sendMessage(activeConvoId, body);

      const msg = sent?.message || sent?.item || sent;
      if (msg?.id) {
        setMessages((prev) => {
          const merged = [...(prev || []), msg];
          merged.sort((a, b) => {
            const ta = new Date(a?.created_at || a?.createdAt || 0).getTime();
            const tb = new Date(b?.created_at || b?.createdAt || 0).getTime();
            return ta - tb;
          });
          return merged;
        });
        setText("");

        setTimeout(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        }, 0);
      } else {
        setText("");
        await loadMessages(activeConvoId, true);
      }

      await loadConversations(false);
    } catch (e) {
      setError(e?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }


  async function onDeleteMessage(messageId) {
    if (!activeConvoId || !messageId) return;
    if (!confirm("Delete this message?")) return;
    setDeletingMessageId(messageId);
    setError("");
    try {
      await deleteChatMessage(activeConvoId, messageId);
      setMessages((prev) => (prev || []).filter((m) => String(m.id) !== String(messageId)));
      await loadConversations(false);
    } catch (e) {
      setError(e?.message || "Failed to delete message");
    } finally {
      setDeletingMessageId("");
    }
  }

  async function onDeleteConversation() {
    if (!activeConvoId) return;
    if (!confirm("Delete this conversation? All messages in this conversation will be removed.")) return;
    setDeletingConversation(true);
    setError("");
    try {
      const cid = activeConvoId;
      await deleteConversation(cid);
      setConvos((prev) => (prev || []).filter((c) => String(c.id) !== String(cid)));
      setActiveConvoId("");
      setMessages([]);
    } catch (e) {
      setError(e?.message || "Failed to delete conversation");
    } finally {
      setDeletingConversation(false);
    }
  }
  const activeConvo = useMemo(
    () => convos.find((c) => String(c.id) === String(activeConvoId)) || null,
    [convos, activeConvoId]
  );

  return (
    <div className="p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Internal Chat</h1>
          <p className="text-gray-500">Direct messages (Admin ↔ Employee)</p>
        </div>
      </div>

      {error ? (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Conversations */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold text-gray-800">Conversations</div>
            <button
              onClick={() => loadConversations(false)}
              className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {loadingConvos ? (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          ) : (
            <div className="max-h-[520px] overflow-auto">
              {(convos || []).map((c) => {
                const other =
                  c.direct_with ||
                  c.other_user ||
                  c.otherUser ||
                  c.participant ||
                  {};
                const label = other.name || other.email || c.title || c.id;
                const last = c.last_message || c.lastMessage;
                const isActive = String(c.id) === String(activeConvoId);

                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveConvoId(c.id)}
                    className={`w-full text-left px-4 py-3 border-b hover:bg-gray-50 ${
                      isActive ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-gray-900 truncate">
                        {label}
                      </div>
                      {c.unread_count ? (
                        <span className="text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full">
                          {c.unread_count}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs text-gray-500 truncate">
                      {last?.body || last?.content || last?.text || ""}
                    </div>
                  </button>
                );
              })}

              {(convos || []).length === 0 && (
                <div className="p-4 text-sm text-gray-500">
                  No conversations.
                </div>
              )}
            </div>
          )}

          {isAdmin ? (
            <div className="p-4 border-t">
              <div className="text-sm font-semibold text-gray-800 mb-2">
                Start chat
              </div>

              <input
                value={staffQuery}
                onChange={(e) => setStaffQuery(e.target.value)}
                placeholder="Search employees..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />

              <div className="mt-2 max-h-[180px] overflow-auto border border-gray-200 rounded-lg">
                {(filteredStaff || [])
                  .filter((u) => !u.is_admin)
                  .map((u) => (
                    <button
                      key={u.id}
                      onClick={() => onStartChat(u.id)}
                      className="w-full text-left px-3 py-2 border-b hover:bg-gray-50"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {u.name}
                      </div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </button>
                  ))}

                {(filteredStaff || []).filter((u) => !u.is_admin).length ===
                  0 && <div className="p-3 text-sm text-gray-500">No users.</div>}
              </div>
            </div>
          ) : null}
        </div>

        {/* Right: Messages */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between gap-3">
            <div className="font-semibold text-gray-800">
              {activeConvo
                ? activeConvo.direct_with?.name ||
                  activeConvo.other_user?.name ||
                  activeConvo.direct_with?.email ||
                  activeConvo.other_user?.email ||
                  activeConvo.id
                : "Select a conversation"}
            </div>
            {activeConvoId ? (
              <button
                onClick={onDeleteConversation}
                disabled={deletingConversation}
                className="px-3 py-1.5 text-sm border border-red-300 text-red-700 rounded-lg hover:bg-red-50 disabled:opacity-60"
              >
                {deletingConversation ? "Deleting..." : "Delete Conversation"}
              </button>
            ) : null}
          </div>

          {/* Messages area */}
          <div
            ref={listRef}
            className="flex-1 overflow-auto p-4 space-y-4 bg-gray-50"
          >
            {loadingMsgs ? (
              <div className="text-sm text-gray-500">Loading...</div>
            ) : (
              (messages || []).map((m) => {
                const senderId = getSenderId(m);
                const mine =
                  String(senderId || "") === String(user?.id || "");

                const senderLabel =
                  getSenderLabel(m) ||
                  (mine ? "You" : "Unknown");

                // bubble alignment + avatar
                return (
                  <div
                    key={m.id}
                    className={`flex items-end gap-2 ${
                      mine ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* Left avatar only for other side */}
                    {!mine ? (
                      <div className="h-9 w-9 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700 flex-shrink-0">
                        {getInitial(senderLabel)}
                      </div>
                    ) : null}

                    <div className={`max-w-[78%]`}>
                      {/* Show sender label for non-mine to make it clear */}
                      {!mine ? (
                        <div className="text-[12px] text-gray-500 mb-1 px-1">
                          {senderLabel}
                        </div>
                      ) : null}

                      <div
                        className={`rounded-2xl px-4 py-2 text-sm shadow-sm ${
                          mine
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-white text-gray-900 rounded-bl-md"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">
                          {m.body || m.content || m.text}
                        </div>
                        <div
                          className={`mt-1 text-[11px] ${
                            mine ? "text-blue-100" : "text-gray-400"
                          }`}
                        >
                          {fmtTs(m.created_at || m.createdAt)}
                        </div>
                        {(isAdmin || mine) ? (
                          <div className={`mt-2 ${mine ? "text-right" : "text-left"}`}>
                            <button
                              onClick={() => onDeleteMessage(m.id)}
                              disabled={deletingMessageId === m.id}
                              className={`text-[11px] underline ${mine ? "text-blue-100" : "text-red-600"} disabled:opacity-60`}
                            >
                              {deletingMessageId === m.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Right avatar only for mine */}
                    {mine ? (
                      <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {getInitial("You")}
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}

            {!loadingMsgs && (messages || []).length === 0 ? (
              <div className="text-sm text-gray-500">No messages yet.</div>
            ) : null}
          </div>

          {/* Composer */}
          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
                placeholder="Type a message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg"
                disabled={!activeConvoId}
              />
              <button
                onClick={onSend}
                disabled={!activeConvoId || sending || !text.trim()}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
            {/* <div className="text-xs text-gray-500 mt-2">
              Real-time updates require Socket.IO connection.
            </div> */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default requireAuth(ChatPage);