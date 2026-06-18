import React, { useEffect, useState } from "react";
import FileDropZone from "./FileDropZone";
import { MultiSelect } from "primereact/multiselect";
import { gammesAPI } from "../api/index";

const ACCEPTED_GAMME_EXT = [".xls", ".xlsx", ".xlsm"];
const ACCEPTED_ASSOCIE_EXT = [".zip"];

const inputStyles =
  "flex-1 w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl px-4 py-2.5 transition-all duration-300 hover:border-blue-400 hover:bg-white focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 outline-none";

const disabledStyles =
  "bg-slate-300 text-white cursor-not-allowed opacity-70 pointer-events-none";

const GammeForm = ({
  title,
  projet,
  typeProcedures,
  fonctions,
  vehicules = [],
  initialForm,
  existingFiles = {},
  onSubmit,
  isEditing = false, 
  isPPL = false,
}) => {
  const [form, setForm] = useState(initialForm || {});
  const [error, setError] = useState("");
  const [fichierGamme, setFichierGamme] = useState([]);
  const [fichierAssocie, setFichierAssocie] = useState([]);
  const [selectedVehicules, setSelectedVehicules] = useState([]);

  const [checkedFields, setCheckedFields] = useState({
    nom: false,
    type_procedure: false,
    fonction_gamme: false,
    nombre_jours: false,
    boitiers: false,
    pistes: false,
    vehicules: false,
  });

  const multipleGammes = fichierGamme.length > 1;

  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  useEffect(() => {
    setSelectedVehicules(
      Array.isArray(initialForm?.vehicules)
        ? initialForm.vehicules.map(String)
        : []
    );

    setForm(initialForm || {});
  }, [initialForm]);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!form.type_procedure || !form.fonction_gamme) return;
      try {
        const res = await gammesAPI.getTemplate(form.type_procedure, form.fonction_gamme);
        if (res.data) {
          setForm((prev) => ({
            ...prev,
            boitiers: prev.boitiers || res.data.boitiers,
            pistes: prev.pistes || res.data.pistes,
            nombre_jours: prev.nombre_jours || res.data.nombre_jours,
          }));
        }
      } catch (err) {
        console.error("Template fetch error:", err);
      }
    };
    fetchTemplate();
  }, [form.type_procedure, form.fonction_gamme]);

  const allChecked = Object.values(checkedFields).every(Boolean);
  const toggleAll = () => {
    const next = !allChecked;
    setCheckedFields(Object.fromEntries(Object.keys(checkedFields).map((k) => [k, next])));
  };
  const toggleField = (key) =>
    setCheckedFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const vehiculeOptions = vehicules.map((v) => ({
    label: v.cmq || v.vin || `V${v.id}`,
    value: String(v.id),
  }));

  const normalizeFileName = (name) => {
    return name.trim().toLowerCase();
  };

  const removeDuplicateFiles = (files) => {
    const seen = new Set();
    const uniqueFiles = [];
    const duplicates = [];

    files.forEach((file) => {
      const normalizedName = normalizeFileName(file.name);

      if (seen.has(normalizedName)) {
        duplicates.push(file.name);
      } else {
        seen.add(normalizedName);
        uniqueFiles.push(file);
      }
    });

    return { uniqueFiles, duplicates };
  };
  const formatBackendError = (err) => {
  const data = err?.data || err?.response?.data;

  if (data?.duplicates_in_db?.length > 0) {
    return `Ce fichier est déjà importé dans ce projet : ${data.duplicates_in_db.join(", ")}`;
  }

  if (data?.duplicates_in_request?.length > 0) {
    return `Fichier(s) dupliqué(s) dans la sélection : ${data.duplicates_in_request.join(", ")}`;
  }

  if (data?.detail) {
    return data.detail;
  }

  if (err?.message) {
    return err.message;
  }

  return "Erreur lors de l'import.";
};

  const handleGammeFilesChange = (files) => {
    const nextFiles = isEditing ? files.slice(-1) : files;

    const { uniqueFiles, duplicates } = removeDuplicateFiles(nextFiles);

    if (duplicates.length > 0) {
      setError(
        `Fichier(s) déjà sélectionné(s) : ${duplicates.join(", ")}`
      );
    } else {
      setError("");
    }

    setFichierGamme(uniqueFiles);
  };

  const handleSubmit = async () => {
  setError("");

  const { duplicates } = removeDuplicateFiles(fichierGamme);

  if (duplicates.length > 0) {
    setError(
      `Import impossible. Fichier(s) dupliqué(s) : ${duplicates.join(", ")}`
    );
    return;
  }

  if (!isEditing && (!fichierGamme || fichierGamme.length === 0)) {
    setError("Le fichier de la gamme est obligatoire.");
    return;
  }

  const formData = new FormData();

  if (projet?.id) {
    formData.append("projet", projet.id);
  }

  /**
   * Champs metadata
   * En création multiple :
   * - si plusieurs fichiers, tu peux envoyer les champs cochés seulement
   * - si un seul fichier, tu peux envoyer tous les champs remplis
   */
  Object.keys(checkedFields).forEach((key) => {
    if (key === "vehicules") return;

    const value = form[key];

    if (value !== undefined && value !== null && value !== "") {
      // Si plusieurs gammes, appliquer seulement les champs cochés
      if (multipleGammes && !isEditing) {
        if (checkedFields[key]) {
          formData.append(key, value);
        }
      } else {
        formData.append(key, value);
      }
    }
  });

  /**
   * Fichiers gamme
   */
  if (isEditing) {
    if (fichierGamme.length > 0) {
      formData.append("fichierGamme", fichierGamme[0]);
    }
  } else {
    fichierGamme.forEach((f) => {
      formData.append("fichierGamme", f);
    });
  }

  if (fichierAssocie.length > 0) {
    if (isEditing) {
      formData.append("fichierAssocie", fichierAssocie[0]);
    } else {
      formData.append("fichierAssocie", fichierAssocie[0]);
    }
  }

  if (isEditing) {
    if (selectedVehicules.length > 0) {
      formData.append("vehicule", selectedVehicules[0]);
    } else {
      formData.append("vehicule", "");
    }
  } else {
    selectedVehicules.forEach((v) => {
      formData.append("vehicules", v);
    });
  }

  try {
    await onSubmit(formData);
  } catch (err) {
    console.error(err);
    setError(formatBackendError(err));
  }
};

  

  return (
    <div className="w-full px-3 sm:px-4 md:px-8 lg:px-16 xl:px-28 py-4 sm:py-6 md:py-8">
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm p-4 sm:p-6 md:p-8 lg:p-10">

        {projet && (
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 line-clamp-2">
              {projet.nom_projet}
            </h1>
            <span className="self-start sm:self-auto bg-blue-600/10 text-blue-700 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap">
              ID: {projet.id}
            </span>
          </div>
        )}

        <div className="mb-6 sm:mb-8 text-center">
          <h1 className="text-lg sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6">{title}</h1>
          <hr className="border-slate-100" />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl mb-4 sm:mb-6 flex items-center gap-2 text-xs sm:text-sm">
            ⚠️ <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 md:gap-10">

          {/* LEFT */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
              <h3 className="font-semibold text-sm sm:text-base text-slate-700">Informations Générales</h3>

              {multipleGammes && !isEditing && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg transition-colors self-start sm:self-auto"
                >
                  {allChecked ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              )}
            </div>

            {/* Hint when multiple files — seulement en création */}
            {multipleGammes && !isEditing && (
              <div className="mb-4 bg-blue-50 border border-blue-100 text-blue-700 text-xs px-3 py-2 rounded-lg">
                ℹ️ Cochez les champs à appliquer à toutes les gammes importées.
              </div>
            )}

            <FieldRow
              label="Configs (S/H)"
              checked={checkedFields.nom}
              onToggle={() => toggleField("nom")}
              showCheckbox={multipleGammes}
            >
              <input
                className={inputStyles}
                placeholder="Configs (S/H)"
                value={form.nom || ""}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
              />
            </FieldRow>

            <FieldRow
              label="Type Procédure"
              checked={checkedFields.type_procedure}
              onToggle={() => toggleField("type_procedure")}
              showCheckbox={multipleGammes}
            >
              <select
                className={`${inputStyles} cursor-pointer appearance-none`}
                value={form.type_procedure || ""}
                onChange={(e) => setForm({ ...form, type_procedure: e.target.value })}
              >
                <option value="" disabled>--Type Procédure--</option>
                {typeProcedures.map((tp) => (
                  <option key={tp.id} value={tp.id}>{tp.nom}</option>
                ))}
              </select>
            </FieldRow>

            <FieldRow
              label="Fonction"
              checked={checkedFields.fonction_gamme}
              onToggle={() => toggleField("fonction_gamme")}
              showCheckbox={multipleGammes}
            >
              <select
                className={`${inputStyles} cursor-pointer appearance-none`}
                value={form.fonction_gamme || ""}
                onChange={(e) => setForm({ ...form, fonction_gamme: e.target.value })}
              >
                <option value="" disabled>--Fonction--</option>
                {fonctions.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </FieldRow>

            <FieldRow
              label="Nombre de jours"
              checked={checkedFields.nombre_jours}
              onToggle={() => toggleField("nombre_jours")}
              showCheckbox={multipleGammes}
            >
              <input
                type="number"
                className={`${inputStyles} ${isPPL ? disabledStyles : ""}`}
                placeholder="Nombre de jours"
                value={form.nombre_jours || ""}
                onChange={(e) => setForm({ ...form, nombre_jours: e.target.value })}
                disabled={isPPL}
              />
            </FieldRow>

            <FieldRow
                label="Véhicules"
                checked={checkedFields.vehicules}
                onToggle={() => toggleField("vehicules")}
                showCheckbox={multipleGammes && !isEditing}
              >
                <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl transition-all duration-300 hover:border-blue-400 focus-within:bg-white focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-600/10">
                  {isEditing ? (
                    // Mode édition : select simple (FK = un seul véhicule)
                    <select
                      className="w-full p-2 px-3 bg-transparent focus:outline-none text-sm"
                      value={selectedVehicules[0] || ""}
                      onChange={(e) =>
                        setSelectedVehicules(e.target.value ? [String(e.target.value)] : [])
                      }
                    >
                      <option value="">Aucun véhicule</option>
                      {vehiculeOptions.map((v) => (
                        <option key={v.value} value={v.value}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    // Mode création : MultiSelect (plusieurs véhicules possibles)
                    <MultiSelect
                      value={selectedVehicules}
                      onChange={(e) => setSelectedVehicules(e.value)}
                      options={vehiculeOptions}
                      display="chip"
                      placeholder="Sélectionner Véhicule(s)"
                      maxSelectedLabels={3}
                      className="w-full border-none shadow-none bg-transparent"
                    />
                  )}
                </div>
              </FieldRow>

            <h3 className="font-semibold mt-8 mb-4 text-slate-700">Besoin Technique</h3>

            <FieldRow
              label="Pistes"
              checked={checkedFields.pistes}
              onToggle={() => toggleField("pistes")}
              showCheckbox={multipleGammes}
            >
              <input
                className={`${inputStyles} ${isPPL ? disabledStyles : ""}`}
                placeholder="Pistes"
                value={form.pistes || ""}
                onChange={(e) => setForm({ ...form, pistes: e.target.value })}
                disabled={isPPL}
              />
            </FieldRow>

            <FieldRow
              label="Boitiers"
              checked={checkedFields.boitiers}
              onToggle={() => toggleField("boitiers")}
              showCheckbox={multipleGammes}
            >
              <input
                className={`${inputStyles} ${isPPL ? disabledStyles : ""}`}
                placeholder="Boitiers"
                value={form.boitiers || ""}
                onChange={(e) => setForm({ ...form, boitiers: e.target.value })}
                disabled={isPPL}
              />
            </FieldRow>
          </div>

          {/* RIGHT — file uploads */}
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-1 text-slate-700">
                Fichier Gamme <span className="text-red-500">*</span>
              </h3>
              <p className="text-xs text-slate-400 mb-3">
                Vous pouvez importer plusieurs fichiers. Un champ obligatoire.
              </p>
              <FileDropZone
                id="fichier_gamme"
                acceptedExts={ACCEPTED_GAMME_EXT}
                files={fichierGamme}
                existingFile={existingFiles.fichier_gamme}
                onFilesChange={handleGammeFilesChange}
                label="Importer la gamme"
                accentColor="blue"
                multiple={!isEditing} 
              />
            </div>

            <div>
              <h3 className="font-semibold mb-1 text-slate-700">Fichier Associé</h3>
              <p className="text-xs text-slate-400 mb-3">Optionnel.</p>
              <FileDropZone
                id="fichier_associe"
                acceptedExts={ACCEPTED_ASSOCIE_EXT}
                files={fichierAssocie}
                existingFile={existingFiles.fichier_associe}
                onFilesChange={setFichierAssocie}
                label="Importer le fichier associé"
                accentColor="green"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-8 sm:mt-10">
          <button
            type="button"
            onClick={handleSubmit}
            className="bg-blue-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold text-sm sm:text-base hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all duration-300 active:scale-95"
          >
            {title}
          </button>
        </div>
      </div>
    </div>
  );
};

const FieldRow = ({ label, checked, onToggle, showCheckbox, children }) => (
  <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 w-full">
    <div className="flex-1 w-full min-w-0">
      {children}
    </div>

    {showCheckbox && (
      <label
        title={`Appliquer "${label}" à toutes les gammes importées`}
        className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg cursor-pointer transition-all duration-200 border whitespace-nowrap text-xs sm:text-sm ${
          checked
            ? "bg-blue-50 border-blue-200 shadow-sm"
            : "bg-slate-50 border-slate-200 hover:bg-slate-100"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer transition-transform duration-200 hover:scale-110 accent-blue-600"
        />
        <span
          className={`font-medium select-none transition-colors ${
            checked ? "text-blue-800" : "text-slate-500"
          }`}
        >
          À tous
        </span>
      </label>
    )}
  </div>
);

export default GammeForm;
