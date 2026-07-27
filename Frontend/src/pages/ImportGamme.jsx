import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CheckCircle,
  ChevronLeft,
  Eye,
  FileText,
  Upload,
  XCircle,
} from "lucide-react";

import DashboardLayout from "../components/DashboardLayout";
import { API_BASE_URL } from "../api";
import { getAccessToken } from "../utils/authStorage";

const ImportGammePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [projet, setProjet] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProjet = async () => {
      const token = getAccessToken();
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/admin_config/detail/${id}/`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setProjet({ id: data.id, nom: data.nomProjet });
        } else {
          setError("Erreur lors de la recuperation du projet");
        }
      } catch {
        setError("Erreur reseau lors de la recuperation du projet");
      }
    };

    fetchProjet();
  }, [id, navigate]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setError(null);

    if (file && !file.name.endsWith(".xlsm")) {
      setError("Seuls les fichiers Excel (.xlsm) sont acceptes");
      setSelectedFile(null);
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      setError("La taille du fichier ne doit pas depasser 10MB");
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setUploadSuccess(false);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(
        `${API_BASE_URL}/admin_config/projets/${id}/gammes/`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${getAccessToken()}` },
          body: formData,
        }
      );

      if (response.ok) {
        setUploadSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Echec de l'importation");
      }
    } catch {
      setError("Erreur reseau lors de l'importation du fichier");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
    setError(null);
  };

  return (
    <DashboardLayout role={localStorage.getItem("role") || "ppl"}>
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="app-panel">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
              <ChevronLeft size={18} />
              Retour
            </button>
            <div className="sm:text-right">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Import
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                Importer une gamme
              </h1>
            </div>
          </div>
        </section>

        <section className="app-panel">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-[#243782]" />
            <div>
              {projet ? (
                <>
                  <h2 className="text-lg font-extrabold text-slate-950">
                    {projet.nom}
                  </h2>
                  <p className="text-sm text-slate-500">ID: {projet.id}</p>
                </>
              ) : (
                <div className="h-10 w-64 animate-pulse rounded-lg bg-slate-100" />
              )}
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate(`/GammeImporte/${id}`)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 hover:bg-emerald-100"
          >
            <Eye size={16} />
            Afficher les gammes importees
          </button>
        </div>

        <section className="app-card overflow-hidden">
          <div className="p-8 text-center">
            {uploadSuccess ? (
              <div className="flex flex-col items-center">
                <CheckCircle className="mb-4 h-12 w-12 text-emerald-600" />
                <h3 className="mb-2 text-xl font-extrabold text-slate-950">
                  Fichier importe avec succes
                </h3>
                <p className="mb-6 text-slate-500">
                  {selectedFile ? selectedFile.name : ""}
                </p>
                <button type="button" onClick={handleReset} className="btn-secondary">
                  Importer un autre fichier
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6 rounded-lg border-2 border-dashed border-slate-300 p-8">
                  <Upload className="mx-auto mb-4 h-10 w-10 text-[#243782]" />
                  <h3 className="mb-2 text-lg font-extrabold text-slate-950">
                    {selectedFile
                      ? "Fichier selectionne"
                      : "Glissez-deposez votre fichier Excel"}
                  </h3>
                  <p className="mb-4 text-slate-500">
                    {selectedFile
                      ? selectedFile.name
                      : "ou cliquez pour parcourir vos fichiers"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Format supporte: .xlsm (max 10MB)
                  </p>
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileChange}
                    accept=".xlsm"
                  />
                  <label
                    htmlFor="file-upload"
                    className="mt-4 inline-block cursor-pointer rounded-lg bg-[#243782] px-4 py-2 text-sm font-bold text-white hover:bg-[#00133B]"
                  >
                    {selectedFile ? "Changer de fichier" : "Selectionner un fichier"}
                  </label>
                </div>

                {error && (
                  <div className="mb-4 flex items-center justify-center text-red-600">
                    <XCircle className="mr-2 h-5 w-5" />
                    <span>{error}</span>
                  </div>
                )}

                {selectedFile && (
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="w-full max-w-xs rounded-lg bg-[#243782] px-6 py-3 font-bold text-white hover:bg-[#00133B] disabled:opacity-60"
                  >
                    {isUploading ? "Import en cours..." : "Importer la gamme"}
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-[#243782]/15 bg-[#243782]/10 p-4">
          <h3 className="mb-2 font-bold text-blue-800">Instructions</h3>
          <ul className="list-inside list-disc space-y-1 text-sm text-[#243782]">
            <li>Seuls les fichiers Excel (.xlsm) sont acceptes</li>
            <li>Le fichier doit respecter le modele fourni</li>
            <li>Taille maximale : 10MB</li>
            <li>Les donnees existantes seront mises a jour</li>
          </ul>
        </section>
      </div>
    </DashboardLayout>
  );
};

export default ImportGammePage;


