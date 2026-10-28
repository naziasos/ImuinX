const path = require("path");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// ======================================================
// CONFIG
// ======================================================

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:5000/api";
const BACKEND_DIR = path.join(__dirname, "..", "backend");

const TIMEOUT = 10000;

const ACCOUNTS = {
  citizen: {
    label: "Citizen",
    email: process.env.CITIZEN_EMAIL || "23201032@uap-bd.edu",
    password: process.env.CITIZEN_PASSWORD || "tanha1234@",
    dashboard: "//h1[normalize-space()='Citizen Dashboard']",
    dob: "1995-04-15",
  },
  worker: {
    label: "Health worker",
    email: process.env.WORKER_EMAIL || "23201046@uap-bd.edu",
    password: process.env.WORKER_PASSWORD || " 8s6l7e@N",
    dashboard: "//h1[contains(normalize-space(),'Worker Dashboard')]",
    dob: "1988-09-21",
  },
  clinicAdmin: {
    label: "Clinic admin",
    email: process.env.CLINIC_ADMIN_EMAIL || "23201030@uap-bd.edu",
    password: process.env.CLINIC_ADMIN_PASSWORD || "nurjahan@123",
    dashboard: "//h1[normalize-space()='Clinic Admin Dashboard']",
    dob: "1980-01-30",
  },
};

// Meets: 8+ chars, upper, lower, digit, special.
const TEMP_PASSWORD = "Sel3nium@Temp1";
const WRONG_PASSWORD = "Wr0ng@Password9";
const WEAK_PASSWORD = "weakpass1";

const runId = new Date().toISOString().replace(/\D/g, "").slice(4, 14);

const FAMILY_NAME_BEFORE = `Selenium Family ${runId}`;
const FAMILY_NAME_AFTER = `Selenium Family Edited ${runId}`;

// ======================================================
// SMALL HELPERS
// ======================================================

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class SkipTest extends Error {}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function poll(fn, timeout = TIMEOUT, what = "condition") {
  const end = Date.now() + timeout;
  let lastError;

  while (Date.now() < end) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (e) {
      lastError = e;
    }
    await sleep(200);
  }

  throw new Error(
    `Timed out waiting for ${what}${
      lastError ? ` (${lastError.message})` : ""
    }`
  );
}

// ======================================================
// API HELPERS (Node fetch, independent of the browser session)
// ======================================================

async function api(method, route, { token, body } = {}) {
  const response = await fetch(`${API_URL}${route}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  return { status: response.status, data };
}

async function apiLogin(email, password) {
  const res = await api("POST", "/auth/login", {
    body: { email, password },
  });
  return res;
}

async function apiGetProfile(token) {
  const res = await api("GET", "/auth/profile", { token });
  expect(res.status === 200, `GET /auth/profile returned ${res.status}`);
  return res.data.profile;
}

// ======================================================
// DATABASE HELPERS (used only for cleanup and hash check)
// ======================================================

function loadBackendModule(name) {
  return require(require.resolve(name, { paths: [BACKEND_DIR] }));
}

async function withDb(fn) {
  let mongoose;
  try {
    loadBackendModule("dotenv").config({
      path: path.join(BACKEND_DIR, ".env"),
      quiet: true,
    });
    mongoose = loadBackendModule("mongoose");
  } catch (e) {
    throw new SkipTest(`backend modules not available (${e.message})`);
  }

  if (!process.env.MONGO_URI) {
    throw new SkipTest("MONGO_URI not found in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  try {
    return await fn(mongoose.connection.db);
  } finally {
    await mongoose.disconnect();
  }
}

async function getStoredPasswordHash(email) {
  return withDb(async (db) => {
    const user = await db.collection("users").findOne({ email });
    return user ? user.password : null;
  });
}

async function setStoredPassword(email, plainPassword) {
  const bcrypt = loadBackendModule("bcryptjs");
  const hash = await bcrypt.hash(plainPassword, 10);

  return withDb(async (db) => {
    await db
      .collection("users")
      .updateOne({ email }, { $set: { password: hash } });
  });
}

// ======================================================
// SELENIUM HELPERS
// ======================================================

const NAV_LOGIN = "//nav//button[normalize-space()='Login']";

async function clearSession(driver) {
  await driver.get(BASE_URL);
  await driver.executeScript(
    "window.localStorage.clear(); window.sessionStorage.clear();"
  );
  await driver.get(BASE_URL);
}

async function waitVisible(driver, locator, timeout = TIMEOUT) {
  const el = await driver.wait(until.elementLocated(locator), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

async function clickEl(driver, el) {
  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    el
  );
  try {
    await el.click();
  } catch (_) {
    await driver.executeScript("arguments[0].click();", el);
  }
}

async function click(driver, locator) {
  const el = await waitVisible(driver, locator);
  await clickEl(driver, el);
  return el;
}

// Works with React controlled inputs, selects and date inputs.
async function setValue(driver, el, value) {
  await driver.executeScript(
    `
    const el = arguments[0];
    const value = arguments[1];
    const proto =
      el.tagName === "SELECT"
        ? window.HTMLSelectElement.prototype
        : el.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value").set.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    `,
    el,
    value
  );
}

