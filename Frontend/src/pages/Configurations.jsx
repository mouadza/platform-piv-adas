import React, { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { configAPI } from '../api/index';
import { ConfigCard, RoleConfigCard } from '../components/configurations/ConfigurationCards';

/* ======================================================
   PAGE
====================================================== */
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
      <div className="rounded-3xl bg-white px-4 md:px-8 p-6">
        <div className="mb-8 border-b pb-3">
          <h1 className="text-2xl font-bold text-gray-900">
            Paramétrages
          </h1>
          <p className="text-sm text-gray-500">
            Gestion des listes de référence
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <RoleConfigCard roles={roles} reload={loadAll} />

          <ConfigCard
            title="Architectures"
            description="Architectures projet"
            items={architectures}
            fieldName="nom"
            onCreate={(d) =>
              configAPI.architectures.create(d).then(loadAll)
            }
            onUpdate={(id, d) =>
              configAPI.architectures.update(id, d).then(loadAll)
            }
            onDelete={(id) =>
              configAPI.architectures.delete(id).then(loadAll)
            }
          />

          <ConfigCard
            title="Motorisations"
            description="Types de motorisation"
            items={motorisations}
            fieldName="nom"
            onCreate={(d) =>
              configAPI.motorisations.create(d).then(loadAll)
            }
            onUpdate={(id, d) =>
              configAPI.motorisations.update(id, d).then(loadAll)
            }
            onDelete={(id) =>
              configAPI.motorisations.delete(id).then(loadAll)
            }
          />

          <ConfigCard
            title="Fonctions de gamme"
            description="Fonctions utilisées dans les gammes"
            items={fonctions}
            fieldName="nom"
            onCreate={(d) =>
              configAPI.fonctionsGamme.create(d).then(loadAll)
            }
            onUpdate={(id, d) =>
              configAPI.fonctionsGamme.update(id, d).then(loadAll)
            }
            onDelete={(id) =>
              configAPI.fonctionsGamme.delete(id).then(loadAll)
            }
          />

          <ConfigCard
            title="Types de procédure"
            description="Procédures associées"
            items={procedures}
            fieldName="nom"
            onCreate={(d) =>
              configAPI.typesProcedure.create(d).then(loadAll)
            }
            onUpdate={(id, d) =>
              configAPI.typesProcedure.update(id, d).then(loadAll)
            }
            onDelete={(id) =>
              configAPI.typesProcedure.delete(id).then(loadAll)
            }
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Configurations;