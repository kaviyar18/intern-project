import { useAppState } from "../context/AppContext";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaTimesCircle,
  FaTimes,
} from "react-icons/fa";

const iconMap = {
  success: <FaCheckCircle style={{ color: "var(--success)" }} />,
  error: <FaTimesCircle style={{ color: "var(--error)" }} />,
  warning: <FaExclamationTriangle style={{ color: "var(--warning)" }} />,
  info: <FaInfoCircle style={{ color: "var(--info)" }} />,
};

// Convert API errors and other values into safe, readable text.
function getToastMessage(message) {
  if (typeof message === "string") {
    return message;
  }

  if (message == null) {
    return "Something went wrong. Please try again.";
  }

  if (Array.isArray(message)) {
    return message
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          const field = Array.isArray(item.loc)
            ? item.loc.filter((part) => part !== "body").join(".")
            : "";

          const detail = item.msg || item.message;

          if (detail && field) {
            return `${field}: ${detail}`;
          }

          if (detail) {
            return String(detail);
          }

          return JSON.stringify(item);
        }

        return String(item);
      })
      .join("; ");
  }

  if (typeof message === "object") {
    if (typeof message.msg === "string") {
      return message.msg;
    }

    if (typeof message.message === "string") {
      return message.message;
    }

    if (Array.isArray(message.detail)) {
      return getToastMessage(message.detail);
    }

    return JSON.stringify(message);
  }

  return String(message);
}

export default function ToastContainer() {
  const { toasts, removeToast } = useAppState();

  if (!toasts?.length) return null;

  return (
    <div className="toast-container-govt" aria-live="polite">
      {toasts.map((toast) => {
        const type = iconMap[toast.type] ? toast.type : "info";
        const message = getToastMessage(toast.message);

        return (
          <div
            key={toast.id}
            className={`govt-toast ${type}`}
            role={type === "error" ? "alert" : "status"}
          >
            {iconMap[type]}

            <span className="flex-grow-1">{message}</span>

            <button
              type="button"
              className="btn btn-sm p-0 border-0 text-muted"
              onClick={() => removeToast(toast.id)}
              style={{ background: "transparent" }}
              aria-label="Close notification"
            >
              <FaTimes size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
