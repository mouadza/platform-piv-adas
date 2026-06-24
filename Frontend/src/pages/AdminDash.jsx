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
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Users,
  FolderKanban,
  FileSpreadsheet,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Gauge,
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
    evolution,
    global_cotations,
    project_progress,
    risk_projects,
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Taux OK global"
            value={`${kpis.global_ok_rate || 0}%`}
            subValue="Dernieres cotations"
            icon={<CheckCircle2 size={20} />}
            color="green"
          />

          <StatCard
            title="Taux NOK global"
            value={`${kpis.global_nok_rate || 0}%`}
            subValue="NOK + NOK Mineur"
            icon={<AlertTriangle size={20} />}
            color="amber"
          />

          <StatCard
            title="Cotations suivies"
            value={kpis.total_current_cotations || 0}
            subValue="Etat courant"
            icon={<Gauge size={20} />}
            color="indigo"
          />

          <StatCard
            title="Projets a risque"
            value={kpis.projects_at_risk || 0}
            subValue="NOK, a traiter ou non demarres"
            icon={<TrendingUp size={20} />}
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <GlobalCotationsChart data={global_cotations || {}} />
          <ValidationEvolutionChart data={evolution || []} />
        </div>

        <div className="space-y-4">
          <ProjectProgressChart data={project_progress || []} />

          <CotationsByProjectChart
            data={repartition_cotations_by_project || []}
          />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <RiskProjects items={risk_projects || []} />
          <RecentGammes items={recent_gammes || []} />
        </div>

        <div className="grid grid-cols-1 gap-4">
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
  green: {
    card: "border-emerald-100 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-700",
    text: "text-emerald-700",
  },
  amber: {
    card: "border-amber-100 bg-amber-50",
    icon: "bg-amber-100 text-amber-700",
    text: "text-amber-700",
  },
  indigo: {
    card: "border-indigo-100 bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-700",
    text: "text-indigo-700",
  },
  red: {
    card: "border-red-100 bg-red-50",
    icon: "bg-red-100 text-red-700",
    text: "text-red-700",
  },
};

const COTATION_COLORS = {
  OK: "#16a34a",
  NOK: "#dc2626",
  NOK_mineur: "#f97316",
  A_traiter: "#2563eb",
};

const cotationLabels = {
  OK: "OK",
  NOK: "NOK",
  NOK_mineur: "NOK Mineur",
  A_traiter: "A traiter",
};

const formatProjectLabel = (name, size = 18) => {
  if (!name) return "-";

  return name.length > size ? `${name.slice(0, size)}...` : name;
};

const GlobalCotationsChart = ({ data }) => {
  const chartData = ["OK", "NOK", "NOK_mineur", "A_traiter"]
    .map((key) => ({
      key,
      name: cotationLabels[key],
      value: Number(data?.[key] || 0),
    }))
    .filter((item) => item.value > 0);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-1">
        Distribution globale des cotations
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Vue courante basee sur la derniere cotation de chaque step.
      </p>

      {chartData.length === 0 ? (
        <EmptyChart message="Aucune cotation disponible." />
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={110}
                paddingAngle={3}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={COTATION_COLORS[entry.key]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value, name) => [value, name]} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

const ValidationEvolutionChart = ({ data }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <h2 className="text-xl font-bold text-slate-800 mb-1">
      Evolution mensuelle des validations
    </h2>
    <p className="text-sm text-slate-500 mb-4">
      Activite de validation par mois, toutes cotations confondues.
    </p>

    {!data || data.length === 0 ? (
      <EmptyChart message="Aucune evolution disponible." />
    ) : (
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 20, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="totalValidations" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="total"
              name="Validations"
              stroke="#2563eb"
              fill="url(#totalValidations)"
              strokeWidth={3}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
  </div>
);

const ProjectProgressChart = ({ data }) => {
  const chartData = (data || [])
    .filter((item) => item.total_gammes > 0)
    .map((item) => ({
      ...item,
      projectLabel: formatProjectLabel(item.project_name, 22),
    }))
    .sort((a, b) => b.advancement_percent - a.advancement_percent);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h2 className="text-xl font-bold text-slate-800 mb-1">
        Avancement validation par projet
      </h2>
      <p className="text-sm text-slate-500 mb-4">
        Pourcentage de gammes ayant au moins une validation enregistree.
      </p>

      {chartData.length === 0 ? (
        <EmptyChart message="Aucun projet avec gammes disponible." />
      ) : (
        <div className="w-full overflow-x-auto">
          <div
            style={{
              minWidth: Math.max(chartData.length * 140, 900),
              height: 340,
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
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
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "advancement_percent") {
                      return [`${value}%`, "Avancement"];
                    }

                    return [value, name];
                  }}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.project_name || label
                  }
                />
                <Bar
                  dataKey="advancement_percent"
                  name="Avancement"
                  fill="#2563eb"
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

const CotationsByProjectChart = ({ data }) => {
  const chartData = data.map((item) => ({
    ...item,
    projectLabel: formatProjectLabel(item.project_name),
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

const RiskProjects = ({ items }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
    <h2 className="text-xl font-bold text-slate-800 mb-1">
      Projets a surveiller
    </h2>

    <p className="text-sm text-slate-500 mb-4">
      Priorisation selon NOK, NOK Mineur, elements a traiter et gammes non
      demarrees.
    </p>

    {items.length === 0 ? (
      <p className="text-sm text-slate-400">
        Aucun projet a risque identifie.
      </p>
    ) : (
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.project_id}
            className="rounded-xl border border-slate-100 bg-slate-50 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-slate-800">
                  {item.project_name}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {item.gammes_started}/{item.total_gammes} gammes demarrees
                </p>
              </div>

              <span className="rounded-lg border border-red-100 bg-red-50 px-2.5 py-1 text-xs font-extrabold text-red-700">
                Score {item.risk_score}
              </span>
            </div>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(0, Number(item.advancement_percent || 0))
                  )}%`,
                }}
              />
            </div>

            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] font-bold">
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700">
                OK {item.OK}
              </span>
              <span className="rounded-md bg-red-50 px-2 py-1 text-red-700">
                NOK {item.NOK}
              </span>
              <span className="rounded-md bg-orange-50 px-2 py-1 text-orange-700">
                Mineur {item.NOK_mineur}
              </span>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700">
                A traiter {item.A_traiter}
              </span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

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
