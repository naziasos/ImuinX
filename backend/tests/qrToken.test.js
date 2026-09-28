const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const qrToken = require("../utils/qrToken");

const SECRET = "a".repeat(48);
const TID = crypto.randomBytes(32).toString("hex");
const ISSUED = new Date("2026-01-15T10:00:00.000Z");

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
    const token = qrToken.signToken(TID, ISSUED);
    const result = qrToken.verifyToken(token);

    expect(result.valid).toBe(true);
    expect(result.payload).toMatchObject({
      v: 1,
      tid: TID,
      iat: Math.floor(ISSUED.getTime() / 1000),
    });
  });

  test("is deterministic, so a QR can be re-rendered identically", () => {
    expect(qrToken.signToken(TID, ISSUED)).toBe(qrToken.signToken(TID, ISSUED));
  });

  test("carries no personal or health data, and no expiry", () => {
    const { payload } = jwt.decode(qrToken.signToken(TID, ISSUED), {
      complete: true,
    });

    expect(Object.keys(payload).sort()).toEqual(
      ["aud", "iat", "iss", "tid", "v"].sort()
    );
  });

  test("rejects a token whose payload was tampered with", () => {
    const [h, , s] = qrToken.signToken(TID, ISSUED).split(".");
    const otherTid = crypto.randomBytes(32).toString("hex");
    const forgedPayload = Buffer.from(
      JSON.stringify({
        v: 1,
        tid: otherTid,
        iat: 1,
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
      { v: 1, tid: TID },
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
    const [h, p, s] = qrToken.signToken(TID, ISSUED).split(".");
    const corruptedPayload = p.slice(0, -2) + "AA";
    const garbageHeader = Buffer.from("{not json").toString("base64url");

    expect(qrToken.verifyToken(`${h}.${corruptedPayload}.${s}`).valid).toBe(false);
    expect(qrToken.verifyToken(`${garbageHeader}.${p}.${s}`)).toEqual({
      valid: false,
      reason: "malformed_token",
    });
  });

  test("refuses to sign with a non-hex tid", () => {
    expect(() => qrToken.signToken("nope", ISSUED)).toThrow(TypeError);
  });

  describe("configuration", () => {
    test("throws QrConfigError when the secret is missing", () => {
      delete process.env.QR_SIGNING_SECRET;

      expect(() => qrToken.signToken(TID, ISSUED)).toThrow(qrToken.QrConfigError);
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
      const oldToken = qrToken.signToken(TID, ISSUED); // kid "1"

      process.env.QR_SIGNING_KEY_ID = "2";
      process.env.QR_SIGNING_SECRET = "b".repeat(48);
      process.env.QR_SIGNING_SECRET_PREVIOUS = `1:${SECRET}`;

      expect(qrToken.verifyToken(oldToken).valid).toBe(true);

      const newToken = qrToken.signToken(TID, ISSUED);
      expect(jwt.decode(newToken, { complete: true }).header.kid).toBe("2");
      expect(qrToken.verifyToken(newToken).valid).toBe(true);
    });

    test("a retired key is rejected once removed from the keyring", () => {
      const oldToken = qrToken.signToken(TID, ISSUED); // kid "1"

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
