import { io } from "socket.io-client";

// Local backend socket connection
export const socket = io("http://localhost:5000", {
  autoConnect: true,
});