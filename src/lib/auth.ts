const TOKEN_KEY = 'admin_token';
const CHALLENGE_TOKEN_KEY = 'admin_mfa_challenge_token';

export function getAdminToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  clearMfaChallengeToken();
}

export function clearAdminToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function getMfaChallengeToken(): string | null {
  return sessionStorage.getItem(CHALLENGE_TOKEN_KEY);
}

export function setMfaChallengeToken(token: string): void {
  sessionStorage.setItem(CHALLENGE_TOKEN_KEY, token);
}

export function clearMfaChallengeToken(): void {
  sessionStorage.removeItem(CHALLENGE_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getAdminToken();
}
