import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Diamond } from "../../components/Diamond";
import { api, ApiClientError } from "../../shared/api/client";
import { getAvatarId, getLocale, getUserId, setAvatarId, setLocale } from "../../lib/storage";
import { SESSION_LOCALES, type SessionLocale } from "../../lib/locales";
import { AVATAR_PRESETS, getAvatar, type AvatarId } from "./avatarCatalog";

function asAvatarId(value: string): AvatarId {
  return value === "aura" || value === "spark" ? value : "hop";
}

export function AvatarPickerPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AvatarId>(() => asAvatarId(getAvatarId()));
  const [locale, setLocaleState] = useState<SessionLocale>(() => getLocale());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const preview = getAvatar(selected);

  async function continueBooking() {
    const userId = getUserId();
    if (!userId) {
      navigate("/consent");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.setAvatar(userId, selected, locale);
      setAvatarId(selected);
      setLocale(locale);
      navigate("/book");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save avatar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-cream text-ink">
      <header className="flex items-center justify-between border-b border-line px-4 py-4 sm:px-8 sm:py-5 lg:px-10">
        <div className="flex min-w-0 items-center gap-2 font-display text-[16px] font-medium sm:gap-2.5 sm:text-[19px]">
          <Diamond size={12} className="shrink-0" />
          <span className="truncate">Empathic Companion</span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:max-w-4xl lg:px-8">
        <div className="mb-3 flex items-center gap-2 font-script text-[14px] font-medium text-rose not-italic sm:mb-4 sm:text-[15px]">
          <Diamond size={7} />
          Your companion
        </div>
        <h1 className="font-display text-[clamp(1.65rem,6vw,2.75rem)] leading-[1.1] font-normal tracking-[-0.01em] text-ink">
          Choose your <span className="font-script font-medium text-rose not-italic">companion.</span>
        </h1>
        <p className="mt-3 max-w-xl text-[14px] leading-[1.6] text-ink/70 sm:text-[15px]">
          Milo, Coco, and Ziggy each have their own mature voice. Pick a companion and the
          language you want them to speak in your session.
        </p>

        <div className="mt-10 flex flex-col items-center">
          <div className="grid h-40 w-40 place-items-center bg-blush">
            <img
              src={preview.imageSrc}
              alt={preview.name}
              className="h-36 w-36 object-cover"
            />
          </div>
          <p className="mt-4 font-display text-2xl font-normal text-ink">{preview.name}</p>
          <p className="mt-1 font-script text-[15px] font-medium text-rose not-italic">
            {preview.vibe}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {AVATAR_PRESETS.map((preset) => {
            const isSelected = selected === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  setSelected(preset.id);
                  // Persist immediately so session TTS cannot keep a stale male voice.
                  setAvatarId(preset.id);
                }}
                className={`relative rounded-2xl border bg-blush px-4 py-4 text-left transition sm:px-5 sm:py-5 ${
                  isSelected ? "border-rose" : "border-line hover:border-rose/50"
                }`}
              >
                {isSelected && (
                  <span className="absolute top-4 right-4">
                    <Diamond size={10} />
                  </span>
                )}
                <img src={preset.imageSrc} alt="" className="mb-3 h-14 w-14 rounded-full object-cover" />
                <p className="font-display text-[18px] font-normal text-ink">{preset.name}</p>
                <p className="mt-1 font-script text-[14px] font-medium text-rose not-italic">
                  {preset.vibe}
                </p>
                <p className="mt-2 font-display text-[14px] leading-[1.55] font-light text-ink/70">
                  {preset.blurb}
                </p>
              </button>
            );
          })}
        </div>

        <section className="mt-12">
          <div className="mb-3 flex items-center gap-2 font-script text-[15px] font-medium text-rose not-italic">
            <Diamond size={7} />
            Session language
          </div>
          <p className="mb-4 max-w-xl text-[14px] leading-[1.55] text-ink/65">
            Pick a preference — Hinglish and mixed speech are welcome. You do not need to speak
            pure Hindi, Bengali, or English.
          </p>
          <div className="flex flex-wrap gap-2">
            {SESSION_LOCALES.map((opt) => {
              const active = locale === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLocaleState(opt.id)}
                  className={`border px-3.5 py-2 text-left transition ${
                    active
                      ? "border-rose bg-blush text-ink"
                      : "border-line bg-transparent text-ink/75 hover:border-rose/40"
                  }`}
                >
                  <span className="block font-display text-[14px] font-normal leading-tight">
                    {opt.native}
                  </span>
                  {opt.native !== opt.label && (
                    <span className="mt-0.5 block text-[11px] text-ink/45">{opt.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {error && <p className="mt-4 text-[14px] text-rose">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={() => void continueBooking()}
          className="mt-10 rounded-full bg-rose px-9 py-4 font-sans text-[12px] font-medium text-cream not-italic transition hover:bg-rose-deep disabled:opacity-50"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
