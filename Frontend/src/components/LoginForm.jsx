import React, { useState } from "react";
import { Lock, Mail, RotateCcw, ShieldCheck } from "lucide-react";
import { authAPI } from "../api/index";
import { saveAuthTokens } from "../utils/authStorage";

const LoginForm = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState("otp");
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const getErrorMessage = (err, fallback) =>
    err?.response?.data?.detail ||
    err?.response?.data?.error ||
    err?.message ||
    fallback;

  const handleRequestOtp = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email obligatoire");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await authAPI.requestOtp(normalizedEmail);

      setEmail(normalizedEmail);
      setStep("code");
      setMessage(res?.message || "Code OTP envoye. Il expire dans 10 minutes.");
    } catch (err) {
      setError(getErrorMessage(err, "Impossible d'envoyer le code OTP"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!code.trim()) {
      setError("Code OTP obligatoire");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await authAPI.verifyOtp({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });

      saveAuthTokens(res);

      onLoginSuccess(res.access);
    } catch (err) {
      setError(getErrorMessage(err, "Code OTP invalide ou expire"));
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    if (!email.trim() || !password) {
      setError("Email et mot de passe obligatoires");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const res = await authAPI.adminPasswordLogin({
        email: email.trim().toLowerCase(),
        password,
      });

      saveAuthTokens(res);

      onLoginSuccess(res.access);
    } catch (err) {
      setError(getErrorMessage(err, "Connexion admin refusee"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (authMode === "admin") {
      handleAdminLogin();
      return;
    }

    if (step === "email") {
      handleRequestOtp();
      return;
    }

    handleVerifyOtp();
  };

  const resetEmailStep = () => {
    setStep("email");
    setCode("");
    setError("");
    setMessage("");
  };

  const switchAuthMode = (mode) => {
    setAuthMode(mode);
    setStep("email");
    setCode("");
    setPassword("");
    setError("");
    setMessage("");
  };
  return (
    <form
      onSubmit={handleSubmit}
      className="w-full px-4 sm:px-6 space-y-4 sm:space-y-6"
    >
      <div className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-white/10 p-1">
          <button
            type="button"
            onClick={() => switchAuthMode("otp")}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              authMode === "otp"
                ? "bg-white text-blue-700"
                : "text-white hover:bg-white/10"
            }`}
          >
            Utilisateur OTP
          </button>

          <button
            type="button"
            onClick={() => switchAuthMode("admin")}
            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
              authMode === "admin"
                ? "bg-white text-blue-700"
                : "text-white hover:bg-white/10"
            }`}
          >
            Admin
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm animate-pulse">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm">
            {message}
          </div>
        )}

        <div>
          <label
            htmlFor="email"
            className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5 sm:mb-2"
          >
            Email Stellantis
          </label>
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={(authMode === "otp" && step === "code") || loading}
              placeholder="prenom.nom@stellantis.com"
              autoComplete="email"
              spellCheck="false"
              required
              className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg text-black bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-slate-100"
            />
          </div>
        </div>

        {authMode === "admin" && (
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5 sm:mb-2"
            >
              Mot de passe admin
            </label>
            <div className="relative">
              <Lock
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="password"
                id="admin-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mot de passe"
                autoComplete="current-password"
                required={authMode === "admin"}
                className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg text-black bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>
        )}

        {authMode === "otp" && step === "code" && (
          <div>
            <label
              htmlFor="otp-code"
              className="block text-xs sm:text-sm font-medium text-gray-200 mb-1.5 sm:mb-2"
            >
              Code OTP
            </label>
            <div className="relative">
              <ShieldCheck
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                type="text"
                id="otp-code"
                value={code}
                onChange={(event) =>
                  setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                autoComplete="one-time-code"
                enterKeyHint="done"
                required={authMode === "otp" && step === "code"}
                className="w-full pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg text-black bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all tracking-[0.35em]"
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg text-sm sm:text-base font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          {loading ? (
            <>
              <span className="inline-block animate-spin mr-2">...</span>
              Traitement...
            </>
          ) : authMode === "admin" ? (
            "Connexion admin"
          ) : step === "email" ? (
            "Recevoir le code OTP"
          ) : (
            "Verifier le code"
          )}
        </button>

        {authMode === "otp" && step === "code" && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-60 transition-colors"
            >
              <RotateCcw size={15} />
              Renvoyer
            </button>

            <button
              type="button"
              onClick={resetEmailStep}
              disabled={loading}
              className="py-2 px-3 rounded-lg text-xs sm:text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 transition-colors"
            >
              Changer email
            </button>
          </div>
        )}
      </div>
    </form>
  );
};

export default LoginForm;
