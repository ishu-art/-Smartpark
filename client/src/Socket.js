import { io } from "socket.io-client";

// Ek hi socket connection poori app mein reuse hoga
export const socket = io("http://localhost:5000", {
  autoConnect: true,
});