"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useProfileStore } from "@/store/useProfileStore";
import { X, User, Mail, Shield, Check, Save } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ProfileModal: React.FC = () => {
  const { profile, isProfileModalOpen, setProfileModalOpen, updateProfile } = useProfileStore();

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      {/* Modal Card */}
      <div className="glass-card relative w-full max-w-md rounded-3xl p-6 shadow-2xl text-primary border border-white/70 dark:border-white/10 dark:bg-[#171512]">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => setProfileModalOpen(false)}
          className="text-secondary/70 hover:text-primary dark:text-[#91877D] dark:hover:text-[#F3EEE7] p-1.5 rounded-full transition-colors absolute top-5 right-5"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with Avatar */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#1C1917] dark:bg-[#1F1B17] text-white flex items-center justify-center font-serif text-xl font-bold shadow-xs ring-2 ring-black/5 dark:ring-white/10">
            {name ? name.charAt(0).toUpperCase() : "U"}
          </div>
          <div>
            <h2 className="font-serif text-xl text-primary tracking-wide font-semibold">
              User Profile & Settings
            </h2>
            <p className="text-xs text-secondary">
              Manage your analyst identity and notification preferences
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* Name Field */}
          <div className="space-y-1.5">
            <label className="font-medium text-primary flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-accent" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Jane Smith"
              className="glass-inner w-full px-3.5 py-2 rounded-xl text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="font-medium text-primary flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-accent" />
              <span>Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@organization.org"
              className="glass-inner w-full px-3.5 py-2 rounded-xl text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
            />
          </div>

          {/* Role / Org Field */}
          <div className="space-y-1.5">
            <label className="font-medium text-primary flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-accent" />
              <span>Role / Organization</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Remote Sensing Analyst (SIH 26167)"
              className="glass-inner w-full px-3.5 py-2 rounded-xl text-primary placeholder:text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent/40 font-medium transition-all"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-stone-200/60 dark:border-white/10">
            <Link
              href="/login"
              onClick={() => setProfileModalOpen(false)}
              className="text-xs text-secondary dark:text-[#B8AEA3] hover:text-accent underline transition-colors"
            >
              Switch Account / Login &rarr;
            </Link>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setProfileModalOpen(false)}
                className="text-secondary dark:text-[#B8AEA3] hover:text-primary dark:hover:text-[#F3EEE7] hover:bg-black/5 dark:hover:bg-white/10"
              >
                Cancel
              </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              className="apple-interactive h-9 px-5 bg-gradient-to-br from-accent to-[#D97736] text-white hover:brightness-105 hover:-translate-y-0.5 active:scale-[0.98] ring-2 ring-accent/30 rounded-full flex items-center gap-1.5 transition-all duration-200 ease-apple"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
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
