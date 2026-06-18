import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import ProjetForm from "../components/ProjetForm";
import { usersAPI, projectsAPI, configAPI } from "../api/index";

const CreerProjet = () => {
  const navigate = useNavigate();

  const [project, setProject] = useState({
    nom: "",
    vehicules: "",
    architecture: "",
    motorisations: []
  });
  const [users, setUsers] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [architectures, setArchitectures] = useState([]);
  const [motorisations, setMotorisations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [affectations, setAffectations] = useState({
    PPL: [],
    VALIDEUR: [],
    VISITEUR: [],
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [u, arch, mot] = await Promise.all([
          usersAPI.list(),
          configAPI.architectures.list(),
          configAPI.motorisations.list(),
        ]);

        setUsers(u.filter((user) => user.username !== "admin"));
        setArchitectures(arch);
        setMotorisations(mot);
      } catch (error) {
        console.error("Erreur chargement création projet:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const handleSubmit = async () => {
    const affectationsPayload = [];

    Object.entries(affectations).forEach(([role, ids]) => {
      ids.forEach((id) => {
        affectationsPayload.push({
          user: id,
          role,
        });
      });
    });

    const payload = {
      nom_projet: project.nom,
      nombre_vehicules: vehicules.length,
      architectures_ids: project.architecture ? [Number(project.architecture)] : [],
      motorisations_ids: project.motorisations?.map(Number) || [],
      affectations: affectationsPayload,
      vehicules: vehicules,
    };

    try {
      await projectsAPI.create(payload);
      navigate("/listeprojet");
    } catch (e) {
      alert(e.data?.detail || e.message || "Erreur lors de l'enregistrement.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="p-10 text-center text-slate-400 italic">
          Chargement...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="admin">
      <ProjetForm
        title="Créer un nouveau projet"
        submitLabel="Créer Projet"
        project={project}
        setProject={setProject}
        users={users}
        architectures={architectures}
        motorisations={motorisations}
        affectations={affectations}
        setAffectations={setAffectations}
        vehicules={vehicules}
        setVehicules={setVehicules}
        onSubmit={handleSubmit}
        onCancel={() => navigate(-1)}
      />
    </DashboardLayout>
  );
};

export default CreerProjet;
