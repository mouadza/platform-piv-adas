import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import GammeForm from "../components/GammeForm";
import { gammesAPI, configAPI, projectsAPI } from "../api/index";

const ModifierGamme = () => {
  const { id, projetId } = useParams();
  const navigate = useNavigate();

  const [projet, setProjet] = useState(null);
  const [gamme, setGamme] = useState(null);
  const [typeProcedures, setTypeProcedures] = useState([]);
  const [fonctions, setFonctions] = useState([]);
  
  const [initialForm, setInitialForm] = useState(null); 
  const userRole = localStorage.getItem("role");

  useEffect(() => {
    const load = async () => {
      try {
        const g = await gammesAPI.detail(id);
        const tpList = await configAPI.typesProcedure.list();
        const fgList = await configAPI.fonctionsGamme.list();
        const proj = await projectsAPI.detail(projetId);

        setTypeProcedures(tpList);
        setFonctions(fgList);
        setProjet(proj);
        setGamme(g);

        const tpId = tpList.find((tp) => tp.nom === g.type_procedure)?.id || "";
        const fgId = fgList.find((f) => f.nom === g.fonction)?.id || "";

        setInitialForm({
          nom: g.nom || "",
          type_procedure: tpId,
          fonction_gamme: fgId,
          boitiers: g.boitiers || "",
          pistes: g.pistes || "",
          nombre_jours: g.nombre_jours || "",
          vehicules: g.vehicule ? [String(g.vehicule.id)] : [],
        });
      } catch (error) {
        console.error("Erreur lors du chargement des données :", error);
      }
    };

    load();
  }, [id, projetId]);

  if (!initialForm) return null;
  const handleSubmit = async (formData) => {
    await gammesAPI.update(id, formData);
    navigate(-1);
  };

  return (
    <DashboardLayout role={userRole}>
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="text-[#243782] text-sm font-semibold hover:underline"
        >
          ← Retour
        </button>
      </div>

      <GammeForm
        title="Modifier la gamme"
        isEditing={true}   
        projet={projet}
        vehicules={projet?.vehicules || []} 
        typeProcedures={typeProcedures}
        fonctions={fonctions}
        initialForm={initialForm}
        existingFiles={{
          fichier_gamme: gamme?.original_filename,
          fichier_associe: gamme?.original_associe_filename,
        }}
        onSubmit={handleSubmit}
        isPPL={userRole === "ppl"}
      />
    </DashboardLayout>
  );
};

export default ModifierGamme;

