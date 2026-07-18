import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../../api/client";
import { getUserId, setAvatarId } from "../../lib/storage";
import { AVATAR_PRESETS, getAvatar, type AvatarId } from "./avatarCatalog";

export function AvatarPickerPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AvatarId>("hop");
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
      await api.setAvatar(userId, selected);
      setAvatarId(selected);
      navigate("/book");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not save avatar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto min-h-screen max-w-3xl px-4 py-10">
      <p className="text-xs font-medium tracking-[0.14em] text-accent uppercase">
        Your counselor
      </p>
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Choose your companion</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Milo, Coco, and Ziggy are friendly AI companions here to listen. Pick the one whose
        presence feels safest to sit with.
      </p>

      <div className="mt-8 flex justify-center">
        <img
          src={preview.imageSrc}
          alt={preview.name}
          className="h-44 w-44 rounded-full object-cover shadow-lg ring-4 ring-white"
          style={{ boxShadow: `0 22px 50px -20px ${preview.accent}` }}
        />
      </div>
      <p className="mt-3 text-center font-display text-2xl font-semibold text-ink">{preview.name}</p>
      <p className="text-center text-sm text-accent">{preview.vibe}</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        {AVATAR_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setSelected(preset.id)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              selected === preset.id
                ? "border-accent bg-accent-soft"
                : "border-line bg-surface hover:border-accent"
            }`}
          >
            <img
              src={preset.imageSrc}
              alt=""
              className="mb-3 h-16 w-16 rounded-full object-cover ring-2 ring-white"
            />
            <p className="font-semibold text-ink">{preset.name}</p>
            <p className="mt-1 text-xs font-medium text-accent">{preset.vibe}</p>
            <p className="mt-2 text-sm text-muted">{preset.blurb}</p>
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-crisis">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={() => void continueBooking()}
        className="mt-8 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
