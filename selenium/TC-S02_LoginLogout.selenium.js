/**
 * TC-S02 — Login then logout
 * Module: M1 Authentication & Profile
 * Expected: dashboard opens after login; token cleared after logout
 * Needs: frontend (5173) + backend (5000) running. Run: node TC-S02_LoginLogout.selenium.js
 */
const { expect, env, poll, waitForText, findVisible, getToken, getUser, login, logout, runSuite } = require("./helpers");

runSuite("TC-S02", [["TC-S02", "Login then logout", async (d) => {
  const [email, password] = env("CITIZEN_EMAIL", "CITIZEN_PASSWORD");

  await login(d, email, password);

  const user = await getUser(d);
  expect(user && user.role === "citizen", "Citizen role not stored after login");
  await waitForText(d, "Dashboard");

  await logout(d);

  await poll(async () => !(await getToken(d)), "token to be cleared after logout");
  await findVisible(d, "//nav//button[normalize-space()='Login']"); // public navbar is back
}]]);