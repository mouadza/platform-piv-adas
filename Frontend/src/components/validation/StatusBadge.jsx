import React from "react";

const StatusBadge = ({ value }) => {
  const normalizedValue =
    value === "IN_PROGRESS" ? "IN PROGRESS" : value || "IN PROGRESS";

  const map = {
    "IN PROGRESS": "bg-amber-100 text-amber-800 border border-amber-300",
    COMPLETED: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    OK: "bg-emerald-100 text-emerald-800 border border-emerald-300",
    NOK: "bg-red-100 text-red-800 border border-red-300",
    DONE: "bg-blue-100 text-blue-800 border border-blue-300",
  };

  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap ${
        map[normalizedValue] ||
        "bg-slate-100 text-slate-600 border border-slate-200"
      }`}
    >
      {normalizedValue}
    </span>
  );
};

export default StatusBadge;