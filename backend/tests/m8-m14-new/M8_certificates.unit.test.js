
const jwt = require("jsonwebtoken");

describe("M8 - Certificate QR Token Security", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {
      ...originalEnv,
      QR_SIGNING_SECRET:
        "test-qr-signing-secret-at-least-32-characters-long",
      JWT_SECRET: "different-jwt-secret-for-testing",
      QR_SIGNING_KEY_ID: "1",
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("QR token payload should not contain personal information", () => {
    const qrToken = require("../../utils/qrToken");

    const token = qrToken.signToken(
      "a".repeat(64),
      new Date("2026-01-01T00:00:00Z"),
      new Date("2027-01-01T00:00:00Z")
    );

    const decoded = jwt.decode(token);

    expect(decoded).toBeTruthy();
    expect(decoded.tid).toBe("a".repeat(64));
    expect(decoded).not.toHaveProperty("name");
    expect(decoded).not.toHaveProperty("email");
    expect(decoded).not.toHaveProperty("phone");
    expect(decoded).not.toHaveProperty("address");
  });

  test("Modified QR token must not verify as the original token", () => {
    const qrToken = require("../../utils/qrToken");

    const token = qrToken.signToken(
      "b".repeat(64),
      new Date("2026-01-01T00:00:00Z"),
      new Date("2027-01-01T00:00:00Z")
    );

    const parts = token.split(".");
    const originalPayload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    );

    originalPayload.tid = "c".repeat(64);
    parts[1] = Buffer.from(
      JSON.stringify(originalPayload)
    ).toString("base64url");

    const modifiedToken = parts.join(".");
    const result = qrToken.verifyToken(modifiedToken);

    expect(result).not.toEqual(
      expect.objectContaining({ tid: "b".repeat(64) })
    );
  });

  test("Expired QR token must not verify as valid", () => {
    const qrToken = require("../../utils/qrToken");

    const token = qrToken.signToken(
      "d".repeat(64),
      new Date("2020-01-01T00:00:00Z"),
      new Date("2020-01-02T00:00:00Z")
    );

    const result = qrToken.verifyToken(token);

    expect(result).not.toEqual(
      expect.objectContaining({ tid: "d".repeat(64) })
    );
  });
});
