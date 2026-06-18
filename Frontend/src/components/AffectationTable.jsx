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
            className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 shadow-sm"
          >
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Projet
              </label>
              <select
                value={aff.projet}
                onChange={(e) =>
                  handleChange(index, "projet", e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Rôle
              </label>
              <select
                value={aff.role}
                onChange={(e) =>
                  handleChange(index, "role", e.target.value === "" ? "" : Number(e.target.value))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="flex-1 flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-700">
                Projet
              </th>
              <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-semibold text-gray-700">
                Rôle
              </th>
              <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold text-gray-700">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {affectations.map((aff, index) => (
              <tr key={aff._key} className="border-t hover:bg-gray-50 transition-colors">
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
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="inline-flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-2 rounded transition-colors text-sm font-medium"
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
          ⚠️ {error}
        </p>
      )}

      <div className="pt-2">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-2 bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base font-medium active:scale-95"
        >
          <Plus size={18} />
          Ajouter une affectation
        </button>
      </div>
    </div>
  );
};

export default AffectationTable;