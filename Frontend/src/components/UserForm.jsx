// src/components/UserForm.jsx
import React from "react";
import { Mail, User } from "lucide-react";

const UserForm = ({ formData, handleChange, emailFeedback }) => {
  return (
    <form className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
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
            className="field-control pl-10"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-bold text-slate-700">
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
            className="field-control pl-10"
          />
        </div>

        {emailFeedback}
      </div>
    </form>
  );
};

export default UserForm;
