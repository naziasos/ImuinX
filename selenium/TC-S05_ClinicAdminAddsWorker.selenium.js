/**
 * TC-S05 — Clinic admin adds a worker
 * Module: M2 Clinic & Staff Onboarding
 * Expected: worker created and listed under the clinic admin's clinic
 * Needs: frontend (5173) + backend (5000) running. Run: node TC-S05_ClinicAdminAddsWorker.selenium.js
 */
const { By, until, TIMEOUT, uniqueEmail, expect, env, waitForText, clickText, typeInto, getToken, login, api, runSuite } = require("./helpers");

runSuite("TC-S05", [["TC-S05", "Clinic admin adds a worker", async (d) => {
  const [email, password] = env("CLINIC_ADMIN_EMAIL", "CLINIC_ADMIN_PASSWORD");
  const workerEmail = uniqueEmail("worker");

  await login(d, email, password);
  await clickText(d, "Add Worker");
  await d.wait(until.elementLocated(By.css("#add-worker-name")), TIMEOUT);

  await typeInto(d, "#add-worker-name", "Selenium Worker");
  await typeInto(d, "#add-worker-email", workerEmail);
  await clickText(d, "Create Worker");

  await waitForText(d, "Worker created successfully");

  // The worker belongs to this clinic admin's clinic
  const res = await api("GET", "/clinics/my-clinic/workers", { token: await getToken(d) });
  expect(res.status === 200, `GET workers returned ${res.status}`);
  expect(JSON.stringify(res.json).includes(workerEmail), "New worker not found in the clinic's worker list");
}]]);