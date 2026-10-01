
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL =
  process.env.BASE_URL || "http://localhost:5173";

const WORKER_EMAIL =
  process.env.WORKER_EMAIL || "23201046@uap-bd.edu";

const WORKER_PASSWORD =
  process.env.WORKER_PASSWORD || "8s6l7e";

const CITIZEN_EMAIL =
  process.env.CITIZEN_EMAIL || "";

const CITIZEN_PASSWORD =
  process.env.CITIZEN_PASSWORD || "";

const TIMEOUT = 15000;


/* =========================================================
   COMMON ASSERTION
========================================================= */

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class Skip extends Error {}


/* =========================================================
   TEST DATA
========================================================= */

const ctx = {
  doseLogged: false,
  vaccineName: null,
  batchName: null,
};


/* =========================================================
   COMMON HELPERS
========================================================= */

async function resetSession(driver) {
  await driver.get(BASE_URL);

  await driver.executeScript(
    "localStorage.clear(); sessionStorage.clear();"
  );

  await driver.navigate().refresh();
}


async function loginViaUi(
  driver,
  email,
  password,
  dashboardText
) {
  await resetSession(driver);

  const loginButton = await driver.wait(
    until.elementLocated(
      By.xpath("//nav//button[normalize-space()='Login']")
    ),
    TIMEOUT
  );

  await loginButton.click();

  const emailField = await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );

  await emailField.sendKeys(email);

  await driver
    .findElement(By.name("password"))
    .sendKeys(password);

  await driver
    .findElement(By.css("button[type='submit']"))
    .click();

  await driver.wait(
    until.elementLocated(
      By.xpath(
        `//h1[contains(normalize-space(),'${dashboardText}')]`
      )
    ),
    TIMEOUT
  );
}


async function logout(driver) {
  const buttons = await driver.findElements(
    By.css("button.clinic-logout")
  );

  if (buttons.length > 0) {
    await buttons[0].click();
  } else {
    await driver.executeScript(
      "localStorage.clear(); sessionStorage.clear();"
    );

    await driver.navigate().refresh();
  }

  await driver.wait(
    until.elementLocated(
      By.xpath("//nav//button[normalize-space()='Login']")
    ),
    TIMEOUT
  );
}


/* =========================================================
   US-08 PRECONDITION
   Worker logs a dose
========================================================= */

async function loginAsWorker(driver) {
  await loginViaUi(
    driver,
    WORKER_EMAIL,
    WORKER_PASSWORD,
    "Worker Dashboard"
  );
}


async function openLogDose(driver) {
  const logDoseButton = await driver.wait(
    until.elementLocated(
      By.xpath(
        "//button[contains(normalize-space(),'Log Dose')]"
      )
    ),
    TIMEOUT
  );

  await logDoseButton.click();

  await driver.wait(
    until.elementLocated(
      By.xpath("//h1[normalize-space()='Log a Dose']")
    ),
    TIMEOUT
  );
}


async function selectCitizen(driver) {
  /*
   * This uses the first available citizen
   * from the worker's search result.
   */

  const searchBox = await driver.wait(
    until.elementLocated(
      By.css(
        "input[placeholder*='Type at least 2 letters']"
      )
    ),
    TIMEOUT
  );

  await searchBox.sendKeys("Tan");

  await driver.sleep(1000);

  const citizens = await driver.findElements(
    By.css(".logdose-dropdown-item")
  );

  expect(
    citizens.length > 0,
    "No citizen was found in the Log Dose search."
  );

  await citizens[0].click();
}


async function selectVaccineAndBatch(driver) {
  const vaccine = await driver.wait(
    until.elementLocated(
      By.css(".logdose-tile")
    ),
    TIMEOUT
  );

  const vaccineName = (
    await vaccine.getText()
  )
    .replace("💊", "")
    .trim();

  await vaccine.click();

  const batch = await driver.wait(
    until.elementLocated(
      By.css(".logdose-batch-card")
    ),
    TIMEOUT
  );

  const batchName = await batch
    .findElement(By.css("strong"))
    .getText();

  await batch.click();

  return {
    vaccineName,
    batchName,
  };
}


