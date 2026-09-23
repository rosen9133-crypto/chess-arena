"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  initialDisplayName: string | null;
  initialBio: string | null;
  initialCountryCode: string | null;
  initialAvatarUrl: string | null;
};

const COUNTRIES = [
  ["", "Select country"], ["BG", "Bulgaria"], ["GB", "United Kingdom"],
  ["US", "United States"], ["DE", "Germany"], ["FR", "France"],
  ["ES", "Spain"], ["IT", "Italy"], ["GR", "Greece"], ["RO", "Romania"],
  ["RS", "Serbia"], ["MK", "North Macedonia"], ["TR", "Türkiye"],
  ["NL", "Netherlands"], ["BE", "Belgium"], ["AT", "Austria"],
  ["CH", "Switzerland"], ["PL", "Poland"], ["CZ", "Czechia"],
  ["SK", "Slovakia"], ["HU", "Hungary"], ["PT", "Portugal"],
  ["SE", "Sweden"], ["NO", "Norway"], ["DK", "Denmark"],
  ["FI", "Finland"], ["UA", "Ukraine"], ["CA", "Canada"],
  ["AU", "Australia"], ["IN", "India"], ["BR", "Brazil"],
  ["AR", "Argentina"], ["MX", "Mexico"], ["JP", "Japan"],
  ["KR", "South Korea"],
] as const;

export default function EditProfileForm({
  initialDisplayName,
  initialBio,
  initialCountryCode,
  initialAvatarUrl,
}: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [bio, setBio] = useState(initialBio ?? "");
  const [countryCode, setCountryCode] = useState(
    initialCountryCode?.toUpperCase() ?? "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  async function handleAvatarChange(file: File | undefined) {
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setAvatarError(true);
      setAvatarMessage("Choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setAvatarError(true);
      setAvatarMessage("Avatar must be 5 MB or smaller.");
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarError(false);
    setAvatarMessage(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        success?: boolean;
        avatarUrl?: string | null;
        error?: string;
      };

      if (!response.ok || !data.success || !data.avatarUrl) {
        throw new Error(data.error ?? "Could not upload avatar.");
      }

      setAvatarUrl(data.avatarUrl);
      setAvatarMessage("Avatar updated.");
      router.refresh();
    } catch (error) {
      setAvatarError(true);
      setAvatarMessage(
        error instanceof Error ? error.message : "Could not upload avatar.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setIsError(false);

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio, countryCode }),
      });

      const data = (await response.json()) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "Could not save profile.");
      }

      setMessage("Profile saved.");
      router.refresh();
    } catch (error) {
      setIsError(true);
      setMessage(
        error instanceof Error ? error.message : "Could not save profile.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-800 bg-[#0a1019] p-5 sm:p-6">
      <div className="border-b border-slate-800 pb-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">
          Profile Settings
        </p>
        <h2 className="mt-1 text-xl font-black text-white">Edit Profile</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose how your Chess Arena profile appears to other players.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="text-sm font-black text-slate-200">Avatar</label>

          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-400/30 bg-slate-950/70">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-black text-amber-300">
                  {displayName.trim().charAt(0).toUpperCase() || "?"}
                </span>
              )}
            </div>

            <div>
              <label
                htmlFor="avatarUpload"
                className={`inline-flex cursor-pointer items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-2.5 text-sm font-black text-amber-300 transition hover:border-amber-300/60 hover:bg-amber-400/15 ${
                  isUploadingAvatar ? "pointer-events-none opacity-50" : ""
                }`}
              >
                {isUploadingAvatar
                  ? "Uploading..."
                  : avatarUrl
                    ? "Change Avatar"
                    : "Upload Avatar"}
              </label>

              <input
                id="avatarUpload"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={isUploadingAvatar}
                onChange={(event) => {
                  void handleAvatarChange(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
                className="hidden"
              />

              <p className="mt-2 text-xs text-slate-600">
                JPG, PNG or WebP. Maximum 5 MB.
              </p>

              {avatarMessage ? (
                <p
                  className={`mt-2 text-sm font-bold ${
                    avatarError ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {avatarMessage}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="displayName" className="text-sm font-black text-slate-200">
              Display Name
            </label>
            <span className="text-xs text-slate-600">{displayName.length}/40</span>
          </div>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            maxLength={40}
            autoComplete="off"
            placeholder="Your display name"
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/60"
          />
          <p className="mt-2 text-xs text-slate-600">Your username stays unchanged.</p>
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="bio" className="text-sm font-black text-slate-200">
              Bio
            </label>
            <span className="text-xs text-slate-600">{bio.length}/160</span>
          </div>
          <textarea
            id="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={160}
            rows={4}
            placeholder="Tell other players a little about yourself..."
            className="mt-2 w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-semibold leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-amber-400/60"
          />
        </div>

        <div>
          <label htmlFor="countryCode" className="text-sm font-black text-slate-200">
            Country
          </label>
          <div className="mt-2 flex items-center gap-3">
            <select
              id="countryCode"
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value)}
              className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-100 outline-none transition focus:border-amber-400/60"
            >
              {COUNTRIES.map(([code, name]) => (
                <option key={code || "none"} value={code}>{name}</option>
              ))}
            </select>
            <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
              {countryCode ? (
                <img
                  src={`https://flagcdn.com/${countryCode.toLowerCase()}.svg`}
                  alt={`${countryCode} flag`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-lg text-slate-500">—</span>
              )}
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Your country flag will be shown automatically.
          </p>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-h-5">
            {message ? (
              <p className={`text-sm font-bold ${isError ? "text-rose-400" : "text-emerald-400"}`}>
                {message}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex min-w-[150px] items-center justify-center rounded-xl border border-amber-400/35 bg-amber-400/10 px-5 py-3 text-sm font-black text-amber-300 transition hover:border-amber-300/60 hover:bg-amber-400/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