async function fillById(driver, id, value) {
  const el = await waitVisible(driver, By.id(id));
  await setValue(driver, el, value);
}

async function valueById(driver, id) {
  const el = await waitVisible(driver, By.id(id));
  return el.getAttribute("value");
}

async function loginViaUi(driver, account) {
  await clearSession(driver);

  await click(driver, By.xpath(NAV_LOGIN));

  const email = await waitVisible(driver, By.name("email"));
  await email.sendKeys(account.email);

  await driver.findElement(By.name("password")).sendKeys(account.password);
  await driver.findElement(By.css("button[type='submit']")).click();

  await driver.wait(until.elementLocated(By.xpath(account.dashboard)), 15000);
}

async function logoutViaUi(driver) {
  await clearSession(driver);
}

// ----- Edit Profile (citizen / worker / clinic admin share this page) -----

const EDIT_PROFILE_HEADING = "//h1[normalize-space()='Edit Your Profile']";
const OPEN_EDIT_PROFILE = "//button[contains(normalize-space(),'Edit Profile')]";
const SAVE_PROFILE = "//button[@type='submit' and normalize-space()='Save Changes']";
const UPDATE_PASSWORD = "//button[@type='submit' and normalize-space()='Update Password']";
const BACK_TO_DASHBOARD = "//button[contains(normalize-space(),'Back to Dashboard')]";

const PASSWORD_FORM =
  "//h2[normalize-space()='Change Password']/ancestor::form[1]";
const PASSWORD_ERROR = `${PASSWORD_FORM}//div[contains(@class,'edit-profile-error')]`;
const PASSWORD_SUCCESS = `${PASSWORD_FORM}//div[contains(@class,'edit-profile-success')]`;

const PROFILE_FORM =
  "//h2[normalize-space()='Personal Information']/ancestor::form[1]";
const PROFILE_ERROR = `${PROFILE_FORM}//div[contains(@class,'edit-profile-error')]`;
const PROFILE_SUCCESS = `${PROFILE_FORM}//div[contains(@class,'edit-profile-success')]`;

async function openEditProfile(driver) {
  await click(driver, By.xpath(OPEN_EDIT_PROFILE));
  await waitVisible(driver, By.xpath(EDIT_PROFILE_HEADING));

  // Wait until the profile has loaded into the form.
  await poll(
    async () => (await valueById(driver, "profile-name")).trim().length > 0,
    TIMEOUT,
    "profile data to load"
  );
}

async function backToDashboard(driver, account) {
  await click(driver, By.xpath(BACK_TO_DASHBOARD));
  await driver.wait(until.elementLocated(By.xpath(account.dashboard)), TIMEOUT);
}

async function readText(driver, xpath) {
  const el = await waitVisible(driver, By.xpath(xpath));
  return (await el.getText()).trim();
}

function profileEdits(account) {
  return {
    name: `Selenium ${account.label} ${runId}`,
    phoneNumber: `017${runId}`.slice(0, 11),
    dateOfBirth: account.dob,
    street: `House ${runId}, Road 5`,
    area: "Dhanmondi",
    city: "Dhaka",
    district: "Dhaka",
    postalCode: "1209",
    country: "Bangladesh",
  };
}