async function logDose(driver) {
  const submitButton = await driver.wait(
    until.elementLocated(
      By.xpath(
        "//button[@type='submit' and normalize-space()='Log Dose']"
      )
    ),
    TIMEOUT
  );

  await submitButton.click();

  await driver.wait(
    until.elementLocated(
      By.xpath("//h2[normalize-space()='Dose Logged']")
    ),
    TIMEOUT
  );
}


/*
 * Complete US-08 flow.
 */

async function createDoseForRecordTest(driver) {
  await loginAsWorker(driver);

  await openLogDose(driver);

  await selectCitizen(driver);

  const {
    vaccineName,
    batchName,
  } = await selectVaccineAndBatch(driver);

  await logDose(driver);

  ctx.vaccineName = vaccineName;
  ctx.batchName = batchName;
  ctx.doseLogged = true;

  console.log(
    `US-08 dose created: ${vaccineName} / ${batchName}`
  );

  await logout(driver);
}


/* =========================================================
   CITIZEN RECORD PAGE
========================================================= */

async function loginAsCitizen(driver) {
  if (!CITIZEN_EMAIL || !CITIZEN_PASSWORD) {
    throw new Skip(
      "Set CITIZEN_EMAIL and CITIZEN_PASSWORD."
    );
  }

  await loginViaUi(
    driver,
    CITIZEN_EMAIL,
    CITIZEN_PASSWORD,
    "Citizen Dashboard"
  );
}


async function openVaccinationRecord(driver) {
  const vaccinationButton = await driver.wait(
    until.elementLocated(
      By.xpath(
        "//button[contains(@class,'clinic-nav-item') and contains(normalize-space(),'My Vaccinations')]"
      )
    ),
    TIMEOUT
  );

  await vaccinationButton.click();

  await driver.wait(
    until.elementLocated(
      By.xpath(
        "//h1[normalize-space()='My Vaccination Record']"
      )
    ),
    TIMEOUT
  );
}


/* =========================================================
   TEST CASES
========================================================= */

const cases = [];

function tc(id, category, title, fn) {
  cases.push({
    id,
    category,
    title,
    fn,
  });
}


/* ---------------------------------------------------------
   CATEGORY 1
   Navigation & Access
--------------------------------------------------------- */

tc(
  "SR-01",
  "Navigation & Access",
  "Citizen can open My Vaccination Record from the dashboard",
  async (driver) => {
    await loginAsCitizen(driver);

    await openVaccinationRecord(driver);

    const heading = await driver.findElement(
      By.xpath(
        "//h1[normalize-space()='My Vaccination Record']"
      )
    );

    expect(
      await heading.isDisplayed(),
      "My Vaccination Record heading is not visible."
    );

    await logout(driver);
  }
);


/* ---------------------------------------------------------
   CATEGORY 2
   Record Loading
--------------------------------------------------------- */

tc(
  "SR-02",
  "Record Loading",
  "Vaccination record loads successfully after a dose is logged",
  async (driver) => {
    /*
     * US-08 precondition:
     * Worker logs a dose first.
     */

    await createDoseForRecordTest(driver);

    await loginAsCitizen(driver);

    await openVaccinationRecord(driver);

    /*
     * The page should not remain in loading state.
     */

    const loadingMessages = await driver.findElements(
      By.xpath(
        "//*[contains(normalize-space(),'Loading your vaccination records')]"
      )
    );

    expect(
      loadingMessages.length === 0,
      "Vaccination record page is still showing loading state."
    );

    /*
     * A vaccination history table should exist.
     */

    const table = await driver.findElements(
      By.css(".vaccination-table")
    );

    expect(
      table.length > 0,
      "Vaccination history table was not displayed."
    );

    await logout(driver);
  }
);


/* ---------------------------------------------------------
   CATEGORY 3
   Dose Data Verification
--------------------------------------------------------- */

