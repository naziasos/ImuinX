const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = "http://localhost:5173";

const CLINIC_ADMIN_EMAIL = "23201030@uap-bd.edu";
const CLINIC_ADMIN_PASSWORD = "nurjahan@123";

const TIMEOUT = 10000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function poll(fn, timeout = TIMEOUT, what = "condition") {
  const end = Date.now() + timeout;
  let lastError;

  while (Date.now() < end) {
    try {
      const result = await fn();

      if (result) {
        return result;
      }
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

/* =========================================================
   LOCATORS
========================================================= */

// Login
const NAV_LOGIN =
  "//nav//button[normalize-space()='Login']";

const LOGIN_BUTTON =
  "//button[@type='submit']";

// Clinic Admin Dashboard
const CLINIC_ADMIN_DASHBOARD =
  "//h1[normalize-space()='Clinic Admin Dashboard']";

// Worker Management
const WORKER_NAV =
  "//button[contains(normalize-space(),'Worker')]";

const ADD_WORKER_BUTTON =
  "//button[contains(normalize-space(),'Add Worker')]";

// Worker form
const WORKER_NAME =
  "//input[@name='name']";

const WORKER_EMAIL =
  "//input[@name='email']";

const WORKER_PASSWORD =
  "//input[@name='password']";

// Success/error messages
const SUCCESS_MESSAGE =
  "//*[contains(@class,'bg-emerald-50') or contains(@class,'bg-green-50')]";

const ERROR_MESSAGE =
  "//*[contains(@class,'bg-red-50')]";

// Worker list
const WORKER_TABLE =
  "//tbody";


// Worker dashboard
const WORKER_DASHBOARD =
  "//h1[contains(normalize-space(),'Worker Dashboard')]";

// Assigned clinic
const ASSIGNED_CLINIC =
  "//*[contains(normalize-space(),'Assigned Clinic')]";


/* =========================================================
   TEST DATA
========================================================= */

const runId = new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(4, 14);

const WORKER_EMAIL_TEST =
  `selenium.worker.${runId}@test.com`;

const WORKER_NAME_TEST =
  `Selenium Worker ${runId}`;

const WORKER_PASSWORD_TEST =
  "Worker@123";


/* =========================================================
   LOGIN AS CLINIC ADMIN
========================================================= */

async function loginAsClinicAdmin(driver) {

  await driver.get(BASE_URL);

  const loginBtn = await driver.wait(
    until.elementLocated(By.xpath(NAV_LOGIN)),
    15000
  );

  await loginBtn.click();

  const emailField = await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );

  await emailField.sendKeys(CLINIC_ADMIN_EMAIL);

  await driver
    .findElement(By.name("password"))
    .sendKeys(CLINIC_ADMIN_PASSWORD);

  await driver
    .findElement(By.css("button[type='submit']"))
    .click();

  await driver.wait(
    until.elementLocated(By.xpath(CLINIC_ADMIN_DASHBOARD)),
    15000
  );

  console.log("Clinic Admin login successful.");
}


/* =========================================================
   OPEN WORKER MANAGEMENT
========================================================= */

async function openWorkerManagement(driver) {

  const workerButton = await driver.wait(
    until.elementLocated(By.xpath(WORKER_NAV)),
    TIMEOUT
  );

  await workerButton.click();

  await driver.wait(
    until.elementLocated(By.xpath(ADD_WORKER_BUTTON)),
    TIMEOUT
  );

  console.log("Worker Management page opened.");
}


/* =========================================================
   ADD WORKER
========================================================= */

async function addWorker(driver) {

  const addButton = await driver.wait(
    until.elementLocated(By.xpath(ADD_WORKER_BUTTON)),
    TIMEOUT
  );

  await addButton.click();

  await driver.wait(
    until.elementLocated(By.name("name")),
    TIMEOUT
  );

  await driver
    .findElement(By.name("name"))
    .sendKeys(WORKER_NAME_TEST);

  await driver
    .findElement(By.name("email"))
    .sendKeys(WORKER_EMAIL_TEST);

  await driver
    .findElement(By.name("password"))
    .sendKeys(WORKER_PASSWORD_TEST);

  await driver
    .findElement(By.css("button[type='submit']"))
    .click();

  await poll(
    async () => {
      const messages = await driver.findElements(
        By.xpath(SUCCESS_MESSAGE)
      );

      return messages.length > 0;
    },
    TIMEOUT,
    "worker creation success message"
  );

  console.log("Worker created successfully.");
}


/* =========================================================
   VERIFY WORKER APPEARS IN LIST
========================================================= */

async function verifyWorkerInList(driver) {

  const workerRow = await poll(
    async () => {

      const rows = await driver.findElements(
        By.xpath(
          `//tbody/tr[contains(.,'${WORKER_EMAIL_TEST}')]`
        )
      );

      return rows.length > 0;
    },
    TIMEOUT,
    "new worker in worker list"
  );

  expect(
    workerRow,
    "Newly created worker was not found in worker list."
  );

  console.log("Worker appears in worker list.");
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout(driver) {

  const logoutButtons = await driver.findElements(
    By.xpath("//button[contains(normalize-space(),'Logout')]")
  );

  if (logoutButtons.length > 0) {
    await logoutButtons[0].click();
  } else {

    // Fallback if your application stores login
    // information in localStorage.
    await driver.executeScript(
      "localStorage.clear();"
    );

    await driver.navigate().refresh();
  }

  await driver.wait(
    until.elementLocated(By.xpath(NAV_LOGIN)),
    TIMEOUT
  );

  console.log("Clinic Admin logged out.");
}


/* =========================================================
   LOGIN AS WORKER
========================================================= */

async function loginAsWorker(driver) {

  const loginButton = await driver.wait(
    until.elementLocated(By.xpath(NAV_LOGIN)),
    TIMEOUT
  );

  await loginButton.click();

  await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );

  await driver
    .findElement(By.name("email"))
    .sendKeys(WORKER_EMAIL_TEST);

  await driver
    .findElement(By.name("password"))
    .sendKeys(WORKER_PASSWORD_TEST);

  await driver
    .findElement(By.css("button[type='submit']"))
    .click();

  await driver.wait(
    until.elementLocated(By.xpath(WORKER_DASHBOARD)),
    15000
  );

  console.log("Worker login successful.");
}


/* =========================================================
   VERIFY ASSIGNED CLINIC
========================================================= */

async function verifyAssignedClinic(driver) {

  const clinicElement = await driver.wait(
    until.elementLocated(By.xpath(ASSIGNED_CLINIC)),
    TIMEOUT
  );

  expect(
    await clinicElement.isDisplayed(),
    "Assigned Clinic information is not displayed."
  );

  const clinicText = await clinicElement.getText();

  expect(
    clinicText.trim().length > 0,
    "Assigned Clinic information is empty."
  );

  console.log(
    `Assigned clinic displayed: ${clinicText}`
  );
}


/* =========================================================
   TEST CASES
========================================================= */

const cases = [];

function tc(id, title, fn) {
  cases.push({
    id,
    title,
    fn,
  });
}


/* ---------------------------------------------------------
   TC-01
--------------------------------------------------------- */

tc(
  "TC-CA-01",
  "Clinic Admin login and open Worker Management",
  async (driver) => {

    await loginAsClinicAdmin(driver);

    await openWorkerManagement(driver);

    const addButton = await driver.findElements(
      By.xpath(ADD_WORKER_BUTTON)
    );

    expect(
      addButton.length > 0,
      "Add Worker button is not displayed."
    );
  }
);


/* ---------------------------------------------------------
   TC-02
--------------------------------------------------------- */

tc(
  "TC-CA-02",
  "Clinic Admin adds a new worker",
  async (driver) => {

    await addWorker(driver);

    const workerRows = await driver.findElements(
      By.xpath(
        `//tbody/tr[contains(.,'${WORKER_EMAIL_TEST}')]`
      )
    );

    expect(
      workerRows.length > 0,
      "Created worker is not displayed in worker list."
    );
  }
);


/* ---------------------------------------------------------
   TC-03
--------------------------------------------------------- */

tc(
  "TC-CA-03",
  "Worker appears in worker list",
  async (driver) => {

    await verifyWorkerInList(driver);
  }
);


/* ---------------------------------------------------------
   TC-04
--------------------------------------------------------- */

tc(
  "TC-CA-04",
  "Worker can log in",
  async (driver) => {

    await logout(driver);

    await loginAsWorker(driver);

    const dashboard = await driver.findElements(
      By.xpath(WORKER_DASHBOARD)
    );

    expect(
      dashboard.length > 0,
      "Worker Dashboard was not displayed."
    );
  }
);


/* ---------------------------------------------------------
   TC-05
--------------------------------------------------------- */

tc(
  "TC-CA-05",
  "Worker can view assigned clinic",
  async (driver) => {

    await verifyAssignedClinic();
  }
);


/* ---------------------------------------------------------
   TC-06 - COMPLETE E2E FLOW
--------------------------------------------------------- */

tc(
  "TC-CA-06",
  "Full flow: Clinic Admin adds worker -> Worker logs in -> Assigned clinic displayed",
  async (driver) => {

    /*
      Step 1:
      Clinic Admin logs in
    */

    await loginAsClinicAdmin(driver);

    /*
      Step 2:
      Open Worker Management
    */

    await openWorkerManagement(driver);

    /*
      Step 3:
      Add Worker
    */

    await addWorker(driver);

    /*
      Step 4:
      Verify worker exists
    */

    await verifyWorkerInList(driver);

    /*
      Step 5:
      Logout Clinic Admin
    */

    await logout(driver);

    /*
      Step 6:
      Login as newly created Worker
    */

    await loginAsWorker(driver);

    /*
      Step 7:
      Verify Worker Dashboard
    */

    const dashboard = await driver.findElements(
      By.xpath(WORKER_DASHBOARD)
    );

    expect(
      dashboard.length > 0,
      "Worker Dashboard not displayed."
    );

    /*
      Step 8:
      Verify assigned clinic
    */

    await verifyAssignedClinic();

    console.log(
      "Complete Clinic Admin -> Worker flow passed."
    );
  }
);


/* =========================================================
   MAIN TEST RUNNER
========================================================= */

async function clinicWorkerFlowTest() {

  const options = new chrome.Options()
    .addArguments("--window-size=1440,1000");

  if (process.env.HEADLESS === "1") {
    options.addArguments("--headless=new");
  }

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  const results = [];

  try {

    console.log("");
    console.log("========================================");
    console.log(" CLINIC ADMIN -> WORKER SELENIUM TEST");
    console.log("========================================");
    console.log("");

    console.log("Running test cases...");
    console.log("");

    for (const c of cases) {

      try {

        await c.fn(driver);

        results.push({
          id: c.id,
          title: c.title,
          status: "PASS",
        });

        console.log(
          `PASSED  ${c.id} - ${c.title}`
        );

      } catch (error) {

        results.push({
          id: c.id,
          title: c.title,
          status: "FAIL",
          note: error.message,
        });

        console.log(
          `FAILED  ${c.id} - ${c.title}`
        );

        console.log(
          `        ${error.message}`
        );
      }
    }

    const passed = results.filter(
      (r) => r.status === "PASS"
    ).length;

    const failed = results.filter(
      (r) => r.status === "FAIL"
    ).length;

    console.log("");
    console.log("========================================");
    console.log(" TEST RESULT");
    console.log("========================================");

    console.log(`Total : ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(
      `Result: ${passed}/${results.length} passed`
    );

    console.log("========================================");
    console.log("");

    if (failed) {
      process.exitCode = 1;
    }

  } catch (error) {

    console.log("");
    console.log("Clinic Worker Selenium test could not run!");
    console.log(error.message || error);

    process.exitCode = 1;

  } finally {

    if (process.env.KEEP_OPEN !== "1") {
      await driver.quit();
    }
  }
}

clinicWorkerFlowTest();