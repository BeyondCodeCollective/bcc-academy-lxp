/**
 * "Not now" on the ZIP + birthday prompt lasts a week. It lives in a cookie so
 * the server layout can skip both the prompt and its students lookup before
 * rendering, with no schema change; the browser expires it on its own.
 */
export const PROFILE_SNOOZE_COOKIE = "profile-prompt-snoozed";
export const PROFILE_SNOOZE_DAYS = 7;

export function profileSnoozeCookie(): string {
  const maxAge = PROFILE_SNOOZE_DAYS * 24 * 60 * 60;
  return `${PROFILE_SNOOZE_COOKIE}=1; path=/; max-age=${maxAge}; samesite=lax`;
}

/** Client-only: remember "Not now" for PROFILE_SNOOZE_DAYS. */
export function snoozeProfilePrompt(): void {
  document.cookie = profileSnoozeCookie();
}
