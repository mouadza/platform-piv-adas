import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import GammeForm from "../components/GammeForm";
import { gammesAPI, configAPI, projectsAPI } from "../api/index";

const CreerGamme = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [projet, setProjet] = useState(null);
  const [typeProcedures, setTypeProcedures] = useState([]);
  const [fonctions, setFonctions] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const userRole = localStorage.getItem("role");

  useEffect(() => {
    const load = async () => {
      const pro = await projectsAPI.detail(id);
      setProjet(pro);
      setTypeProcedures(await configAPI.typesProcedure.list());
      setFonctions(await configAPI.fonctionsGamme.list());
      setVehicules(pro.vehicules || []);
    };
    load();
  }, [id]);

  // GammeForm already builds and sends a FormData - receive it directly
  const handleSubmit = async (formData) => {
    try {
      await gammesAPI.import(formData);
      navigate(`/ViewProjet/${id}`);
    } catch (err) {
      console.error("Erreur message:", err.message);   // ← vient de ApiError.message
      console.error("Erreur data:", err.data);          // ← vient de ApiError.data
      console.error("Erreur status:", err.status);      // ← vient de ApiError.status
      alert("Erreur: " + err.message);
    }
  };

  return (
    <DashboardLayout role={userRole}>
      <button
        onClick={() => navigate(-1)}
        className="text-[#243782] text-sm font-semibold hover:underline"
      >
        ← Retour
      </button>

      <GammeForm
        title="Créer une gamme"
        projet={projet}
        typeProcedures={typeProcedures}
        fonctions={fonctions}
        vehicules={vehicules}
        initialForm={{
          nom: "",
          type_procedure: "",
          fonction_gamme: "",
          boitiers: "",
          nombre_jours: "",
          pistes: "",
        }}
        onSubmit={handleSubmit}
        isPPL={userRole === "ppl"}
      />
    </DashboardLayout>
  );
};

export default CreerGamme;

