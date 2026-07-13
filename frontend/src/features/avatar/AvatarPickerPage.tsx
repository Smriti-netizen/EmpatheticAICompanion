import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, ApiClientError } from "../../api/client";
import { getUserId, setAvatarId } from "../../lib/storage";
import { AVATAR_PRESETS, type AvatarId } from "./avatarCatalog";
import { CounselorAvatar } from "./CounselorAvatar";

export function AvatarPickerPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<AvatarId>("hop");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      <h1 className="mt-2 font-display text-4xl font-semibold text-ink">Choose an avatar</h1>
      <p className="mt-2 max-w-xl text-sm text-muted">
        Original stylized companions — warm and clearly AI, not photoreal. Pick the vibe that
        feels safest to sit with.
      </p>

      <div className="mt-8 flex justify-center">
        <CounselorAvatar avatarId={selected} expression="warm" size="md" />
      </div>

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
        {saving ? "Saving…" : "Continue to booking"}
      </button>
    </div>
  );
}
