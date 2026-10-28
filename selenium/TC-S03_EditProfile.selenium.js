/**
 * TC-S03 — Edit profile
 * Module: M1 Authentication & Profile
 * Expected: success message; change saved on the server
 * Needs: frontend (5173) + backend (5000) running. Run: node TC-S03_EditProfile.selenium.js
 */
const { By, until, TIMEOUT, uniquePhone, expect, env, waitForText, clickText, typeInto, getToken, login, api, runSuite } = require("./helpers");

runSuite("TC-S03", [["TC-S03", "Edit profile", async (d) => {
  const [email, password] = env("CITIZEN_EMAIL", "CITIZEN_PASSWORD");
  const phone = uniquePhone();

  await login(d, email, password);
  await clickText(d, "Profile & Settings");
  await d.wait(until.elementLocated(By.css("#profile-phone")), TIMEOUT);

  await typeInto(d, "#profile-phone", phone);
  await clickText(d, "Save Changes");
  await waitForText(d, "Your profile has been updated successfully");

  // The change is really saved on the server (not just in the page)
  const res = await api("GET", "/auth/profile", { token: await getToken(d) });
  expect(res.status === 200, `GET profile returned ${res.status}`);
  expect(res.json.profile.phoneNumber === phone, `Saved phone is ${res.json.profile.phoneNumber}, expected ${phone}`);
}]]);