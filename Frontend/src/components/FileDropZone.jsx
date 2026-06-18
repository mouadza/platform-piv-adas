import React, { useRef, useState, useCallback } from "react";

const formatFileSize = (bytes) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isValidFile = (file, allowedExts) => {
  if (!file) return false;
  const ext = "." + file.name.split(".").pop().toLowerCase();
  return allowedExts.includes(ext);
};

const COLOR_MAP = {
  blue: {
    border: "border-blue-300",
    borderActive: "border-blue-500",
    bg: "bg-blue-50",
    bgActive: "bg-blue-100",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    icon: "text-blue-400",
  },
  green: {
    border: "border-green-300",
    borderActive: "border-green-500",
    bg: "bg-green-50",
    bgActive: "bg-green-100",
    text: "text-green-600",
    badge: "bg-green-100 text-green-700",
    icon: "text-green-400",
  },
};

/**
 * FileDropZone — fully controlled
 *
 * Props:
 *  - id            string
 *  - acceptedExts  string[]   e.g. [".xls", ".xlsx"]
 *  - files         File[]     controlled value (array)
 *  - existingFile  string     server-side filename (shown when files is empty)
 *  - onFilesChange (File[]) => void
 *  - label         string
 *  - accentColor   "blue" | "green"
 */
const FileDropZone = ({
  id,
  acceptedExts,
  files = [],
  existingFile,
  onFilesChange,
  label,
  accentColor = "blue",
  multiple
}) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragError, setDragError] = useState("");

  const c = COLOR_MAP[accentColor] || COLOR_MAP.blue;
  const hasFiles = files.length > 0;
  const hasExisting = !!existingFile && !hasFiles;

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    setDragError("");
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      const valid = dropped.filter((f) => isValidFile(f, acceptedExts));
      if (valid.length !== dropped.length) {
        setDragError(`Format invalide — formats acceptés : ${acceptedExts.join(", ")}`);
      } else {
        setDragError("");
      }
      if (valid.length > 0) onFilesChange([...files, ...valid]);
    },
    [acceptedExts, files, onFilesChange]
  );

  
  const handleInputChange = (e) => {
    const selected = Array.from(e.target.files);
    onFilesChange([...files, ...selected]);
  };


  const handleRemove = (index) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !hasFiles && inputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-xl p-5 transition-all duration-200
          ${hasFiles
            ? `border-solid ${c.border} ${c.bg}`
            : isDragging
            ? `${c.borderActive} ${c.bgActive} scale-[1.01]`
            : `${c.border} hover:${c.bgActive} hover:${c.borderActive} cursor-pointer`
          }
        `}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          multiple={multiple ?? true}
          accept={acceptedExts.join(",")}
          hidden
          onChange={handleInputChange}
        />

        {hasFiles ? (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">📄</span>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${c.text} truncate`}>{f.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(f.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.badge}`}>
                    {f.name.split(".").pop().toUpperCase()}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRemove(i); }}
                    className="p-1 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
            {/* Add more button */}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              className={`mt-2 text-xs font-medium ${c.text} underline underline-offset-2`}
            >
              + Ajouter un fichier
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center gap-2 py-2">
            <span className={`text-4xl transition-transform ${isDragging ? "scale-110" : ""}`}>
              ⬆️
            </span>
            <div>
              <p className="font-semibold text-slate-700 text-sm">
                {isDragging ? "Déposez ici…" : label}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Glissez-déposez ou{" "}
                <span className={`${c.text} font-medium underline underline-offset-2`}>
                  parcourez
                </span>
                {" "}— {acceptedExts.join(", ")}
              </p>
            </div>
            {hasExisting && (
              <div className={`mt-1 flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${c.badge}`}>
                📎 Actuel : {existingFile.split("/").pop()}
              </div>
            )}
          </div>
        )}
      </div>

      {dragError && (
        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
          ⚠️ {dragError}
        </p>
      )}
    </div>
  );
};

export default FileDropZone;