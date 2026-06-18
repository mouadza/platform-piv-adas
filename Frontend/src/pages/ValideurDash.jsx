import React from "react";

import AssignedProjectsDashboard from "../components/dashboard/AssignedProjectsDashboard";

const ValideurDashboard = () => (
  <AssignedProjectsDashboard
    dashboardRole="valideur"
    layoutRole={localStorage.getItem("role") || "valideur"}
    title="Bienvenue,"
    subtitle="Espace de validation et d'approbation de gammes"
    projectsTitle="Projets a valider"
    emptyMessage="Aucun projet en attente de validation."
    footerText="Verifier la gamme"
    destination={(projet) => `/GammeImporteValideur/${projet.id}`}
    themeName="amber"
  />
);

export default ValideurDashboard;
