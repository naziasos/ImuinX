const jwt = require("jsonwebtoken");
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

function assertConfigured() {
  loadKeyring();
}

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
