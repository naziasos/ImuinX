/**
 * TC-S04 — Admin creates clinic and assigns clinic admin
 * Module: M2 Clinic & Staff Onboarding
 * Expected: clinic created; clinic admin account created
 * Needs: frontend (5173) + backend (5000) running. Run: node TC-S04_AdminCreatesClinic.selenium.js
 */
const { By, until, TIMEOUT, runId, uniqueEmail, uniquePhone, expect, env, waitForText, clickText, typeInto, login, api, runSuite } = require("./helpers");

runSuite("TC-S04", [["TC-S04", "Admin creates clinic and assigns clinic admin", async (d) => {
  const [email, password] = env("ADMIN_EMAIL", "ADMIN_PASSWORD");
  const clinicName = `Selenium Clinic ${runId}`;

  await login(d, email, password);
  await clickText(d, "Add New Clinic");
  await d.wait(until.elementLocated(By.css("input[name='clinicName']")), TIMEOUT);

  await typeInto(d, "input[name='clinicName']", clinicName);
  await typeInto(d, "input[name='contact']", uniquePhone());
  await typeInto(d, "[name='location']", "Selenium Road, Dhaka");
  await typeInto(d, "input[name='adminName']", "Selenium Clinic Admin");
  await typeInto(d, "input[name='adminEmail']", uniqueEmail("clinicadmin"));
  await (await d.findElement(By.css("button[type='submit']"))).click();

  await waitForText(d, "Clinic created successfully");

  // The clinic is listed by the API
  const res = await api("GET", "/clinics");
  expect(res.status === 200, `GET /clinics returned ${res.status}`);
  expect(JSON.stringify(res.json).includes(clinicName), "New clinic not found in the clinic list");
}]]);