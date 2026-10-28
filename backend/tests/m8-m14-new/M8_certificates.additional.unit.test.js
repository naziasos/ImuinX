const jwt = require("jsonwebtoken");

describe("M8 - Additional QR Token Security Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {
      ...originalEnv,
      QR_SIGNING_SECRET:
        "test-qr-signing-secret-at-least-32-characters-long",
      JWT_SECRET: "different-jwt-secret-for-testing",
      QR_SIGNING_KEY_ID: "test-key",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("TC-U38A: Reject token signed with unknown key ID", () => {
    const qrToken = require("../../utils/qrToken");

    const token = jwt.sign(
      {
        v: 1,
        tid: "a".repeat(64),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      "test-qr-signing-secret-at-least-32-characters-long",
      {
        algorithm: "HS256",
        keyid: "unknown-key",
        audience: qrToken.AUDIENCE,
        issuer: qrToken.ISSUER,
      }
    );

    expect(qrToken.verifyToken(token).valid).toBe(false);
  });

  test("TC-U38B: Reject alg=none token", () => {
    const qrToken = require("../../utils/qrToken");

    const encode = (value) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");

    const token = [
      encode({
        alg: "none",
        typ: "JWT",
        kid: "test-key",
      }),
      encode({
        v: 1,
        tid: "a".repeat(64),
        iat: 1,
        exp: 9999999999,
        aud: qrToken.AUDIENCE,
        iss: qrToken.ISSUER,
      }),
      "",
    ].join(".");

    expect(qrToken.verifyToken(token).valid).toBe(false);
  });

  test("TC-U38C: Reject malformed token", () => {
    const qrToken = require("../../utils/qrToken");

    expect(qrToken.verifyToken("not.a.jwt").valid).toBe(false);
  });

  test("TC-U38D: Reject oversized token", () => {
    const qrToken = require("../../utils/qrToken");

    expect(qrToken.verifyToken("x".repeat(2050)).valid).toBe(false);
  });
});