import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../components/DashboardLayout";
import ProjetForm from "../components/ProjetForm";
import { usersAPI, projectsAPI, configAPI } from "../api/index";

const ModifierProjet = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState({
    nom: "",
    architecture: "",
    motorisations: []
  });

  const [users, setUsers] = useState([]);
  const [vehicules, setVehicules] = useState([]);
  const [architectures, setArchitectures] = useState([]);
  const [motorisations, setMotorisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const userRole = localStorage.getItem("role");

  const [affectations, setAffectations] = useState({
    PPL: [],
    VALIDEUR: [],
    VISITEUR: [],
  });

  const normalizeRole = (role) => {
    if (!role) return "";
    const value = String(role).toUpperCase();

    if (value === "PPL") return "PPL";
    if (value === "VALIDEUR") return "VALIDEUR";
    if (value === "VISITEUR" || value === "VISITOR") return "VISITEUR";

    return value;
  };

  const resolveUserId = (aff, allUsers) => {
    if (typeof aff.user === "number") return aff.user;
    if (aff.user_id) return aff.user_id;

    if (typeof aff.user === "string") {
      const found = allUsers.find(
        (u) => u.username.toLowerCase() === aff.user.toLowerCase()
      );
      return found?.id;
    }

    if (aff.user?.id) return aff.user.id;

    return null;
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [u, pro, arch, mot] = await Promise.all([
          usersAPI.list(),
          projectsAPI.detail(id),
          configAPI.architectures.list(),
          configAPI.motorisations.list(),
        ]);

        const filteredUsers = u.filter((user) => user.username !== "admin");

        setUsers(filteredUsers);
        setArchitectures(arch);
        setMotorisations(mot);
        
        const architectureId =
          pro.architectures_ids?.[0] ||
          arch.find((a) => a.nom === pro.architectures?.[0])?.id ||
          "";

        const motorisationsIds =
          pro.motorisations_ids ||
          pro.motorisations?.map((nom) =>
            mot.find((m) => m.nom === nom)?.id
          ).filter(Boolean) ||
          [];

        setProject({
          nom: pro.nom_projet || "",
          architecture: architectureId,
          motorisations: motorisationsIds,
        });

        setVehicules(pro.vehicules || []);

        const initialAffectations = {
          PPL: [],
          VALIDEUR: [],
          VISITEUR: [],
        };

        (pro.affectations || []).forEach((aff) => {
          const role = normalizeRole(
            aff.role_label || aff.role_access || aff.role?.code || aff.role
          );

          const userId = resolveUserId(aff, filteredUsers);

          if (userId && initialAffectations[role]) {
            initialAffectations[role].push(userId);
          }
        });

        setAffectations(initialAffectations);

      } catch (error) {
        console.error("Erreur chargement modification projet:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchAll();
  }, [id]);

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
      architectures_ids: project.architecture
        ? [Number(project.architecture)]
        : [],
      motorisations_ids: project.motorisations?.map(Number) || [],
      affectations: affectationsPayload,
      vehicules: vehicules,
    };

    try {
      await projectsAPI.update(id, payload);
      navigate("/listeprojet");
    } catch (e) {
      alert(e?.response?.data?.detail || "Erreur lors de la modification.");
    }
  };

  if (loading) {
    return (
      <DashboardLayout role={userRole}>
        <div className="p-10 text-center text-slate-400 italic">
          Chargement...
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role={userRole}>
      <ProjetForm
        title="Modifier le projet"
        subtitle={project.nom}
        submitLabel="Enregistrer"
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

export default ModifierProjet;
