require("dotenv").config();

const qrToken = require("../utils/qrToken");

describe("QR Certificate Token Verification", () => {
  test("should reject an invalid token", () => {
    const result = qrToken.verifyToken("invalid-token");

    expect(result.valid).toBe(false);
  });
  test("should accept a genuine signed token", () => {
  const issuedAt = new Date();
  const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
  const tid = "a".repeat(64);

  const token = qrToken.signToken(tid, issuedAt, expiryDate);
  const result = qrToken.verifyToken(token);

  expect(result.valid).toBe(true);
  expect(result.payload.tid).toBe(tid);
});
test("should reject a token with a tampered signature", () => {
  const issuedAt = new Date();
  const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
  const tid = "b".repeat(64);

  const token = qrToken.signToken(tid, issuedAt, expiryDate);

  const parts = token.split(".");
  parts[2] = parts[2].slice(0, -1) + (parts[2].slice(-1) === "A" ? "B" : "A");

  const tamperedToken = parts.join(".");
  const result = qrToken.verifyToken(tamperedToken);

  expect(result.valid).toBe(false);
});
test("should reject an expired token", () => {
  const issuedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
  const expiryDate = new Date(Date.now() - 60 * 60 * 1000);
  const tid = "c".repeat(64);

  const token = qrToken.signToken(tid, issuedAt, expiryDate);
  const result = qrToken.verifyToken(token);

  expect(result.valid).toBe(false);
});
});