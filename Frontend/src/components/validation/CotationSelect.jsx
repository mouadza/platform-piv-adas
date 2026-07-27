import React from "react";
import { COTATION, COTATION_OPTIONS } from "./validationConstants";

const CotationSelect = ({
  cell,
  rowIndex,
  disabled,
  onPendingChange,
  compact = false,
}) => {
  const cfg = COTATION[cell.value] || COTATION.A_coter;

  return (
    <div
      className="relative flex min-w-0 items-center"
      style={{ minWidth: compact ? 0 : "140px" }}
    >
      <span
        className="absolute left-2 w-2.5 h-2.5 rounded-sm pointer-events-none z-10 flex-shrink-0"
        style={{ backgroundColor: cfg.square }}
      />

      <select
        value={cell.value || "A_coter"}
        disabled={disabled}
        onChange={(e) =>
          onPendingChange(rowIndex, cell.field, e.target.value, cell.value)
        }
        style={{
          backgroundColor: cfg.bg,
          color: cfg.text,
          borderColor: cfg.border,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
        }}
        className={`w-full appearance-none rounded-lg border font-bold shadow-sm outline-none transition-all focus:ring-2 focus:ring-[#243782]/25 focus:ring-offset-1 ${
          compact ? "py-1.5 pl-6 pr-5 text-[10px]" : "py-2 pl-7 pr-7 text-xs"
        }`}
      >
        {COTATION_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {COTATION[opt]?.label || opt}
          </option>
        ))}
      </select>

      <svg
        className="absolute right-1.5 w-3 h-3 pointer-events-none"
        style={{ color: cfg.text }}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
};

export default CotationSelect;

