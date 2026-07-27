import React, { useEffect, useState } from "react";

import DashboardLayout from "../components/DashboardLayout";
import { configAPI } from "../api/index";
import {
  ConfigCard,
  RoleConfigCard,
} from "../components/configurations/ConfigurationCards";

const Configurations = () => {
  const [roles, setRoles] = useState([]);
  const [architectures, setArchitectures] = useState([]);
  const [motorisations, setMotorisations] = useState([]);
  const [fonctions, setFonctions] = useState([]);
  const [procedures, setProcedures] = useState([]);

  const loadAll = async () => {
    setRoles(await configAPI.roles.list());
    setArchitectures(await configAPI.architectures.list());
    setMotorisations(await configAPI.motorisations.list());
    setFonctions(await configAPI.fonctionsGamme.list());
    setProcedures(await configAPI.typesProcedure.list());
  };

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <DashboardLayout role="admin" activePath="/configurations">
      <div className="space-y-5">
        <section className="app-panel">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Administration
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Parametrages
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Gestion des listes de reference utilisees dans les gammes.
          </p>
        </section>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <RoleConfigCard roles={roles} reload={loadAll} />

          <ConfigCard
            title="Architectures"
            description="Architectures projet"
            items={architectures}
            fieldName="nom"
            onCreate={(data) => configAPI.architectures.create(data).then(loadAll)}
            onUpdate={(id, data) =>
              configAPI.architectures.update(id, data).then(loadAll)
            }
            onDelete={(id) => configAPI.architectures.delete(id).then(loadAll)}
          />

          <ConfigCard
            title="Motorisations"
            description="Types de motorisation"
            items={motorisations}
            fieldName="nom"
            onCreate={(data) => configAPI.motorisations.create(data).then(loadAll)}
            onUpdate={(id, data) =>
              configAPI.motorisations.update(id, data).then(loadAll)
            }
            onDelete={(id) => configAPI.motorisations.delete(id).then(loadAll)}
          />

          <ConfigCard
            title="Fonctions de gamme"
            description="Fonctions utilisees dans les gammes"
            items={fonctions}
            fieldName="nom"
            onCreate={(data) => configAPI.fonctionsGamme.create(data).then(loadAll)}
            onUpdate={(id, data) =>
              configAPI.fonctionsGamme.update(id, data).then(loadAll)
            }
            onDelete={(id) => configAPI.fonctionsGamme.delete(id).then(loadAll)}
          />

          <ConfigCard
            title="Types de procedure"
            description="Procedures associees"
            items={procedures}
            fieldName="nom"
            onCreate={(data) => configAPI.typesProcedure.create(data).then(loadAll)}
            onUpdate={(id, data) =>
              configAPI.typesProcedure.update(id, data).then(loadAll)
            }
            onDelete={(id) => configAPI.typesProcedure.delete(id).then(loadAll)}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Configurations;
