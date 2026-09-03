"use client";

import { useRef } from "react";
import Icon from "@/components/admin-panel/Icon";

export default function ProfileDetailsSection({
  avatar,
  firstName,
  lastName,
  email,
  emailError,
  phone,
  bio,
  onAvatarPicked,
  onAvatarRemoved,
  onFieldChange,
}) {
  const fileInputRef = useRef(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) onAvatarPicked(file);
    e.target.value = "";
  }

  return (
    <section className="bg-white dark:bg-darksurface border border-slate-200 dark:border-white/5 rounded-2xl shadow-card p-5 md:p-6">
      <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4">Personal Details</h2>

      <div className="flex flex-col md:flex-row gap-5 items-start">
        <div
          role="button"
          tabIndex={0}
          aria-label="Change profile photo"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className="relative w-24 h-24 rounded-full border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-primary-400 dark:hover:border-accent-500/50 bg-slate-50 dark:bg-darksurface2/50 flex flex-col items-center justify-center cursor-pointer transition-colors group shrink-0 overflow-hidden"
        >
          {avatar ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob: object URL from a local upload, not optimizable by next/image */}
              <img src={avatar.url} alt={avatar.name || ""} className="w-full h-full object-cover" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={(e) => {
                  e.stopPropagation();
                  onAvatarRemoved();
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-slate-900/70 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                &times;
              </button>
            </>
          ) : (
            <Icon
              name="user"
              className="w-8 h-8 text-slate-400 group-hover:text-primary-500 dark:group-hover:text-accent-400 transition-colors"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden="true"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex-1 w-full space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="f-first-name">
                First Name
              </label>
              <input
                id="f-first-name"
                type="text"
                value={firstName}
                onChange={(e) => onFieldChange("firstName", e.target.value)}
                placeholder="First name"
                aria-label="First name"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="f-last-name">
                Last Name
              </label>
              <input
                id="f-last-name"
                type="text"
                value={lastName}
                onChange={(e) => onFieldChange("lastName", e.target.value)}
                placeholder="Last name"
                aria-label="Last name"
                className="field-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="f-email">
                Email Address
              </label>
              <input
                id="f-email"
                type="email"
                value={email}
                onChange={(e) => onFieldChange("email", e.target.value)}
                placeholder="you@example.com"
                aria-label="Email address"
                className={`field-input${emailError ? " border-red-400" : ""}`}
              />
              {emailError && <p className="text-xs text-error mt-1">Enter a valid email address.</p>}
            </div>
            <div>
              <label className="field-label" htmlFor="f-phone">
                Phone Number
              </label>
              <input
                id="f-phone"
                type="tel"
                value={phone}
                onChange={(e) => onFieldChange("phone", e.target.value)}
                placeholder="+1 (555) 000-0000"
                aria-label="Phone number"
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="f-bio">
              Bio
            </label>
            <textarea
              id="f-bio"
              rows={3}
              value={bio}
              onChange={(e) => onFieldChange("bio", e.target.value)}
              placeholder="A short description about you…"
              aria-label="Bio"
              className="w-full p-3 rounded-xl bg-slate-100 dark:bg-darksurface2 border border-transparent focus:border-primary-400 dark:focus:border-accent-500 focus:bg-white dark:focus:bg-darksurface2 focus:outline-none focus:ring-4 focus:ring-primary-500/10 text-sm transition-all font-medium text-slate-800 dark:text-white resize-y"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
