"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useProfileStore } from "@/store/useProfileStore";
import { X, User, Mail, Shield, Check, Save, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ProfileModal: React.FC = () => {
  const router = useRouter();
  const { profile, isProfileModalOpen, setProfileModalOpen, setAuthenticated, updateProfile } = useProfileStore();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [role, setRole] = useState(profile.role);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isProfileModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({ name, email, role });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setProfileModalOpen(false);
    }, 900);
  };

  const handleLogout = () => {
    setAuthenticated(false);
    if (typeof window !== "undefined") {
      localStorage.removeItem("satquery_anonymous_session_id");
    }
    setProfileModalOpen(false);
    router.replace("/login");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      {/* Modal Card */}
      <div className="liquid-glass relative w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200/90 bg-white/95 text-slate-900">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setProfileModalOpen(false)}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-800 p-1.5 rounded-full transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Avatar */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-serif text-xl font-bold shadow-md">
            {name ? name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <h2 className="font-serif text-xl text-slate-900 tracking-wide font-semibold">
              User Profile & Settings
            </h2>
            <p className="text-xs text-slate-500">
              Manage your analyst identity and notification preferences
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Jane Smith"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/40 font-medium transition-all"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-700 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@organization.org"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/40 font-medium transition-all"
            />
          </div>

          {/* Role / Org Field */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-700 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-slate-500" />
              <span>Role / Organization</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Remote Sensing Analyst (SIH 26167)"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50/60 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400/40 font-medium transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <LogOut className="w-3.5 h-3.5 mr-1.5" />
              <span>Log out</span>
            </Button>

            <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setProfileModalOpen(false)}
              className="text-slate-600 hover:text-slate-900"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="h-9 px-5 bg-slate-900 text-white hover:bg-black rounded-full shadow-sm flex items-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile</span>
                </>
              )}
            </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
