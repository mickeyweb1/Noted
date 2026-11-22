import { io } from "socket.io-client";
import api from "./api";

// Socket.IO must connect to the server ORIGIN (no "/api" path). 
// A URL like http://localhost:5000/api/kahoot is read as the namespace "/api/kahoot", which does not exist.
export const getSocketOrigin = () => {
  const raw = api.defaults?.baseURL || import.meta.env.VITE_API_URL || "http://localhost:5000";
  try {
    // If raw is "http://localhost:5000/api", this cleanly returns "http://localhost:5000"
    return new URL(raw, window.location.origin).origin;
  } catch {
    // Fallback for edge cases
    return raw.replace(/\/api\/?$/, "").replace(/\/+$/, "");
  }
};

export const createKahootSocket = () => {
  const origin = getSocketOrigin();
  const url = `${origin}/kahoot`;
  
  const socket = io(url, {
    transports: ["websocket", "polling"], // polling is a safe fallback behind proxies
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  
  return socket;
};
