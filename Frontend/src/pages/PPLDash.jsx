import React from "react";

import AssignedProjectsDashboard from "../components/dashboard/AssignedProjectsDashboard";

const PPLDashboard = () => (
  <AssignedProjectsDashboard
    dashboardRole="ppl"
    layoutRole="ppl"
    title="Bienvenue,"
    projectsTitle="Projets assignes"
    emptyMessage="Aucun projet assigne pour le moment."
    footerText="Voir les details"
    destination={(projet) => `/ViewProjet/${projet.id}`}
    themeName="blue"
  />
);

export default PPLDashboard;
