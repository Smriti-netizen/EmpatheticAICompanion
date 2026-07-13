const USER_ID_KEY = "empathic.user_id";
const CONSENT_KEY = "empathic.consent.accepted";
const DISPLAY_NAME_KEY = "empathic.display_name";
const AVATAR_KEY = "empathic.avatar_id";

export function getUserId(): string | null {
  try {
    return localStorage.getItem(USER_ID_KEY);
  } catch {
    return null;
  }
}

export function setUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId);
}

export function getDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) || "";
  } catch {
    return "";
  }
}

export function setDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name);
}

export function getAvatarId(): string {
  try {
    return localStorage.getItem(AVATAR_KEY) || "hop";
  } catch {
    return "hop";
  }
}

export function setAvatarId(avatarId: string): void {
  localStorage.setItem(AVATAR_KEY, avatarId);
}

export function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "1";
  } catch {
    return false;
  }
}

export function setConsentAccepted(): void {
  localStorage.setItem(CONSENT_KEY, "1");
}