async function fillProfileForm(driver, edits) {
  await fillById(driver, "profile-name", edits.name);
  await fillById(driver, "profile-phone", edits.phoneNumber);
  await fillById(driver, "profile-dob", edits.dateOfBirth);
  await fillById(driver, "profile-street", edits.street);
  await fillById(driver, "profile-area", edits.area);
  await fillById(driver, "profile-city", edits.city);
  await fillById(driver, "profile-district", edits.district);
  await fillById(driver, "profile-postal", edits.postalCode);
  await fillById(driver, "profile-country", edits.country);
}

async function submitPasswordForm(driver, current, next, confirm) {
  await fillById(driver, "current-password", current);
  await fillById(driver, "new-password", next);
  await fillById(driver, "confirm-password", confirm);
  await click(driver, By.xpath(UPDATE_PASSWORD));
}

// ======================================================
// SHARED STATE (for cleanup)
// ======================================================

const state = {
  citizen: {},
  worker: {},
  clinicAdmin: {},
  family: {},
};

// ======================================================
// REUSABLE FLOWS (one per behaviour, used for each role)
// ======================================================

async function flowLoginAndOpenEditProfile(driver, key) {
  const account = ACCOUNTS[key];
  await loginViaUi(driver, account);
  await openEditProfile(driver);

  const emailInput = await waitVisible(driver, By.id("profile-email"));
  expect(
    !(await emailInput.isEnabled()),
    `${account.label}: email field must be read-only`
  );
}

async function flowEmptyNameBlocked(driver, key) {
  const account = ACCOUNTS[key];

  const nameInput = await waitVisible(driver, By.id("profile-name"));
  const original = await nameInput.getAttribute("value");

  await setValue(driver, nameInput, "");
  await click(driver, By.xpath(SAVE_PROFILE));
  await sleep(500);

  const missing = await driver.executeScript(
    "return arguments[0].validity.valueMissing;",
    nameInput
  );
  expect(missing, `${account.label}: empty name should be blocked`);

  const successShown = await driver.findElements(By.xpath(PROFILE_SUCCESS));
  expect(
    successShown.length === 0,
    `${account.label}: empty name must not show a success message`
  );

  await setValue(driver, nameInput, original);
}

async function flowEditOwnProfile(driver, key) {
  const account = ACCOUNTS[key];
  const st = state[key];
  const edits = profileEdits(account);

  const before = await apiGetProfile(st.token);

  await fillProfileForm(driver, edits);
  await click(driver, By.xpath(SAVE_PROFILE));

  await poll(
    async () =>
      (await readText(driver, PROFILE_SUCCESS)).includes(
        "updated successfully"
      ),
    TIMEOUT,
    "profile success message"
  );

  // Persisted in the database (API view).
  const after = await apiGetProfile(st.token);
  expect(after.name === edits.name, `${account.label}: name not saved`);
  expect(
    after.phoneNumber === edits.phoneNumber,
    `${account.label}: phone not saved`
  );
  expect(
    String(after.dateOfBirth).slice(0, 10) === edits.dateOfBirth,
    `${account.label}: date of birth not saved`
  );
  expect(
    after.address && after.address.street === edits.street,
    `${account.label}: street not saved`
  );
  expect(
    after.address && after.address.city === edits.city,
    `${account.label}: city not saved`
  );
  expect(
    new Date(after.updatedAt) > new Date(before.updatedAt),
    `${account.label}: updatedAt should move forward`
  );

  // Persisted in the UI (leave the page and come back).
  await backToDashboard(driver, account);
  await openEditProfile(driver);

  expect(
    (await valueById(driver, "profile-name")) === edits.name,
    `${account.label}: name not shown after reopening`
  );
  expect(
    (await valueById(driver, "profile-phone")) === edits.phoneNumber,
    `${account.label}: phone not shown after reopening`
  );
  expect(
    (await valueById(driver, "profile-dob")) === edits.dateOfBirth,
    `${account.label}: date of birth not shown after reopening`
  );
  expect(
    (await valueById(driver, "profile-street")) === edits.street,
    `${account.label}: street not shown after reopening`
  );
}

