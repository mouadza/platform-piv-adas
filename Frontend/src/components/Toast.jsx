import React, { useEffect } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";

const Toast = ({ message, type = "info", onClose, duration = 4000, id }) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeStyles = {
    success: {
      bg: "bg-emerald-50",
      border: "border-emerald-200",
      text: "text-emerald-800",
      icon: "text-emerald-500",
      Icon: CheckCircle,
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-800",
      icon: "text-red-500",
      Icon: AlertCircle,
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-800",
      icon: "text-amber-500",
      Icon: AlertCircle,
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      icon: "text-blue-500",
      Icon: Info,
    },
  };

  const style = typeStyles[type] || typeStyles.info;
  const Icon = style.Icon;

  return (
    <div
      className={`flex items-start gap-3 ${style.bg} border ${style.border} rounded-lg px-4 py-3 shadow-md animate-slide-in`}
      role="alert"
      id={id}
    >
      <Icon size={20} className={style.icon} />
      <div className="flex-1">
        <p className={`text-sm font-medium ${style.text}`}>{message}</p>
      </div>
      <button
        onClick={onClose}
        className={`ml-2 ${style.text} hover:opacity-70 transition-opacity`}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};

export default Toast;
