import { api } from "./api";

const VERIFY_TIMEOUT_MS = 5000;

export function normalizeCode(raw) {
  return String(raw ?? "").replace(/\s+/g, "");
}

export async function verifyCertificateToken(rawToken) {
  const token = normalizeCode(rawToken);

  if (!token) return false;

  const { data } = await api.post(
    "/certificates/verify",
    { token },
    { timeout: VERIFY_TIMEOUT_MS }
  );

  return data?.valid === true;
}
