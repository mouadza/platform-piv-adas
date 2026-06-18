import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Upload, ChevronLeft, FileText, CheckCircle, XCircle, Eye } from 'lucide-react';
import { API_BASE_URL } from '../api';
import { getAccessToken } from '../utils/authStorage';

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
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/admin_config/detail/${id}/`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setProjet({ id: data.id, nom: data.nomProjet });
        } else {
          setError("Erreur lors de la récupération du projet");
        }
      } catch {
        setError("Erreur réseau lors de la récupération du projet");
      }
    };

    fetchProjet();
  }, [id, navigate]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setError(null);

    if (file && !file.name.endsWith('.xlsm')) {
      setError('Seuls les fichiers Excel (.xlsm) sont acceptés');
      setSelectedFile(null);
      return;
    }

    if (file && file.size > 10 * 1024 * 1024) {
      setError('La taille du fichier ne doit pas dépasser 10MB');
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
    formData.append('file', selectedFile);

    const token = getAccessToken();

    try {
      const response = await fetch(`${API_BASE_URL}/admin_config/projets/${id}/gammes/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        setUploadSuccess(true);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Échec de l'importation");
      }
    } catch {
      setError("Erreur réseau lors de l'importation du fichier");
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
    <div className="fixed inset-0 bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-md overflow-hidden w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <header className="px-8 py-6 flex justify-between items-center border-b">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Retour
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Importer une gamme</h1>
          <div className="w-5 h-5"></div>
        </header>

        <main className="p-8">
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border border-blue-100">
            <div className="flex items-center">
              <FileText className="w-6 h-6 text-blue-500 mr-3" />
              <div>
                {error && <p className="text-red-500 mb-2">{error}</p>}
                {projet ? (
                  <>
                    <h2 className="text-lg font-semibold text-gray-800">{projet.nom}</h2>
                    <p className="text-sm text-gray-500">ID: {projet.id}</p>
                  </>
                ) : (
                  <p className="text-gray-500">Chargement des informations du projet...</p>
                )}
                
              </div>
            </div>
          </div>

          {/* Bouton "Afficher les gammes importées" déplacé ici */}
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => navigate(`/GammeImporte/${id}`)}             
              className="px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 flex items-center"
            >
              <Eye className="w-4 h-4 mr-2" />
              Afficher les gammes importées
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-8 text-center">
              {uploadSuccess ? (
                <div className="flex flex-col items-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Fichier importé avec succès !</h3>
                  <p className="text-gray-500 mb-6">{selectedFile ? selectedFile.name : ''}</p>
                  <div className="flex gap-4">
                    <button
                      onClick={handleReset}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Importer un autre fichier
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6">
                    <Upload className="w-10 h-10 text-blue-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {selectedFile ? "Fichier sélectionné" : "Glissez-déposez votre fichier Excel"}
                    </h3>
                    <p className="text-gray-500 mb-4">
                      {selectedFile ? selectedFile.name : "ou cliquez pour parcourir vos fichiers"}
                    </p>
                    <p className="text-xs text-gray-400">Format supporté: .xlsm (max 10MB)</p>
                    <input
                      type="file"
                      id="file-upload"
                      className="hidden"
                      onChange={handleFileChange}
                      accept=".xlsm"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                    >
                      {selectedFile ? "Changer de fichier" : "Sélectionner un fichier"}
                    </label>
                  </div>

                  {error && (
                    <div className="flex items-center justify-center text-red-500 mb-4">
                      <XCircle className="w-5 h-5 mr-2" />
                      <span>{error}</span>
                    </div>
                  )}

                  {selectedFile && (
                    <button
                      onClick={handleUpload}
                      disabled={isUploading}
                      className={`px-6 py-3 rounded-md text-white font-medium w-full max-w-xs ${
                        isUploading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {isUploading ? 'Import en cours...' : 'Importer la gamme'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-6 bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">Instructions :</h3>
            <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
              <li>Seuls les fichiers Excel (.xlsm) sont acceptés</li>
              <li>Le fichier doit respecter le modèle fourni</li>
              <li>Taille maximale : 10MB</li>
              <li>Les données existantes seront mises à jour</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ImportGammePage;