async function flowPasswordValidation(driver, key) {
  const account = ACCOUNTS[key];

  // 1. Confirm password does not match.
  await submitPasswordForm(
    driver,
    account.password,
    TEMP_PASSWORD,
    `${TEMP_PASSWORD}x`
  );
  await poll(
    async () => (await readText(driver, PASSWORD_ERROR)).includes("do not match"),
    TIMEOUT,
    "password mismatch error"
  );

  // 2. Wrong current password.
  await submitPasswordForm(driver, WRONG_PASSWORD, TEMP_PASSWORD, TEMP_PASSWORD);
  await poll(
    async () =>
      (await readText(driver, PASSWORD_ERROR))
        .toLowerCase()
        .includes("current password is incorrect"),
    TIMEOUT,
    "wrong current password error"
  );

  // 3. Weak new password is rejected by the API.
  await submitPasswordForm(
    driver,
    account.password,
    WEAK_PASSWORD,
    WEAK_PASSWORD
  );
  await poll(
    async () => (await readText(driver, PASSWORD_ERROR)).includes("Password must contain"),
    TIMEOUT,
    "weak password error"
  );

  // Nothing above may have changed the real password.
  const stillWorks = await apiLogin(account.email, account.password);
  expect(
    stillWorks.status === 200,
    `${account.label}: password changed even though validation failed`
  );
}

async function flowPasswordChangeSuccess(driver, key) {
  const account = ACCOUNTS[key];
  const st = state[key];

  // Mark before submitting so cleanup runs even if an assertion fails later.
  st.passwordMayBeChanged = true;

  await submitPasswordForm(driver, account.password, TEMP_PASSWORD, TEMP_PASSWORD);
  await poll(
    async () =>
      (await readText(driver, PASSWORD_SUCCESS)).includes(
        "Password changed successfully"
      ),
    TIMEOUT,
    "password success message"
  );

  const withNew = await apiLogin(account.email, TEMP_PASSWORD);
  expect(withNew.status === 200, `${account.label}: new password does not work`);

  const withOld = await apiLogin(account.email, account.password);
  expect(
    withOld.status === 401,
    `${account.label}: old password must stop working (got ${withOld.status})`
  );

  // Hashed storage check (needs DB access; skipped if not available).
  let hash;
  try {
    hash = await getStoredPasswordHash(account.email);
  } catch (e) {
    if (e instanceof SkipTest) {
      console.log(`        (hash check skipped: ${e.message})`);
      return;
    }
    throw e;
  }

  expect(typeof hash === "string", `${account.label}: stored hash not found`);
  expect(hash !== TEMP_PASSWORD, `${account.label}: password stored as plain text`);
  expect(/^\$2[aby]\$/.test(hash), `${account.label}: password is not a bcrypt hash`);
}

async function flowClinicReadOnly(driver, key) {
  const account = ACCOUNTS[key];
  const st = state[key];

  // The Edit Profile page must not offer an editable clinic field.
  const editable = await driver.executeScript(`
    return Array.from(
      document.querySelectorAll("input, select, textarea")
    ).filter((el) => {
      const text = [el.name, el.id, el.placeholder].join(" ").toLowerCase();
      return text.includes("clinic") && !el.disabled && !el.readOnly;
    }).length;
  `);
  expect(editable === 0, `${account.label}: clinic must not be editable`);

  // The API must refuse clinic / role changes through the profile route.
  const attempt = await api("PATCH", "/auth/profile", {
    token: st.token,
    body: { clinicId: "000000000000000000000000" },
  });
  expect(
    attempt.status === 400,
    `${account.label}: clinicId change should return 400 (got ${attempt.status})`
  );

  const roleAttempt = await api("PATCH", "/auth/profile", {
    token: st.token,
    body: { role: "admin" },
  });
  expect(
    roleAttempt.status === 400,
    `${account.label}: role change should return 400 (got ${roleAttempt.status})`
  );
}

