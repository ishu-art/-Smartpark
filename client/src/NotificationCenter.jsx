import { useEffect, useState, useRef } from "react";
import { socket } from "./socket";

// =====================================================
// FEATURE 7: NOTIFICATION SYSTEM
// =====================================================
// Ye component App ke top level par ek baar mount hota hai.
// Socket.io se "notification" event sunta hai aur on-screen
// toast dikhata hai jo kuch second baad khud gayab ho jaata hai.

let idCounter = 0;

function NotificationCenter() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  useEffect(() => {
    const handleNotification = (payload) => {
      const id = ++idCounter;

      setToasts((prev) => [...prev, { id, ...payload }]);

      // 5 second baad automatically hata do
      timers.current[id] = setTimeout(() => {
        removeToast(id);
      }, 5000);
    };

    socket.on("notification", handleNotification);

    return () => {
      socket.off("notification", handleNotification);
      Object.values(timers.current).forEach((t) => clearTimeout(t));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  };

  if (toasts.length === 0) return null;

  return (
    <div className="notification-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`notification-toast notification-${toast.type || "info"}`}
          onClick={() => removeToast(toast.id)}
        >
          <span className="notification-message">{toast.message}</span>
          <button
            type="button"
            className="notification-close"
            onClick={(e) => {
              e.stopPropagation();
              removeToast(toast.id);
            }}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default NotificationCenter;