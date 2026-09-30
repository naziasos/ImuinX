const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const qrToken = require("../utils/qrToken");

const SECRET = "a".repeat(48);
const TID = crypto.randomBytes(32).toString("hex");
const DAY = 24 * 60 * 60 * 1000;
const ISSUED = new Date(Date.now() - 1 * DAY);
const EXPIRY = new Date(Date.now() + 30 * DAY);
const iatOf = (d) => Math.floor(d.getTime() / 1000);

const ENV_KEYS = [
  "QR_SIGNING_SECRET",
  "QR_SIGNING_KEY_ID",
  "QR_SIGNING_SECRET_PREVIOUS",
  "JWT_SECRET",
];
let saved;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  ENV_KEYS.forEach((k) => delete process.env[k]);
  process.env.QR_SIGNING_SECRET = SECRET;
  process.env.JWT_SECRET = "login-secret-that-is-different-from-qr";
});

afterEach(() => {
  ENV_KEYS.forEach((k) =>
    saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])
  );
});

describe("qrToken", () => {
  test("signs a token that verifies and round-trips the payload", () => {
    const token = qrToken.signToken(TID, ISSUED, EXPIRY);
    const result = qrToken.verifyToken(token);

    expect(result.valid).toBe(true);
    expect(result.payload).toMatchObject({
      v: 1,
      tid: TID,
      iat: iatOf(ISSUED),
      exp: iatOf(EXPIRY),
    });
  });

  test("is deterministic, so a QR can be re-rendered identically", () => {
    expect(qrToken.signToken(TID, ISSUED, EXPIRY)).toBe(qrToken.signToken(TID, ISSUED, EXPIRY));
  });

  test("carries no personal or health data, only an expiry", () => {
    const { payload } = jwt.decode(qrToken.signToken(TID, ISSUED, EXPIRY), {
      complete: true,
    });

    expect(Object.keys(payload).sort()).toEqual(
      ["aud", "exp", "iat", "iss", "tid", "v"].sort()
    );
  });

  test("rejects a token whose payload was tampered with", () => {
    const [h, , s] = qrToken.signToken(TID, ISSUED, EXPIRY).split(".");
    const otherTid = crypto.randomBytes(32).toString("hex");
    const forgedPayload = Buffer.from(
      JSON.stringify({
        v: 1,
        tid: otherTid,
        iat: 1,
        exp: iatOf(EXPIRY),
        aud: qrToken.AUDIENCE,
        iss: qrToken.ISSUER,
      })
    ).toString("base64url");

    expect(qrToken.verifyToken(`${h}.${forgedPayload}.${s}`)).toEqual({
      valid: false,
      reason: "invalid_signature",
    });
  });

  test("rejects a token signed with a different secret", () => {
    const forged = jwt.sign(
      { v: 1, tid: TID, iat: iatOf(ISSUED), exp: iatOf(EXPIRY) },
      "z".repeat(48),
      {
        algorithm: "HS256",
        keyid: "1",
        audience: qrToken.AUDIENCE,
        issuer: qrToken.ISSUER,
      }
    );

    expect(qrToken.verifyToken(forged).reason).toBe("invalid_signature");
  });

  test("rejects alg=none tokens", () => {
    const enc = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const none = `${enc({ alg: "none", typ: "JWT", kid: "1" })}.${enc({
      v: 1,
      tid: TID,
      iat: 1,
      exp: iatOf(EXPIRY),
      aud: qrToken.AUDIENCE,
      iss: qrToken.ISSUER,
    })}.`;

    expect(qrToken.verifyToken(none).valid).toBe(false);
  });

  test("a login (auth) JWT cannot be used as a QR token", () => {
    const authToken = jwt.sign(
      { id: "u1", role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    expect(qrToken.verifyToken(authToken).valid).toBe(false);
  });

  test.each([undefined, null, "", "not-a-jwt", 42, "x".repeat(5000)])(
    "reports malformed input %p without throwing",
    (input) => {
      expect(qrToken.verifyToken(input)).toEqual({
        valid: false,
        reason: "malformed_token",
      });
    }
  );

  test("a corrupted (non-JSON) segment is reported as malformed, not thrown", () => {
    const [h, p, s] = qrToken.signToken(TID, ISSUED, EXPIRY).split(".");
    const corruptedPayload = p.slice(0, -2) + "AA";
    const garbageHeader = Buffer.from("{not json").toString("base64url");

    expect(qrToken.verifyToken(`${h}.${corruptedPayload}.${s}`).valid).toBe(false);
    expect(qrToken.verifyToken(`${garbageHeader}.${p}.${s}`)).toEqual({
      valid: false,
      reason: "malformed_token",
    });
  });

  test("refuses to sign with a non-hex tid", () => {
    expect(() => qrToken.signToken("nope", ISSUED, EXPIRY)).toThrow(TypeError);
  });

  test("refuses to sign without a usable expiry", () => {
    expect(() => qrToken.signToken(TID, ISSUED)).toThrow(TypeError);
    expect(() => qrToken.signToken(TID, ISSUED, "garbage")).toThrow(TypeError);
    expect(() => qrToken.signToken(TID, ISSUED, ISSUED)).toThrow(TypeError);
  });

  describe("expiry", () => {
    test("rejects an expired token with reason 'expired'", () => {
      const token = qrToken.signToken(
        TID,
        new Date(Date.now() - 10 * DAY),
        new Date(Date.now() - 1 * DAY)
      );

      expect(qrToken.verifyToken(token)).toEqual({
        valid: false,
        reason: "expired",
      });
    });

    test("rejects a correctly signed token that has no exp claim", () => {
      const noExp = jwt.sign({ v: 1, tid: TID, iat: iatOf(ISSUED) }, SECRET, {
        algorithm: "HS256",
        keyid: "1",
        audience: qrToken.AUDIENCE,
        issuer: qrToken.ISSUER,
      });

      expect(qrToken.verifyToken(noExp).valid).toBe(false);
    });

    test("editing exp to extend validity breaks the signature", () => {
      const [h, p, s] = qrToken.signToken(TID, ISSUED, EXPIRY).split(".");
      const payload = JSON.parse(Buffer.from(p, "base64url").toString());
      payload.exp += 365 * 24 * 60 * 60;
      const forged = Buffer.from(JSON.stringify(payload)).toString("base64url");

      expect(qrToken.verifyToken(`${h}.${forged}.${s}`)).toEqual({
        valid: false,
        reason: "invalid_signature",
      });
    });
  });

  describe("configuration", () => {
    test("throws QrConfigError when the secret is missing", () => {
      delete process.env.QR_SIGNING_SECRET;

      expect(() => qrToken.signToken(TID, ISSUED, EXPIRY)).toThrow(qrToken.QrConfigError);
      expect(() => qrToken.assertConfigured()).toThrow(qrToken.QrConfigError);
    });

    test("throws when the secret is too short", () => {
      process.env.QR_SIGNING_SECRET = "short";

      expect(() => qrToken.assertConfigured()).toThrow(/at least 32/);
    });

    test("throws when the secret equals JWT_SECRET", () => {
      process.env.JWT_SECRET = SECRET;

      expect(() => qrToken.assertConfigured()).toThrow(/differ from JWT_SECRET/);
    });
  });

  describe("key rotation", () => {
    test("tokens from a previous key still verify; new tokens use the new key", () => {
      const oldToken = qrToken.signToken(TID, ISSUED, EXPIRY); // kid "1"

      process.env.QR_SIGNING_KEY_ID = "2";
      process.env.QR_SIGNING_SECRET = "b".repeat(48);
      process.env.QR_SIGNING_SECRET_PREVIOUS = `1:${SECRET}`;

      expect(qrToken.verifyToken(oldToken).valid).toBe(true);

      const newToken = qrToken.signToken(TID, ISSUED, EXPIRY);
      expect(jwt.decode(newToken, { complete: true }).header.kid).toBe("2");
      expect(qrToken.verifyToken(newToken).valid).toBe(true);
    });

    test("a retired key is rejected once removed from the keyring", () => {
      const oldToken = qrToken.signToken(TID, ISSUED, EXPIRY); // kid "1"

      process.env.QR_SIGNING_KEY_ID = "2";
      process.env.QR_SIGNING_SECRET = "b".repeat(48);

      expect(qrToken.verifyToken(oldToken)).toEqual({
        valid: false,
        reason: "unknown_key",
      });
    });

    test("rejects malformed or duplicate previous-key entries", () => {
      process.env.QR_SIGNING_SECRET_PREVIOUS = "no-colon-here";
      expect(() => qrToken.assertConfigured()).toThrow(/kid:secret/);

      process.env.QR_SIGNING_SECRET_PREVIOUS = `1:${"c".repeat(48)}`;
      expect(() => qrToken.assertConfigured()).toThrow(/Duplicate/);
    });
  });
});
