import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/DashboardLayout";
import api from "../api";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";

import {
  Users,
  FolderKanban,
  FileSpreadsheet,
  Activity,
  TrendingUp,
} from "lucide-react";

const AdminDash = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await api.get("/admin_config/admindash/");
      setDashboard(res.data);
    } catch (err) {
      console.error("Erreur dashboard admin :", err);
      setError("Impossible de charger le tableau de bord.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  

  if (loading) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[70vh]">
          <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout role="admin">
        <div className="flex items-center justify-center min-h-[70vh] text-red-600 font-semibold">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  const {
    kpis,
    repartition_cotations_by_project,
    recent_gammes,
    recent_validations,
  } = dashboard;

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Utilisateurs"
            value={kpis.total_users}
            icon={<Users size={20} />}
            color="blue"
          />

          <StatCard
            title="Projets"
            value={kpis.total_projets}
            icon={<FolderKanban size={20} />}
            color="purple"
          />

          <StatCard
            title="Gammes"
            value={kpis.total_gammes}
            icon={<FileSpreadsheet size={20} />}
            color="slate"
          />

          <StatCard
            title="Gammes commencées"
            value={kpis.gammes_started}
            subValue={`${kpis.taux_demarrage_validation}% démarrage`}
            icon={<Activity size={20} />}
            color="sky"
          />
        </div>

        <div className="space-y-4">
          <CotationsByProjectChart
            data={repartition_cotations_by_project || []}
          />

        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <RecentGammes items={recent_gammes || []} />
          <RecentValidations items={recent_validations || []} />
        </div>
      </div>
    </DashboardLayout>
  );
};

const colorMap = {
  blue: {
    card: "border-blue-100 bg-blue-50",
    icon: "bg-blue-100 text-blue-700",
    text: "text-blue-700",
  },
  purple: {
    card: "border-purple-100 bg-purple-50",
    icon: "bg-purple-100 text-purple-700",
    text: "text-purple-700",
  },
  slate: {
    card: "border-slate-100 bg-slate-50",
    icon: "bg-slate-100 text-slate-700",
    text: "text-slate-700",
  },
  sky: {
    card: "border-sky-100 bg-sky-50",
    icon: "bg-sky-100 text-sky-700",
    text: "text-sky-700",
  },
};

const CotationsByProjectChart = ({ data }) => {
  const chartData = data.map((item) => ({
    ...item,
    projectLabel:
      item.project_name && item.project_name.length > 18
        ? `${item.project_name.slice(0, 18)}...`
        : item.project_name,
  }));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-1">
        Répartition des cotations par projet
      </h2>

      <p className="text-sm text-slate-500 mb-4">
        Comparaison des cotations OK, NOK, NOK Mineur et à traiter par projet.
      </p>

      {!chartData || chartData.length === 0 ? (
        <EmptyChart message="Aucune cotation disponible par projet." />
      ) : (
        <div className="w-full overflow-x-auto">
          <div
            style={{
              minWidth: Math.max(chartData.length * 160, 900),
              height: 380,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 10,
                  bottom: 40,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="projectLabel"
                  tick={{ fontSize: 11 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={70}
                />

                <YAxis allowDecimals={false} />

                <Tooltip
                  formatter={(value, name) => {
                    const labels = {
                      OK: "OK",
                      NOK: "NOK",
                      NOK_mineur: "NOK Mineur",
                      A_traiter: "À traiter",
                    };

                    return [value, labels[name] || name];
                  }}
                  labelFormatter={(label, payload) => {
                    const original = payload?.[0]?.payload?.project_name;
                    return original || label;
                  }}
                />

                <Legend />

                <Bar
                  dataKey="OK"
                  name="OK"
                  fill="#2E7D32"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  dataKey="NOK"
                  name="NOK"
                  fill="#C62828"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  dataKey="NOK_mineur"
                  name="NOK Mineur"
                  fill="#F9A825"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  dataKey="A_traiter"
                  name="À traiter"
                  fill="#0284C7"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon, color = "slate" }) => {
  const c = colorMap[color] || colorMap.slate;

  return (
    <div className={`border rounded-2xl p-5 ${c.card}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-600">
            {title}
          </h3>

          <div className={`mt-3 text-3xl font-extrabold ${c.text}`}>
            {value ?? 0}
          </div>

          {subValue && (
            <p className="text-xs text-slate-500 mt-1">
              {subValue}
            </p>
          )}
        </div>

        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.icon}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
};

const RecentGammes = ({ items }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <h2 className="text-xl font-bold text-slate-800 mb-4">
      Dernières gammes importées
    </h2>

    {items.length === 0 ? (
      <p className="text-sm text-slate-400">
        Aucune gamme importée.
      </p>
    ) : (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {item.nom}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Projet : {item.projet}
                </p>

                {item.vehicule && (
                  <p className="text-xs text-slate-400 mt-1">
                    Véhicule : {item.vehicule}
                  </p>
                )}
              </div>

              <span className="text-[10px] text-slate-400 whitespace-nowrap">
                {item.created_at
                  ? new Date(item.created_at).toLocaleDateString("fr-FR")
                  : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const RecentValidations = ({ items }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <h2 className="text-xl font-bold text-slate-800 mb-4">
      Dernières validations
    </h2>

    {items.length === 0 ? (
      <p className="text-sm text-slate-400">
        Aucune validation enregistrée.
      </p>
    ) : (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {item.step_code}
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  EV : {item.ev_code || "—"} · Gamme : {item.gamme}
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  Par : {item.user}
                </p>
              </div>

              <span className="text-xs font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 h-fit">
                {item.cotation}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);





const EmptyChart = ({ message }) => (
  <div className="h-[260px] flex items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
    {message}
  </div>
);

export default AdminDash;