tc(
  "SR-03",
  "Dose Data Verification",
  "Dose logged through US-08 appears with correct vaccine and batch",
  async (driver) => {
    /*
     * Create a fresh dose so this test is independent.
     */

    await createDoseForRecordTest(driver);

    await loginAsCitizen(driver);

    await openVaccinationRecord(driver);

    /*
     * Wait until at least one vaccination row appears.
     */

    const rows = await driver.wait(
      async () => {
        const elements = await driver.findElements(
          By.css(".vaccination-table tbody tr")
        );

        return elements.length > 0
          ? elements
          : false;
      },
      TIMEOUT,
      "vaccination record row"
    );

    expect(
      rows.length > 0,
      "No vaccination record row was displayed."
    );

    /*
     * Read all rows.
     */

    const rowTexts = [];

    for (const row of rows) {
      rowTexts.push(await row.getText());
    }

    const matchingRows = rowTexts.filter(
      (text) =>
        text.includes(ctx.vaccineName) &&
        text.includes(ctx.batchName)
    );

    expect(
      matchingRows.length > 0,
      `Logged dose was not found in the vaccination record. ` +
      `Expected vaccine: ${ctx.vaccineName}, ` +
      `batch: ${ctx.batchName}. ` +
      `Rows: ${JSON.stringify(rowTexts)}`
    );

    console.log(
      "US-08 dose correctly appears in My Vaccination Record."
    );

    await logout(driver);
  }
);


/* ---------------------------------------------------------
   CATEGORY 4
   Empty / Error Handling
--------------------------------------------------------- */

tc(
  "SR-04",
  "Empty/Error Handling",
  "Vaccination record page handles the record state correctly",
  async (driver) => {
    await loginAsCitizen(driver);

    await openVaccinationRecord(driver);

    /*
     * Page must show one of these valid states:
     *
     * 1. Vaccination table
     * 2. No vaccination records yet
     * 3. Could not load vaccination records
     */

    const table = await driver.findElements(
      By.css(".vaccination-table")
    );

    const emptyState = await driver.findElements(
      By.xpath(
        "//*[contains(normalize-space(),'No vaccination records yet')]"
      )
    );

    const errorState = await driver.findElements(
      By.xpath(
        "//*[contains(normalize-space(),'Could not load vaccination records')]"
      )
    );

    expect(
      table.length > 0 ||
      emptyState.length > 0 ||
      errorState.length > 0,
      "No valid vaccination record state was displayed."
    );

    await logout(driver);
  }
);


/* =========================================================
   RUNNER
========================================================= */

async function main() {
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

  console.log(
    "\n========================================"
  );

  console.log(
    " VACCINATION RECORD E2E (Selenium)"
  );

  console.log(
    "========================================\n"
  );

  try {
    for (const test of cases) {
      try {
        await test.fn(driver);

        results.push({
          ...test,
          status: "PASS",
          note: "",
        });

        console.log(
          `PASSED  ${test.id} - ${test.title}`
        );

      } catch (error) {
        const skipped =
          error instanceof Skip;

        results.push({
          ...test,
          status: skipped ? "SKIP" : "FAIL",
          note: error.message,
        });

        console.log(
          `${skipped ? "SKIPPED" : "FAILED"} ` +
          `${test.id} - ${test.title}`
        );

        console.log(
          `        ${error.message}`
        );
      }
    }

  } finally {
    const count = (status) =>
      results.filter(
        (result) =>
          result.status === status
      ).length;

    console.log(
      "\n========================================"
    );

    console.log(
      ` Total ${results.length} | ` +
      `Passed ${count("PASS")} | ` +
      `Failed ${count("FAIL")} | ` +
      `Skipped ${count("SKIP")}`
    );

    console.log(
      "========================================\n"
    );

    /*
     * Exit with error code if any test failed.
     */

    if (count("FAIL")) {
      process.exitCode = 1;
    }

    await driver.quit();
  }
}


main().catch((error) => {
  console.error(
    "Vaccination Record Selenium test could not run:",
    error.message || error
  );

  process.exitCode = 1;
});