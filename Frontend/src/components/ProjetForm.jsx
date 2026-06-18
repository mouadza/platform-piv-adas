import React, { useMemo, useState } from "react";
import { MultiSelect } from "primereact/multiselect";
import { vehiculesAPI } from "../api/index";

const ROLES = ["PPL", "VALIDEUR", "VISITEUR"];

const SELECT_CLASS =
  "w-full border border-slate-200 rounded-xl p-3 text-sm bg-white outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-50 transition-all appearance-none cursor-pointer";

const ProjetForm = ({
  title,
  subtitle,
  project,
  setProject,
  users,
  architectures,
  motorisations,
  affectations,
  setAffectations,
  vehicules = [],
  setVehicules,
  onSubmit,
  submitLabel,
  onCancel,
}) => {
  const [search, setSearch] = useState("");
  const [showVehiculeModal, setShowVehiculeModal] = useState(false);
  const [showVehiculeList, setShowVehiculeList] = useState(false);
  const [vehiculeError, setVehiculeError] = useState("");
  const [editIndex, setEditIndex] = useState(null);

  const [vehiculeForm, setVehiculeForm] = useState({
    cmq: "",
    vin: "",
    motorisation: "",
  });

  const filteredMotorisations = motorisations.filter((m) =>
    project.motorisations?.includes(m.id)
  );

  const filteredUsers = useMemo(
    () => users.filter((u) => u.username.toLowerCase().includes(search.toLowerCase())),
    [users, search]
  );

  const getAssignedRole = (userId) => {
    for (const role of ROLES) {
      if (affectations[role]?.includes(userId)) return role;
    }
    return null;
  };

  const addUserToRole = (user, targetRole) => {
    setAffectations((prev) => {
      const updated = {
        PPL: prev.PPL.filter((id) => id !== user.id),
        VALIDEUR: prev.VALIDEUR.filter((id) => id !== user.id),
        VISITEUR: prev.VISITEUR.filter((id) => id !== user.id),
      };
      updated[targetRole] = [...updated[targetRole], user.id];
      return updated;
    });
  };

  const removeUser = (userId, role) => {
    setAffectations((prev) => ({
      ...prev,
      [role]: prev[role].filter((id) => id !== userId),
    }));
  };

  const getRoleButtonClass = (role, assignedRole) => {
    const isActive = assignedRole === role;
    const base =
      "flex items-center justify-center rounded-lg px-3 py-1.5 text-[10px] font-black transition-all border shadow-sm active:scale-95 ";
    const styles = {
      PPL: isActive
        ? "bg-emerald-600 text-white border-emerald-700"
        : "bg-white text-slate-400 border-emerald-300 hover:border-emerald-500 hover:text-emerald-600",
      VALIDEUR: isActive
        ? "bg-amber-500 text-white border-amber-600"
        : "bg-white text-slate-400 border-amber-300 hover:border-amber-500 hover:text-amber-600",
      VISITEUR: isActive
        ? "bg-indigo-600 text-white border-indigo-700"
        : "bg-white text-slate-400 border-indigo-300 hover:border-indigo-500 hover:text-indigo-600",
    };
    return base + styles[role];
  };

  const getRoleMeta = (role) => {
    if (role === "PPL")
      return { label: "PPL", titleColor: "text-emerald-600", softBg: "bg-emerald-50/50", border: "border-emerald-100" };
    if (role === "VALIDEUR")
      return { label: "Valideurs", titleColor: "text-amber-500", softBg: "bg-amber-50/50", border: "border-amber-100" };
    return { label: "Visiteurs", titleColor: "text-indigo-600", softBg: "bg-indigo-50/50", border: "border-indigo-100" };
  };

  const isDuplicateVehicule = (field, value, excludeIndex = null) => {
    const normalized = value.trim().toLowerCase();
    return vehicules.some(
      (v, i) =>
        i !== excludeIndex &&
        String(v[field] || "").trim().toLowerCase() === normalized
    );
  };

  const openCreateModal = () => {
    setEditIndex(null);
    setVehiculeForm({ cmq: "", vin: "", motorisation: "" });
    setVehiculeError("");
    setShowVehiculeModal(true);
  };

  const openEditModal = (index) => {
    setEditIndex(index);
    setVehiculeForm({ ...vehicules[index] });
    setVehiculeError("");
    setShowVehiculeList(false);
    setShowVehiculeModal(true);
  };

  const saveVehicule = async () => {
    const cmq = vehiculeForm.cmq.trim();
    const vin = vehiculeForm.vin.trim();
    const motorisation = vehiculeForm.motorisation;

    if (!cmq || !vin || !motorisation) {
      setVehiculeError("Veuillez remplir CMQ, VIN et Motorisation.");
      return;
    }

    try {
      // API duplicate check (only for new entries)
      if (editIndex === null) {
        const cmqCheck = await vehiculesAPI.check({ cmq });
        if (cmqCheck.data.exists) { setVehiculeError(`Le CMQ "${cmq}" existe déjà.`); return; }

        const vinCheck = await vehiculesAPI.check({ vin });
        if (vinCheck.data.exists) { setVehiculeError(`Le VIN "${vin}" existe déjà.`); return; }
      }

      // Local duplicate check (exclude current row when editing)
      if (isDuplicateVehicule("cmq", cmq, editIndex)) {
        setVehiculeError(`Le CMQ "${cmq}" est déjà utilisé ici.`);
        return;
      }
      if (isDuplicateVehicule("vin", vin, editIndex)) {
        setVehiculeError(`Le VIN "${vin}" est déjà utilisé ici.`);
        return;
      }

      const entry = { cmq, vin, motorisation: Number(motorisation) };

      if (editIndex !== null) {
        // Update existing
        setVehicules((prev) => prev.map((v, i) => (i === editIndex ? entry : v)));
      } else {
        // Add new
        setVehicules((prev) => [...prev, entry]);
      }

      setVehiculeForm({ cmq: "", vin: "", motorisation: "" });
      setVehiculeError("");
      setEditIndex(null);
      setShowVehiculeModal(false);
    } catch (error) {
      console.error(error);
      setVehiculeError("Erreur lors de la vérification.");
    }
  };

  const removeVehicule = (index) => {
    setVehicules((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">

      {/* HEADER */}
      <header className="px-10 pt-10 pb-6 flex-shrink-0">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-indigo-600 text-sm font-semibold mt-1">{subtitle}</p>}
      </header>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto px-10 space-y-10 custom-scrollbar">

        {/* TOP INPUTS */}
        <section className="bg-slate-50/50 rounded-3xl p-8 border border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

            {/* Nom */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Nom du projet
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white focus:ring-2 focus:ring-indigo-50 focus:border-indigo-300 outline-none transition-all"
                value={project.nom}
                onChange={(e) => setProject({ ...project, nom: e.target.value })}
              />
            </div>

            {/* Architecture */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Architecture
              </label>
              <div className="relative">
                <select
                  className={SELECT_CLASS}
                  value={project.architecture}
                  onChange={(e) => setProject({ ...project, architecture: e.target.value })}
                >
                  <option value="">Sélectionner...</option>
                  {architectures.map((a) => (
                    <option key={a.id} value={a.id}>{a.nom}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
              </div>
            </div>

            {/* Motorisation — PrimeReact MultiSelect */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Motorisation
              </label>
              <MultiSelect
                value={project.motorisations || []}
                onChange={(e) => setProject({ ...project, motorisations: e.value })}
                options={motorisations.map((m) => ({ label: m.nom, value: m.id }))}
                placeholder="Sélectionner motorisation(s)"
                display="chip"
                className="w-full"
              />
            </div>

            {/* Nb véhicules */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">
                Nb véhicules
              </label>
              <input
                type="number"
                readOnly
                className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-slate-100 text-slate-500 outline-none cursor-not-allowed"
                value={vehicules.length}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-blue-700 text-white px-6 py-3 text-sm font-black hover:bg-blue-800 active:scale-95 transition-all"
            >
              Créer véhicules
            </button>
            <button
              type="button"
              onClick={() => setShowVehiculeList(true)}
              className="rounded-xl bg-slate-200 text-slate-700 px-6 py-3 text-sm font-black hover:bg-slate-300 active:scale-95 transition-all"
            >
              Liste véhicules
            </button>
          </div>
        </section>

        {/* ASSIGNMENT */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-10">

          {/* User list */}
          <div className="xl:col-span-4 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className="font-extrabold text-slate-800">Utilisateurs</h3>
              <div className="relative w-1/2">
                <input
                  placeholder="Rechercher..."
                  className="w-full text-xs border-slate-200 rounded-full pl-8 pr-4 py-2 bg-slate-50 focus:bg-white outline-none border transition-all"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <span className="absolute left-3 top-2.5 opacity-30 text-[10px]">🔍</span>
              </div>
            </div>
            <div className="flex-1 bg-white border border-slate-100 rounded-[2rem] p-4 space-y-2 shadow-inner-sm overflow-y-auto max-h-[400px] custom-scrollbar">
              {filteredUsers.length === 0 ? (
                <div className="py-10 text-center text-sm italic text-slate-400">Aucun utilisateur trouvé</div>
              ) : (
                filteredUsers.map((user) => {
                  const assignedRole = getAssignedRole(user.id);
                  return (
                    <div key={user.id} className="group flex justify-between items-center p-3 rounded-2xl hover:bg-slate-50 border border-transparent transition-all">
                      <span className="text-sm font-bold text-slate-600 truncate mr-4">{user.username}</span>
                      <div className="flex gap-2 shrink-0">
                        {ROLES.map((role) => (
                          <button
                            key={role}
                            type="button"
                            onClick={() => addUserToRole(user, role)}
                            className={getRoleButtonClass(role, assignedRole)}
                          >
                            {role === "VALIDEUR" ? "Valideur" : role === "VISITEUR" ? "Visiteur" : "PPL"}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Role columns */}
          <div className="xl:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            {ROLES.map((role) => {
              const meta = getRoleMeta(role);
              return (
                <div key={role} className="flex flex-col">
                  <span className={`text-[11px] font-black uppercase mb-4 text-center tracking-[0.2em] ${meta.titleColor}`}>
                    {meta.label} ({affectations[role].length})
                  </span>
                  <div className={`flex-1 ${meta.softBg} border-2 border-dashed ${meta.border} rounded-[2rem] p-4 space-y-3 min-h-[300px] overflow-y-auto max-h-[400px] custom-scrollbar`}>
                    {affectations[role].length === 0 ? (
                      <div className="h-full min-h-[250px] flex items-center justify-center text-xs text-slate-400 italic text-center">
                        Aucun membre ajouté
                      </div>
                    ) : (
                      affectations[role].map((id) => {
                        const user = users.find((u) => u.id === id);
                        return (
                          <div key={`${role}-${id}`} className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-50">
                            <span className="text-xs font-bold text-slate-600 truncate">{user?.username}</span>
                            <button
                              type="button"
                              onClick={() => removeUser(id, role)}
                              className="text-md font-bold text-black hover:text-red-500 transition-colors px-1"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="px-10 py-8 border-t border-slate-50 flex justify-end items-center gap-8 bg-white flex-shrink-0">
        {onCancel && (
          <button type="button" onClick={onCancel} className="text-slate-400 py-4 px-6 hover:text-slate-600 text-sm font-bold transition-all">
            Annuler
          </button>
        )}
        <button
          type="button"
          onClick={onSubmit}
          className="bg-blue-800 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:-translate-y-0.5 transition-all active:scale-95"
        >
          {submitLabel}
        </button>
      </footer>

      {/* ── MODAL CREATE / EDIT VEHICULE ───────────────────────────────────── */}
      {showVehiculeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8">

            {/* Dynamic title */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                {editIndex !== null ? "Modifier un véhicule" : "Créer un véhicule"}
              </h2>
              <button
                type="button"
                onClick={() => { setShowVehiculeModal(false); setVehiculeError(""); setEditIndex(null); }}
                className="text-slate-400 hover:text-slate-600 text-xl font-black"
              >
                ×
              </button>
            </div>

            {vehiculeError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold px-4 py-3 rounded-xl mb-5">
                <span>⚠️</span>
                <span className="flex-1">{vehiculeError}</span>
                <button type="button" onClick={() => setVehiculeError("")} className="text-red-400 hover:text-red-600 font-black">✕</button>
              </div>
            )}

            <div className="space-y-4">
              {/* CMQ */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">CMQ</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  placeholder="Ex: CMQ-001"
                  value={vehiculeForm.cmq}
                  onChange={(e) => { setVehiculeError(""); setVehiculeForm({ ...vehiculeForm, cmq: e.target.value }); }}
                />
              </div>

              {/* VIN */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">VIN</label>
                <input
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  placeholder="Ex: VF1234567890"
                  value={vehiculeForm.vin}
                  onChange={(e) => { setVehiculeError(""); setVehiculeForm({ ...vehiculeForm, vin: e.target.value }); }}
                />
              </div>

              {/* Motorisation */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">Motorisation</label>
                <div className="relative">
                  <select
                    className={SELECT_CLASS}
                    value={vehiculeForm.motorisation}
                    onChange={(e) => { setVehiculeError(""); setVehiculeForm({ ...vehiculeForm, motorisation: e.target.value }); }}
                  >
                    <option value="">Sélectionner...</option>
                    {filteredMotorisations.map((m) => (
                      <option key={m.id} value={m.id}>{m.nom}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</span>
                </div>
                {filteredMotorisations.length === 0 && (
                  <p className="text-xs text-amber-500 mt-1.5">
                    ⚠️ Sélectionnez d'abord une motorisation pour le projet.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => { setShowVehiculeModal(false); setVehiculeError(""); setEditIndex(null); }}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={saveVehicule}
                className="px-6 py-2.5 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 transition-colors"
              >
                {editIndex !== null ? "Enregistrer" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL LIST VEHICULES ───────────────────────────────────────────── */}
      {showVehiculeList && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-900">
                Liste des véhicules <span className="text-slate-400 font-normal text-lg">({vehicules.length})</span>
              </h2>
              <button type="button" onClick={() => setShowVehiculeList(false)} className="text-slate-400 hover:text-red-500 font-black text-xl">×</button>
            </div>

            {vehicules.length === 0 ? (
              <div className="text-center text-slate-400 italic py-10">Aucun véhicule ajouté</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="p-3 text-left font-bold text-slate-600">CMQ</th>
                      <th className="p-3 text-left font-bold text-slate-600">VIN</th>
                      <th className="p-3 text-left font-bold text-slate-600">Motorisation</th>
                      <th className="p-3 text-center font-bold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicules.map((v, index) => {
                      const mot = motorisations.find((m) => m.id === Number(v.motorisation));
                      return (
                        <tr key={`${v.vin}-${index}`} className="border-t hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-mono text-slate-700">{v.cmq}</td>
                          <td className="p-3 font-mono text-slate-700">{v.vin}</td>
                          <td className="p-3 text-slate-600">{mot?.nom || "-"}</td>
                          <td className="p-3">
                            <div className="flex gap-3 justify-center">
                              <button
                                type="button"
                                onClick={() => openEditModal(index)}
                                className="text-blue-600 hover:text-blue-800 font-bold text-xs transition-colors"
                              >
                                Modifier
                              </button>
                              <button
                                type="button"
                                onClick={() => removeVehicule(index)}
                                className="text-red-500 hover:text-red-700 font-bold text-xs transition-colors"
                              >
                                Supprimer
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f1f5f9; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #e2e8f0; }
        .shadow-inner-sm { box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.02); }
      `}</style>
    </div>
  );
};

export default ProjetForm;