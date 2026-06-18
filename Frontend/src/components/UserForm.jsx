// src/components/UserForm.jsx
import React from "react";
import { Mail, User } from "lucide-react";

const UserForm = ({ formData, handleChange, emailFeedback }) => {
  return (
    <form className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          Nom d'utilisateur
        </label>

        <div className="relative">
          <User
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="Nom d'utilisateur"
            className="block w-full border border-slate-300 pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-1">
          Email
        </label>

        <div className="relative">
          <Mail
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="block w-full border border-slate-300 pl-10 pr-3 py-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
          />
        </div>

        {emailFeedback}
      </div>
    </form>
  );
};

export default UserForm;
