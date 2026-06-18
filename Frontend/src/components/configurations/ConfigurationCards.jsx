import React, { useState } from 'react';
import { configAPI } from '../../api/index';

/* ======================================================
   CONSTANTS
====================================================== */
const ACCESS_LEVELS = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'PPL', label: 'PPL' },
  { value: 'VALIDEUR', label: 'Valideur' },
  { value: 'VISITEUR', label: 'Visiteur' },
];

/* ======================================================
   CONFIRM MODAL
====================================================== */
const ConfirmModal = ({ open, title, message, onConfirm, onCancel }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        <p className="text-sm text-gray-600 mb-6">
          {message}
        </p>

        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ======================================================
   GENERIC CONFIG CARD
====================================================== */
const ConfigCard = ({
  title,
  description,
  items,
  fieldName,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [newValue, setNewValue] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const validate = (v) => {
    if (!v.trim()) return 'Champ obligatoire';
    if (v.trim().length < 2) return 'Minimum 2 caractères';
    return '';
  };

  const saveEdit = (id) => {
    const err = validate(editValue);
    if (err) return setError(err);
    onUpdate(id, { [fieldName]: editValue.trim() });
    setEditingId(null);
  };

  const create = () => {
    const err = validate(newValue);
    if (err) return setError(err);
    onCreate({ [fieldName]: newValue.trim() });
    setNewValue('');
    setError('');
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>

        <div className="overflow-x-auto mb-4">
          <table className="w-full min-w-[400px] text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-4 text-center text-gray-400">
                    Aucun élément
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {editingId === it.id ? (
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded border px-2 py-1"
                          autoFocus
                        />
                      ) : (
                        it[fieldName]
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingId === it.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(it.id)}
                            className="text-green-600 hover:text-green-800 mr-3"
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            Annuler
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingId(it.id);
                              setEditValue(it[fieldName]);
                            }}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => setDeleteId(it.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        <div className="mt-auto flex gap-2">
          <input
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="Nouvelle valeur"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
          <button
            onClick={create}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Ajouter
          </button>
        </div>
      </div>

      <ConfirmModal
        open={deleteId !== null}
        title="Confirmation"
        message="Cette suppression est définitive."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          onDelete(deleteId);
          setDeleteId(null);
        }}
      />
    </>
  );
};

/* ======================================================
   ROLE CONFIG CARD (SPECIAL)
====================================================== */
const RoleConfigCard = ({ roles, reload }) => {
  const [editingId, setEditingId] = useState(null);
  const [label, setLabel] = useState('');
  const [accessLevel, setAccessLevel] = useState('VISITEUR');

  const [newLabel, setNewLabel] = useState('');
  const [newAccess, setNewAccess] = useState('VISITEUR');

  const [deleteId, setDeleteId] = useState(null);
  const [error, setError] = useState('');

  const validate = (v) => {
    if (!v.trim()) return 'Champ obligatoire';
    if (v.trim().length < 2) return 'Minimum 2 caractères';
    return '';
  };

  /* ---------- Edit ---------- */
  const startEdit = (role) => {
    setEditingId(role.id);
    setLabel(role.label);
    setAccessLevel(role.access_level);
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setLabel('');
    setAccessLevel('VISITEUR');
    setError('');
  };

  const saveEdit = async (role) => {
    const err = validate(label);
    if (err) return setError(err);

    await configAPI.roles.update(role.id, {
      label,
      code: label.toUpperCase(),
      access_level: accessLevel,
    });

    cancelEdit();
    reload();
  };

  /* ---------- Create ---------- */
  const createRole = async () => {
    const err = validate(newLabel);
    if (err) return setError(err);

    await configAPI.roles.create({
      label: newLabel,
      code: newLabel.toUpperCase(),
      access_level: newAccess,
    });

    setNewLabel('');
    setNewAccess('VISITEUR');
    setError('');
    reload();
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rôles</h3>
          <p className="text-sm text-gray-500">
            Gestion des rôles utilisateurs
          </p>
        </div>

        {/* Table */}
        <div className="overflow-x-auto mb-4">
          <table className="min-w-[520px] w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Label</th>
                <th className="px-4 py-2 text-left">Access level</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                    Aucun rôle
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr key={role.id} className="border-t hover:bg-gray-50">
                    {/* Label */}
                    <td className="px-4 py-2">
                      {editingId === role.id ? (
                        <input
                          value={label}
                          onChange={(e) => setLabel(e.target.value)}
                          className="w-full rounded border px-2 py-1 text-sm"
                          autoFocus
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          {role.label}
                          {role.is_system && (
                            <span className="text-xs bg-gray-200 px-2 rounded">
                              système
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Access */}
                    <td className="px-4 py-2">
                      {editingId === role.id ? (
                        <select
                          value={accessLevel}
                          onChange={(e) => setAccessLevel(e.target.value)}
                          disabled={role.is_system}
                          className="w-full rounded border px-2 py-1 text-sm"
                        >
                          {ACCESS_LEVELS.map((a) => (
                            <option key={a.value} value={a.value}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        role.access_level
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-2">
                      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 text-xs sm:text-sm">
                        {editingId === role.id ? (
                          <>
                            <button
                              onClick={() => saveEdit(role)}
                              className="text-green-600 hover:text-green-800"
                            >
                              Enregistrer
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              Annuler
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(role)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Modifier
                            </button>
                            {!role.is_system && (
                              <button
                                onClick={() => setDeleteId(role.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                Supprimer
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}

        {/* Add role */}
        <div className="mt-auto border-t pt-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">
            Ajouter un rôle
          </h4>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Nom du rôle"
              className="w-full rounded-md border px-3 py-2 text-sm"
            />

            <select
              value={newAccess}
              onChange={(e) => setNewAccess(e.target.value)}
              className="w-full sm:w-48 rounded-md border px-2 py-2 text-sm"
            >
              {ACCESS_LEVELS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>

            <button
              onClick={createRole}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Ajouter
            </button>
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      <ConfirmModal
        open={deleteId !== null}
        title="Suppression du rôle"
        message="Ce rôle sera définitivement supprimé."
        onCancel={() => setDeleteId(null)}
        onConfirm={() => {
          configAPI.roles.delete(deleteId).then(reload);
          setDeleteId(null);
        }}
      />
    </>
  );
};


export { ConfigCard, RoleConfigCard };
