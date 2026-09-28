const jwt = require("jsonwebtoken");

/**
 * Signed, verifiable tokens for vaccination-certificate QR codes.
 *
 * Design notes
 * ------------
 * - The token is an HS256 JWT signed with a dedicated secret
 *   (QR_SIGNING_SECRET), NOT the auth secret. It is pinned to its own
 *   `aud`/`iss` so a login token can never be replayed as a QR token
 *   (or vice versa), and `algorithms` is pinned on verify so the
 *   "alg: none" / algorithm-confusion class of attacks is closed.
 * - The QR is scannable by anyone, so the payload carries NO health data
 *   or personal information: only a version, the certificate's random
 *   lookup id (`tid`, i.e. Certificate.qrToken) and the issue time.
 *   Details are resolved server-side, after the signature checks out.
 * - No `exp`: vaccination certificates are long-lived. Invalidation is a
 *   server-side concern (the certificate row must still exist).
 * - Key rotation: every token carries a `kid`. QR_SIGNING_SECRET is the
 *   active key (id from QR_SIGNING_KEY_ID, default "1"). Older keys stay
 *   valid for verification via
 *   QR_SIGNING_SECRET_PREVIOUS="kid:secret,kid2:secret2".
 */

const AUDIENCE = "imunix:vaccination-certificate";
const ISSUER = "imunix";
const TOKEN_VERSION = 1;
const ALGORITHM = "HS256";
const MIN_SECRET_LENGTH = 32;
const MAX_TOKEN_LENGTH = 2048; // reject absurd input before parsing
const TID_PATTERN = /^[a-f0-9]{64}$/;

class QrConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = "QrConfigError";
  }
}

function checkSecret(name, secret) {
  if (typeof secret !== "string" || secret.length < MIN_SECRET_LENGTH) {
    throw new QrConfigError(
      `${name} must be set and at least ${MIN_SECRET_LENGTH} characters long`
    );
  }
  if (process.env.JWT_SECRET && secret === process.env.JWT_SECRET) {
    throw new QrConfigError(`${name} must differ from JWT_SECRET`);
  }
}

function loadKeyring() {
  const activeSecret = process.env.QR_SIGNING_SECRET;
  checkSecret("QR_SIGNING_SECRET", activeSecret);

  const activeKid = process.env.QR_SIGNING_KEY_ID || "1";
  const keys = new Map([[activeKid, activeSecret]]);

  const previous = process.env.QR_SIGNING_SECRET_PREVIOUS;
  if (previous) {
    for (const entry of previous.split(",")) {
      const trimmed = entry.trim();
      if (!trimmed) continue;

      const sep = trimmed.indexOf(":");
      if (sep < 1) {
        throw new QrConfigError(
          "QR_SIGNING_SECRET_PREVIOUS entries must look like 'kid:secret'"
        );
      }

      const kid = trimmed.slice(0, sep);
      const secret = trimmed.slice(sep + 1);
      checkSecret(`QR_SIGNING_SECRET_PREVIOUS[${kid}]`, secret);

      if (keys.has(kid)) {
        throw new QrConfigError(`Duplicate QR signing key id '${kid}'`);
      }
      keys.set(kid, secret);
    }
  }

  return { activeKid, activeSecret, keys };
}

/** Throws QrConfigError if signing isn't configured. Call before writing data. */
function assertConfigured() {
  loadKeyring();
}

/**
 * @param {string} tid       Certificate.qrToken (64-char hex lookup id)
 * @param {Date}   issuedAt  Certificate.issuedDate
 * @returns {string} compact signed token, ready to be encoded in a QR code
 */
function signToken(tid, issuedAt) {
  if (!TID_PATTERN.test(tid || "")) {
    throw new TypeError("tid must be a 64-character lowercase hex string");
  }

  const { activeKid, activeSecret } = loadKeyring();

  return jwt.sign(
    {
      v: TOKEN_VERSION,
      tid,
      iat: Math.floor(new Date(issuedAt).getTime() / 1000),
    },
    activeSecret,
    {
      algorithm: ALGORITHM,
      keyid: activeKid,
      audience: AUDIENCE,
      issuer: ISSUER,
    }
  );
}

/**
 * Cryptographic check only (signature, audience, issuer, version).
 * Whether the certificate still exists is the caller's job.
 *
 * Never throws for bad input; throws QrConfigError only for server
 * misconfiguration (which should surface as a 500, not "invalid").
 *
 * @returns {{valid: true, payload: {v:number, tid:string, iat:number}}
 *         | {valid: false, reason: string}}
 */
function verifyToken(token) {
  const { keys } = loadKeyring();

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    return { valid: false, reason: "malformed_token" };
  }

  let decoded;

  try {
    // decode() throws (rather than returning null) when a segment isn't
    // valid base64url JSON, e.g. a bit-flipped or hand-edited token.
    decoded = jwt.decode(token.trim(), { complete: true });
  } catch (error) {
    return { valid: false, reason: "malformed_token" };
  }

  if (!decoded || !decoded.header) {
    return { valid: false, reason: "malformed_token" };
  }

  const secret = keys.get(decoded.header.kid);

  if (!secret) {
    return { valid: false, reason: "unknown_key" };
  }

  let payload;

  try {
    payload = jwt.verify(token.trim(), secret, {
      algorithms: [ALGORITHM],
      audience: AUDIENCE,
      issuer: ISSUER,
    });
  } catch (error) {
    return { valid: false, reason: "invalid_signature" };
  }

  if (payload.v !== TOKEN_VERSION) {
    return { valid: false, reason: "unsupported_version" };
  }

  if (!TID_PATTERN.test(payload.tid || "") || !Number.isInteger(payload.iat)) {
    return { valid: false, reason: "malformed_token" };
  }

  return { valid: true, payload };
}

module.exports = {
  signToken,
  verifyToken,
  assertConfigured,
  QrConfigError,
  AUDIENCE,
  ISSUER,
};