async function flowClinicNameUnchanged(driver, key, clinicNameBefore) {
  const account = ACCOUNTS[key];
  await backToDashboard(driver, account);

  if (key === "clinicAdmin") {
    const clinicNameAfter = await readText(
      driver,
      "//p[normalize-space()='MY CLINIC']/following-sibling::h2[1]"
    );
    expect(
      clinicNameAfter === clinicNameBefore,
      `${account.label}: clinic name changed after profile edit`
    );
  }
}

// ======================================================
// TEST CASES
// ======================================================

const cases = [];
const tc = (id, title, fn) => cases.push({ id, title, fn });

// ---------- Setup ----------

tc("SETUP-01", "API logins and original profile snapshots", async () => {
  for (const key of Object.keys(ACCOUNTS)) {
    const account = ACCOUNTS[key];
    const res = await apiLogin(account.email, account.password);

    expect(
      res.status === 200,
      `${account.label}: API login failed (${res.status}). Check credentials.`
    );

    state[key].token = res.data.token;
    state[key].userId = res.data.user.id;
    state[key].original = await apiGetProfile(res.data.token);
  }
});

// ---------- Citizen ----------

tc("CIT-01", "Citizen opens Edit Profile; email is read-only", async (d) => {
  await flowLoginAndOpenEditProfile(d, "citizen");
});

tc("CIT-02", "Citizen cannot save an empty name", async (d) => {
  await flowEmptyNameBlocked(d, "citizen");
});

tc("CIT-03", "Citizen edits own profile and it persists", async (d) => {
  await flowEditOwnProfile(d, "citizen");
});

tc("CIT-04", "Citizen change password: mismatch, wrong current, weak rejected", async (d) => {
  await flowPasswordValidation(d, "citizen");
});

tc("CIT-05", "Citizen changes password; new works, old fails, hash stored", async (d) => {
  await flowPasswordChangeSuccess(d, "citizen");
});

// ---------- Family member (guardian) ----------

tc("FAM-01", "Guardian edits a linked family member from Family Account", async (d) => {
  const st = state.citizen;

  // Fresh citizen session. The password may have been changed above, so
  // restore it before logging in again through the UI.
  await restorePassword("citizen");

  // Create the member to edit (setup through API for speed).
  const created = await api("POST", "/family", {
    token: st.token,
    body: {
      name: FAMILY_NAME_BEFORE,
      dateOfBirth: "2018-06-10",
      gender: "Female",
      relationship: "Child",
    },
  });
  expect(created.status === 201, `Family setup failed (${created.status})`);
  state.family.id = created.data.familyMember._id;

  await loginViaUi(d, ACCOUNTS.citizen);

  await click(d, By.xpath("//button[contains(normalize-space(),'Family Account')]"));
  await waitVisible(d, By.xpath("//h1[normalize-space()='Family Account']"));

  // Open the member's profile from the card, then press Edit Profile.
  await click(
    d,
    By.xpath(
      `//div[contains(@class,'family-member-card')][.//h3[normalize-space()='${FAMILY_NAME_BEFORE}']]` +
        "//button[contains(normalize-space(),'View Profile')]"
    )
  );
  await click(d, By.css("button.family-profile-edit"));

  const nameInput = await waitVisible(d, By.css("form input[name='name']"));
  await setValue(d, nameInput, FAMILY_NAME_AFTER);
  await setValue(d, await d.findElement(By.css("form input[name='phoneNumber']")), "01811112222");
  await setValue(d, await d.findElement(By.css("form input[name='dateOfBirth']")), "2017-03-02");
  await setValue(d, await d.findElement(By.css("form input[name='street']")), `Family House ${runId}`);
  await setValue(d, await d.findElement(By.css("form input[name='city']")), "Dhaka");

  await click(d, By.xpath("//button[@type='submit' and normalize-space()='Save Changes']"));

  // The page reports success with a browser alert.
  await d.wait(until.alertIsPresent(), TIMEOUT);
  const alert = await d.switchTo().alert();
  const alertText = await alert.getText();
  await alert.accept();
  expect(
    alertText.toLowerCase().includes("updated successfully"),
    `Unexpected family update message: "${alertText}"`
  );

  // Persisted (API view).
  const list = await api("GET", "/family", { token: st.token });
  expect(list.status === 200, `GET /family returned ${list.status}`);
  const members = list.data.familyMembers || list.data.members || list.data;
  const updated = (Array.isArray(members) ? members : []).find(
    (m) => m._id === state.family.id
  );
  expect(updated, "Updated family member not returned by API");
  expect(updated.name === FAMILY_NAME_AFTER, "Family name not saved");
  expect(updated.phoneNumber === "01811112222", "Family phone not saved");
  expect(
    String(updated.dateOfBirth).slice(0, 10) === "2017-03-02",
    "Family date of birth not saved"
  );
  expect(
    updated.address && updated.address.street === `Family House ${runId}`,
    "Family address not saved"
  );

  // Persisted (UI view).
  await poll(
    async () =>
      (
        await d.findElements(
          By.xpath(`//*[normalize-space()='${FAMILY_NAME_AFTER}']`)
        )
      ).length > 0,
    TIMEOUT,
    "edited family member name in the UI"
  );
});

