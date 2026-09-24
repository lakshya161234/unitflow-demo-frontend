"use client";

import { io } from "socket.io-client";
import { resolveBaseUrl } from "./api";

let socket = null;

export function getSocket(token) {
  if (socket) return socket;
  if (!token) return null;

  socket = io(resolveBaseUrl(), {
    transports: ["websocket"],
    auth: { token },
  });

  socket.on("connect_error", (err) => {
    // eslint-disable-next-line no-console
    console.warn("socket connect_error", err?.message || err);
  });

  return socket;
}

export function closeSocket() {
  try {
    if (socket) socket.disconnect();
  } finally {
    socket = null;
  }
}
