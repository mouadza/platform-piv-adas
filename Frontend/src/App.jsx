import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import useAutoLogout from "./hooks/useAutoLogout";

import Login from "./pages/LoginPage";
import AdminDash from "./pages/AdminDash";
import AuditLogsPage from "./pages/AuditLogsPage";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

import GestionCompte from "./pages/GestionCompte";
import EspaceUser from "./pages/EspaceUser";
import ListeUtilisateurs from "./pages/ListeUtilisateurs";
import ModifierUtilisateur from "./pages/ModifierUtilisateur";

import CreerProjet from "./pages/GestionProjet";
import ListeProjets from "./pages/ListeProjet";
import ModifierProjet from "./pages/ModifierProjet";
import ViewProjet from "./pages/ViewProjet";
import CreerGamme from "./pages/CreerGamme";
import ViewGamme from "./pages/ViewGamme";

import PPLDashboard from "./pages/PPLDash";
import ImportGammePage from "./pages/ImportGamme";
import ListeGammes from "./pages/ListeGammes";

import ValideurDashboard from "./pages/ValideurDash";
import ValidationPage from "./pages/ValidationPage";
import GammeImporteValideur from "./pages/GammeImporteValideur";

import VisualiserExcel from "./components/VisualiserExcel";

import Configurations from "./pages/Configurations";
import ModifierGamme from "./pages/ModifierGamme";
import ViewFichierGamme from "./pages/ViewFichierGamme";
import ChoixEspace from "./pages/ChoixEspace";
import ValidationReportPage from "./pages/ValidationReportPage";
import { clearAuthSession } from "./utils/authStorage";

function Logout() {
  clearAuthSession();
  return <Navigate to="/login" replace />;
}

function App() {
  useAutoLogout();
  return (
    <Routes>

        {/* ==================== PUBLIC ==================== */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />        
        <Route path="/validation-report/:gammeId" element={
          <ProtectedRoute allowedRoles={["ADMIN", "PPL", "VALIDEUR", "VISITEUR"]}>
            <ValidationReportPage />
          </ProtectedRoute>
        } />


        {/* Semi-public: authenticated only, no role restriction */}
        <Route path="/choix-espace" element={
          <ProtectedRoute>
            <ChoixEspace />
          </ProtectedRoute>
        } />

        <Route path="/GestionCompte" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <GestionCompte />
          </ProtectedRoute>
        } />

        <Route path="/visualiser/:gammeId" element={
          <ProtectedRoute>
            <VisualiserExcel />
          </ProtectedRoute>
        } />

        {/* ==================== ADMIN ==================== */}
        <Route path="/AdminDash" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AdminDash />
          </ProtectedRoute>
        } />

        <Route path="/listeUser" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ListeUtilisateurs />
          </ProtectedRoute>
        } />

        <Route path="/ModifUser" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ModifierUtilisateur />
          </ProtectedRoute>
        } />

        <Route path="/CreerProjet" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <CreerProjet />
          </ProtectedRoute>
        } />

        <Route path="/Modifprojet/:id" element={
          <ProtectedRoute allowedRoles={["ADMIN", "PPL"]}>
            <ModifierProjet />
          </ProtectedRoute>
        } />

        <Route path="/listeProjet" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <ListeProjets />
          </ProtectedRoute>
        } />

        <Route path="/ViewProjet/:id" element={
          <ProtectedRoute allowedRoles={["ADMIN", "PPL"]}>
            <ViewProjet />
          </ProtectedRoute>
        } />

        <Route path="/gamme/:projetId/:id/" element={
          <ProtectedRoute allowedRoles={["ADMIN", "PPL"]}>
            <ViewGamme />
          </ProtectedRoute>
        } />

        <Route path="/gamme/:projetId/:id/edit" element={
          <ProtectedRoute allowedRoles={["ADMIN", "PPL"]}>
            <ModifierGamme />
          </ProtectedRoute>
        } />

        <Route path="/projets/:projetId/gammes/:id/fichier" element={
          <ProtectedRoute allowedRoles={["ADMIN", "PPL"]}>
            <ViewFichierGamme />
          </ProtectedRoute>
        } />

        <Route path="/CreerGamme/:id" element={
          <ProtectedRoute allowedRoles={["ADMIN", "PPL"]}>
            <CreerGamme />
          </ProtectedRoute>
        } />

        <Route path="/listegammes" element={
          <ProtectedRoute allowedRoles={["ADMIN", "PPL"]}>
            <ListeGammes />
          </ProtectedRoute>
        } />

        <Route path="/configurations" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <Configurations />
          </ProtectedRoute>
        } />

        <Route path="/audit-logs" element={
          <ProtectedRoute allowedRoles={["ADMIN"]}>
            <AuditLogsPage />
          </ProtectedRoute>
        } />

        {/* ==================== PPL ==================== */}
        <Route path="/ppldash" element={
          <ProtectedRoute allowedRoles={["PPL"]}>
            <PPLDashboard />
          </ProtectedRoute>
        } />

        <Route path="/ImportGamme/:id" element={
          <ProtectedRoute allowedRoles={["PPL", "ADMIN"]}>
            <ImportGammePage />
          </ProtectedRoute>
        } />

        <Route path="/valideurdash" element={
          <ProtectedRoute allowedRoles={["VALIDEUR", "ADMIN"]}>
            <ValideurDashboard />
          </ProtectedRoute>
        } />

        <Route path="/validation/:gammeId" element={
          <ProtectedRoute allowedRoles={["VALIDEUR", "PPL", "ADMIN", "VISITEUR"]}>
            <ValidationPage />
          </ProtectedRoute>
        } />

        <Route path="/GammeImporteValideur/:id" element={
          <ProtectedRoute allowedRoles={["VALIDEUR", "ADMIN"]}>
            <GammeImporteValideur />
          </ProtectedRoute>
        } />

        <Route path="/EspaceUser" element={
          <ProtectedRoute allowedRoles={["VISITEUR"]}>
            <EspaceUser />
          </ProtectedRoute>
        } />

        <Route path="/logout" element={<Logout />} />
        <Route path="*" element={<NotFound />} />

    </Routes>
  );
}

export default App;
