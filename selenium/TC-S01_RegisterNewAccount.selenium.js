/**
 * TC-S01 — Register a new account
 * Module: M1 Authentication & Profile
 * Expected: account created and user moved on to the OTP verification step
 * Needs: frontend (5173) + backend (5000) running. Run: node TC-S01_RegisterNewAccount.selenium.js
 */
const { By, until, BASE_URL, TIMEOUT, uniqueEmail, expect, waitForText, findVisible, clickText, typeInto, api, runSuite } = require("./helpers");

const PASSWORD = "Nurjahan@123";

runSuite("TC-S01", [["TC-S01", "Register a new account", async (d) => {
  const email = uniqueEmail("register");

  await d.get(BASE_URL);
  await (await findVisible(d, "//nav//button[normalize-space()='Register']")).click();
  await d.wait(until.elementLocated(By.css("#name")), TIMEOUT);

  await typeInto(d, "#name", "Selenium Citizen");
  await typeInto(d, "#email", email);
  await typeInto(d, "#password", PASSWORD);
  await typeInto(d, "#confirm", PASSWORD);
  await clickText(d, "Create account");

  // The app moves on to the OTP verification step
  await waitForText(d, "Verify Your OTP");

  // The account exists but cannot log in until the e-mail is verified
  const res = await api("POST", "/auth/login", { body: { email, password: PASSWORD } });
  expect(res.status === 403, `Unverified user should get 403 on login, got ${res.status}`);
}]]);