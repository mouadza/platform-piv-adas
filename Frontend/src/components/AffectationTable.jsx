import React, { useEffect, useState } from "react";
import { configAPI } from "../api/index";
import { nanoid } from "nanoid";
import { Trash2, Plus } from "lucide-react";

const AffectationTable = ({ affectations, setAffectations, projects }) => {
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const data = await configAPI.roles.list();
        setRoles(data);
      } finally {
        setLoadingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  const handleChange = (index, field, value) => {
    setAffectations((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const addRow = () => {
    const last = affectations[affectations.length - 1];
    if (last && (last.projet === "" || last.role === "")) {
      setError("Veuillez sélectionner un projet et un rôle avant d'ajouter une nouvelle ligne.");
      return;
    }
    setError("");
    setAffectations((prev) => [
      ...prev,
      { _key: nanoid(), projet: "", role: "" },
    ]);
  };

  const removeRow = (index) => {
    setError("");
    setAffectations((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full space-y-4">
      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {affectations.map((aff, index) => (
          <div
            key={aff._key}
            className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Projet
              </label>
              <select
                value={aff.projet}
                onChange={(e) =>
                  handleChange(index, "projet", e.target.value === "" ? "" : Number(e.target.value))
                }
                className="field-control"
              >
                <option value="">-- Sélectionner --</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>
                    {proj.nom_projet}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Rôle
              </label>
              <select
                value={aff.role}
                onChange={(e) =>
                  handleChange(index, "role", e.target.value === "" ? "" : Number(e.target.value))
                }
                className="field-control"
                disabled={loadingRoles}
              >
                <option value="">-- Rôle --</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => removeRow(index)}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto rounded-lg border border-slate-200 md:block">
        <table className="w-full overflow-hidden">
          <thead className="bg-[#00133B] text-white">
            <tr>
              <th className="p-3 text-left text-xs font-bold uppercase tracking-wide sm:p-4">
                Projet
              </th>
              <th className="p-3 text-left text-xs font-bold uppercase tracking-wide sm:p-4">
                Rôle
              </th>
              <th className="p-3 text-center text-xs font-bold uppercase tracking-wide sm:p-4">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {affectations.map((aff, index) => (
              <tr key={aff._key} className="border-t border-slate-100 transition-colors hover:bg-slate-50">
                <td className="p-3 sm:p-4">
                  <select
                    value={aff.projet}
                    onChange={(e) =>
                      handleChange(
                        index,
                        "projet",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="field-control"
                  >
                    <option value="">-- Sélectionner --</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.nom_projet}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-3 sm:p-4">
                  <select
                    value={aff.role}
                    onChange={(e) =>
                      handleChange(
                        index,
                        "role",
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="field-control"
                    disabled={loadingRoles}
                  >
                    <option value="">-- Rôle --</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </td>

                <td className="p-3 sm:p-4 text-center">
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-100"
                  >
                    <Trash2 size={18} />
                    Supprimer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
          {error}
        </p>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 rounded-lg bg-[#243782] px-4 py-2 text-sm font-bold text-white transition hover:bg-[#00133B] active:scale-95 sm:px-6 sm:py-2.5"
        >
          <Plus size={18} />
          Ajouter une affectation
        </button>
      </div>
    </div>
  );
};

export default AffectationTable;