tc("FAM-02", "Guardian cannot save invalid family data (API validation)", async () => {
  const st = state.citizen;
  expect(state.family.id, "Family member was not created");

  const badGender = await api("PATCH", `/family/${state.family.id}`, {
    token: st.token,
    body: { gender: "Robot" },
  });
  expect(badGender.status === 400, `Invalid gender should be 400 (got ${badGender.status})`);

  const emptyName = await api("PATCH", `/family/${state.family.id}`, {
    token: st.token,
    body: { name: "   " },
  });
  expect(emptyName.status === 400, `Empty name should be 400 (got ${emptyName.status})`);

  const badField = await api("PATCH", `/family/${state.family.id}`, {
    token: st.token,
    body: { guardianId: state.worker.userId },
  });
  expect(
    badField.status === 400,
    `Changing guardianId should be 400 (got ${badField.status})`
  );
});

// ---------- Health worker ----------

tc("WRK-01", "Worker opens Edit Profile; email is read-only", async (d) => {
  await flowLoginAndOpenEditProfile(d, "worker");
});

tc("WRK-02", "Worker cannot save an empty name", async (d) => {
  await flowEmptyNameBlocked(d, "worker");
});

tc("WRK-03", "Worker edits own profile and it persists", async (d) => {
  await flowEditOwnProfile(d, "worker");
});

tc("WRK-04", "Worker clinic is not editable (UI and API)", async (d) => {
  await flowClinicReadOnly(d, "worker");
});

tc("WRK-05", "Worker change password: mismatch, wrong current, weak rejected", async (d) => {
  await flowPasswordValidation(d, "worker");
});

tc("WRK-06", "Worker changes password; new works, old fails, hash stored", async (d) => {
  await flowPasswordChangeSuccess(d, "worker");
});

// ---------- Clinic admin ----------

let clinicNameBefore = null;

tc("ADM-01", "Clinic admin opens Edit Profile; email is read-only", async (d) => {
  await loginViaUi(d, ACCOUNTS.clinicAdmin);

  clinicNameBefore = await readText(
    d,
    "//p[normalize-space()='MY CLINIC']/following-sibling::h2[1]"
  );
  expect(clinicNameBefore.length > 0, "Clinic name should be shown on the dashboard");

  await openEditProfile(d);
  const emailInput = await waitVisible(d, By.id("profile-email"));
  expect(!(await emailInput.isEnabled()), "Clinic admin: email field must be read-only");
});

tc("ADM-02", "Clinic admin cannot save an empty name", async (d) => {
  await flowEmptyNameBlocked(d, "clinicAdmin");
});

tc("ADM-03", "Clinic admin edits own profile and it persists", async (d) => {
  await flowEditOwnProfile(d, "clinicAdmin");
});

tc("ADM-04", "Clinic name is read-only and unchanged after editing", async (d) => {
  await flowClinicReadOnly(d, "clinicAdmin");
  await flowClinicNameUnchanged(d, "clinicAdmin", clinicNameBefore);
  await openEditProfile(d);
});

