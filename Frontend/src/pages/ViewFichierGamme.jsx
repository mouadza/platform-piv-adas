import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import * as XLSX from "xlsx";
import DashboardLayout from "../components/DashboardLayout";
import { API_BASE_URL, gammesAPI } from "../api/index";

const BASE_URL = `${API_BASE_URL}/admin_config`;

import {Search} from "lucide-react";

const ViewFichierGamme = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [gamme, setGamme] = useState(null);
  const [workbook, setWorkbook] = useState(null);
  const [sheets, setSheets] = useState([]);
  const [activeSheet, setActiveSheet] = useState("");
  const [tableData, setTableData] = useState({ headers: [], rows: [] });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Charger les métadonnées de la gamme
  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await gammesAPI.detail(id);
        setGamme(data);
      } catch {
        setError("Impossible de charger la gamme.");
      }
    };
    fetch();
  }, [id]);

  // 2. Télécharger et parser le fichier Excel
  useEffect(() => {
    if (!gamme?.fichier_gamme) return;

    const loadExcel = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BASE_URL}${gamme.fichier_gamme}`);
        if (!response.ok) throw new Error("Fichier introuvable");

        const buffer = await response.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });

        setWorkbook(wb);
        setSheets(wb.SheetNames);
        setActiveSheet(wb.SheetNames[0]);
      } catch {
        setError("Impossible de lire le fichier Excel.");
      } finally {
        setLoading(false);
      }
    };

    loadExcel();
  }, [gamme]);

  // 3. Mettre à  jour le tableau quand on change d'onglet
  useEffect(() => {
    if (!workbook || !activeSheet) return;

    const ws = workbook.Sheets[activeSheet];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

    if (raw.length === 0) {
      setTableData({ headers: [], rows: [] });
      return;
    }

    const headers = raw[0].map((h) => String(h));
    const rows = raw.slice(1);
    setTableData({ headers, rows });
  }, [workbook, activeSheet]);

  // 4. Filtrer les lignes selon la recherche
  const filteredRows = tableData.rows.filter((row) =>
    row.some((cell) =>
      String(cell).toLowerCase().includes(search.toLowerCase())
    )
  );

  const filename = gamme?.fichier_gamme?.split("/").pop() ?? "fichier.xlsx";

  return (
    <DashboardLayout role="admin">
      <div className="px-4 sm:px-8 md:px-12 py-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-[#243782] text-sm font-semibold hover:underline w-fit"
          >
            ← Retour
          </button>

          <a
            href={`${BASE_URL}${gamme?.fichier_gamme}`}
            download
            className="flex items-center gap-2 bg-[#243782] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#00133B] transition-colors w-fit"
          >
            ⬇️ Télécharger
          </a>
        </div>

        <div className="app-panel">

          {/* Titre */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-800 truncate">
              📄 {filename}
            </h1>
            {gamme && (
              <p className="text-sm text-slate-400 mt-1">
                Gamme : <span className="font-medium text-slate-600">{gamme.nom}</span>
              </p>
            )}
          </div>

          {/* États */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <div className="h-16 w-full animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
              <p className="text-sm italic">Chargement du fichier...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {!loading && !error && workbook && (
            <>
              {/* Onglets feuilles */}
              {sheets.length > 1 && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {sheets.map((sheet) => (
                    <button
                      key={sheet}
                      onClick={() => { setActiveSheet(sheet); setSearch(""); }}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        activeSheet === sheet
                          ? "bg-[#243782] text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {sheet}
                    </button>
                  ))}
                </div>
              )}

              {/* Barre de recherche */}
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Rechercher dans le tableau..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    x
                  </button>
                )}
              </div>

              {/* Compteur */}
              <p className="text-xs text-slate-400 mb-3">
                {filteredRows.length} ligne{filteredRows.length !== 1 ? "s" : ""}
                {search && ` pour "${search}"`}
              </p>

              {/* Tableau */}
              {tableData.headers.length === 0 ? (
                <p className="text-sm italic text-slate-400 text-center py-10">
                  Feuille vide.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#00133B] text-white uppercase text-xs">
                      <tr>
                        {tableData.headers.map((h, i) => (
                          <th
                            key={i}
                            className="px-4 py-3 text-left font-semibold whitespace-nowrap border-b"
                          >
                            {h || `Col ${i + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={tableData.headers.length}
                            className="text-center py-10 italic text-slate-400"
                          >
                            Aucun résultat.
                          </td>
                        </tr>
                      ) : (
                        filteredRows.map((row, ri) => (
                          <tr
                            key={ri}
                            className="hover:bg-slate-50 transition-colors"
                          >
                            {tableData.headers.map((_, ci) => (
                              <td
                                key={ci}
                                className="px-4 py-2.5 text-slate-700 whitespace-nowrap"
                              >
                                {String(row[ci] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ViewFichierGamme;




