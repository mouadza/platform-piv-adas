import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] px-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wide text-[#243782]">
          Page introuvable
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">
          404
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          La page demandee n'existe pas ou n'est plus disponible.
        </p>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-[#243782] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#00133B]"
        >
          <ArrowLeft size={16} />
          Retour
        </button>
      </div>
    </div>
  );
}

export default NotFound;