tc("ADM-05", "Clinic admin change password: mismatch, wrong current, weak rejected", async (d) => {
  await flowPasswordValidation(d, "clinicAdmin");
});

tc("ADM-06", "Clinic admin changes password; new works, old fails, hash stored", async (d) => {
  await flowPasswordChangeSuccess(d, "clinicAdmin");
});

// ---------- Editing another user's profile is blocked ----------

tc("SEC-01", "Profile and password APIs reject requests without a login", async () => {
  const patch = await api("PATCH", "/auth/profile", { body: { name: "Intruder" } });
  expect(patch.status === 401, `Unauthenticated PATCH should be 401 (got ${patch.status})`);

  const get = await api("GET", "/auth/profile");
  expect(get.status === 401, `Unauthenticated GET should be 401 (got ${get.status})`);

  const pw = await api("POST", "/auth/change-password", {
    body: { currentPassword: "x", newPassword: TEMP_PASSWORD },
  });
  expect(pw.status === 401, `Unauthenticated change-password should be 401 (got ${pw.status})`);

  const fam = await api("PATCH", `/family/${state.family.id}`, {
    body: { name: "Intruder" },
  });
  expect(fam.status === 401, `Unauthenticated family PATCH should be 401 (got ${fam.status})`);
});

tc("SEC-02", "A user cannot target another user through the profile API", async () => {
  const citizen = state.citizen;
  const worker = state.worker;

  const workerBefore = await apiGetProfile(worker.token);
  const citizenBefore = await apiGetProfile(citizen.token);

  for (const body of [
    { _id: worker.userId, name: "Hacked" },
    { userId: worker.userId, name: "Hacked" },
    { id: worker.userId, name: "Hacked" },
    { email: "hacker@example.com" },
    { role: "admin" },
    { password: "Hacked@12345" },
  ]) {
    const res = await api("PATCH", "/auth/profile", { token: citizen.token, body });
    expect(
      res.status === 400,
      `PATCH ${JSON.stringify(Object.keys(body))} should be 400 (got ${res.status})`
    );
  }

  const workerAfter = await apiGetProfile(worker.token);
  const citizenAfter = await apiGetProfile(citizen.token);

  expect(workerAfter.name === workerBefore.name, "Worker profile was changed by another user");
  expect(
    String(workerAfter.updatedAt) === String(workerBefore.updatedAt),
    "Worker updatedAt changed after another user's attempt"
  );
  expect(citizenAfter.email === citizenBefore.email, "Citizen email was changed");
  expect(citizenAfter.role === citizenBefore.role, "Citizen role was changed");
});

tc("SEC-03", "Only the guardian can edit a family member", async () => {
  expect(state.family.id, "Family member was not created");

  const guardianView = async () => {
    const res = await api("GET", "/family", { token: state.citizen.token });
    const members = res.data.familyMembers || res.data.members || res.data;
    return (Array.isArray(members) ? members : []).find(
      (m) => m._id === state.family.id
    );
  };

  const before = await guardianView();
  expect(before, "Family member not visible to guardian");

  for (const key of ["worker", "clinicAdmin"]) {
    const res = await api("PATCH", `/family/${state.family.id}`, {
      token: state[key].token,
      body: { name: `Hacked by ${key}`, phoneNumber: "00000000000" },
    });
    expect(
      res.status === 404,
      `${ACCOUNTS[key].label} editing someone else's family member should be 404 (got ${res.status})`
    );
  }

  const after = await guardianView();
  expect(after.name === before.name, "Family member name changed by a non-guardian");
  expect(
    after.phoneNumber === before.phoneNumber,
    "Family member phone changed by a non-guardian"
  );
});

tc("SEC-04", "Malformed family id is rejected", async () => {
  const res = await api("PATCH", "/family/not-an-id", {
    token: state.citizen.token,
    body: { name: "Whatever" },
  });
  expect(res.status === 400, `Malformed id should be 400 (got ${res.status})`);
});

// ======================================================
// CLEANUP
// ======================================================

