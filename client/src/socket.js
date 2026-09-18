import { io } from "socket.io-client";

// Ek hi socket connection poori app mein reuse hoga
export const socket = io("https://smartpark1-o9go.onrender.com", {
  autoConnect: true,
});