async function restorePassword(key) {
  const account = ACCOUNTS[key];
  const st = state[key];

  if (!st.passwordMayBeChanged) return;

  try {
    await setStoredPassword(account.email, account.password);
    st.passwordMayBeChanged = false;
    return;
  } catch (e) {
    // Fall through to the API route below.
  }

  // Fallback: only possible if the original password is itself strong.
  const res = await api("POST", "/auth/change-password", {
    token: st.token,
    body: { currentPassword: TEMP_PASSWORD, newPassword: account.password },
  });

  if (res.status === 200) {
    st.passwordMayBeChanged = false;
  } else {
    console.log(
      `WARNING: could not restore password for ${account.email}. ` +
        `It is currently "${TEMP_PASSWORD}".`
    );
  }
}

async function restoreProfile(key) {
  const st = state[key];
  if (!st.token || !st.original) return;

  const original = st.original;
  const addressFields = ["street", "area", "city", "district", "postalCode", "country"];

  let address = null;
  if (original.address && typeof original.address === "object") {
    address = {};
    for (const f of addressFields) {
      address[f] = original.address[f] ?? null;
    }
  }

  const res = await api("PATCH", "/auth/profile", {
    token: st.token,
    body: {
      name: original.name,
      phoneNumber: original.phoneNumber ?? null,
      dateOfBirth: original.dateOfBirth
        ? String(original.dateOfBirth).slice(0, 10)
        : null,
      address,
    },
  });

  if (res.status !== 200) {
    console.log(
      `WARNING: could not restore profile for ${ACCOUNTS[key].email} (${res.status})`
    );
  }
}

async function cleanup() {
  console.log("\nCleaning up test data...");

  for (const key of Object.keys(ACCOUNTS)) {
    try {
      await restorePassword(key);
    } catch (e) {
      console.log(`WARNING: password cleanup failed for ${key}: ${e.message}`);
    }
    try {
      await restoreProfile(key);
    } catch (e) {
      console.log(`WARNING: profile cleanup failed for ${key}: ${e.message}`);
    }
  }

  console.log(
    `Note: family member "${FAMILY_NAME_AFTER}" remains (no delete endpoint).`
  );
}

// ======================================================
// RUNNER
// ======================================================

async function main() {
  const options = new chrome.Options().addArguments("--window-size=1440,1000");

  if (process.env.HEADLESS === "1") {
    options.addArguments("--headless=new");
  }

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  const results = [];

  try {
    console.log("\n========================================");
    console.log("   EDIT PROFILE END-TO-END SELENIUM TEST");
    console.log("========================================\n");

    for (const testCase of cases) {
      try {
        await testCase.fn(driver);
        results.push({ id: testCase.id, status: "PASS" });
        console.log(`PASSED  ${testCase.id} - ${testCase.title}`);
      } catch (error) {
        if (error instanceof SkipTest) {
          results.push({ id: testCase.id, status: "SKIP" });
          console.log(`SKIPPED ${testCase.id} - ${testCase.title}`);
          console.log(`        ${error.message}`);
        } else {
          results.push({ id: testCase.id, status: "FAIL" });
          console.log(`FAILED  ${testCase.id} - ${testCase.title}`);
          console.log(`        ${error.message}`);
        }

        // A failed or skipped case may leave an open alert.
        try {
          const alert = await driver.switchTo().alert();
          await alert.accept();
        } catch (_) {
          /* no alert */
        }
      }
    }

    await logoutViaUi(driver);

    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    const skipped = results.filter((r) => r.status === "SKIP").length;

    console.log("\n========================================");
    console.log("            TEST RESULT");
    console.log("========================================");
    console.log(`Total  : ${results.length}`);
    console.log(`Passed : ${passed}`);
    console.log(`Failed : ${failed}`);
    console.log(`Skipped: ${skipped}`);
    console.log("========================================\n");

    if (failed > 0) process.exitCode = 1;
  } catch (error) {
    console.log("\nEdit profile test could not run!");
    console.log(error.message || error);
    process.exitCode = 1;
  } finally {
    await cleanup();

    if (process.env.KEEP_OPEN !== "1") {
      await driver.quit();
    }
  }
}

main();