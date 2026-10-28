
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const WORKER_EMAIL = process.env.WORKER_EMAIL;
const WORKER_PASSWORD = process.env.WORKER_PASSWORD;
const CITIZEN_NAME = process.env.CITIZEN_NAME || "Tanha Akter";

const TIMEOUT = 20000;

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// Wait until the full-screen loader is gone.
async function waitForLoaderToDisappear(driver) {
  await driver.wait(async () => {
    const loaders = await driver.findElements(
      By.css(".ix-loader")
    );

    for (const loader of loaders) {
      try {
        if (await loader.isDisplayed()) {
          return false;
        }
      } catch {
        // Loader was removed while checking.
      }
    }

    return true;
  }, TIMEOUT, "The page loader did not disappear.");
}

// Find an element that is visible.
async function waitVisible(driver, locator, message) {
  return driver.wait(async () => {
    const elements = await driver.findElements(locator);

    for (const element of elements) {
      try {
        if (await element.isDisplayed()) {
          return element;
        }
      } catch {
        // Element may have disappeared during rendering.
      }
    }

    return false;
  }, TIMEOUT, message);
}

// Safely click an element without bypassing the UI.
async function clickSafely(driver, locator, message) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    await waitForLoaderToDisappear(driver);

    const element = await waitVisible(driver, locator, message);

    await driver.executeScript(
      "arguments[0].scrollIntoView({ block: 'center', inline: 'center' });",
      element
    );

    await driver.wait(until.elementIsEnabled(element), TIMEOUT);

    try {
      await element.click();
      return;
    } catch (error) {
      const intercepted =
        error.name === "ElementClickInterceptedError" ||
        error.message.includes("element click intercepted");

      if (!intercepted || attempt === 5) {
        throw error;
      }

      console.log(
        `Click blocked by an overlay. Retrying (${attempt}/5)...`
      );

      await driver.sleep(500);
    }
  }
}

// Login using the Health Worker account.
async function loginAsWorker(driver) {
  await driver.get(BASE_URL);

  // Allow the initial page animation/loader to finish.
  await waitForLoaderToDisappear(driver);

  const loginLocator = By.xpath(
    "//nav//button[normalize-space()='Login']"
  );

  await clickSafely(
    driver,
    loginLocator,
    "Login button was not found."
  );

  const emailField = await waitVisible(
    driver,
    By.name("email"),
    "Login email field was not found."
  );

  const passwordField = await waitVisible(
    driver,
    By.name("password"),
    "Login password field was not found."
  );

  await emailField.clear();
  await emailField.sendKeys(WORKER_EMAIL);

  await passwordField.clear();
  await passwordField.sendKeys(WORKER_PASSWORD);

  await clickSafely(
    driver,
    By.css("button[type='submit']"),
    "Login submit button was not found."
  );

  await waitVisible(
    driver,
    By.xpath("//h1[contains(normalize-space(.), 'Worker Dashboard')]"),
    "Worker Dashboard did not open. Check the credentials and login error."
  );

  console.log("PASS: Worker login successful.");
}

// Open the Log Dose page.
async function openLogDose(driver) {
  await clickSafely(
    driver,
    By.xpath("//button[contains(normalize-space(.), 'Log Dose')]"),
    "Log Dose navigation button was not found."
  );

  await waitVisible(
    driver,
    By.xpath("//h1[normalize-space()='Log a Dose']"),
    "Log a Dose page did not open."
  );

  console.log("PASS: Log Dose page opened.");
}

// Search and select the citizen.
async function selectCitizen(driver) {
  const searchBox = await waitVisible(
    driver,
    By.css("input[placeholder*='Type at least 2 letters']"),
    "Citizen search box was not found."
  );

  await searchBox.clear();
  await searchBox.sendKeys(CITIZEN_NAME);

  const citizenLocator = By.xpath(
    `//button[contains(@class,'logdose-dropdown-item') and contains(normalize-space(.), ${JSON.stringify(CITIZEN_NAME)})]`
  );

  const citizen = await waitVisible(
    driver,
    citizenLocator,
    `Citizen "${CITIZEN_NAME}" was not found in the search results.`
  );

  await clickSafely(
    driver,
    citizenLocator,
    `Could not select citizen "${CITIZEN_NAME}".`
  );

  console.log(`PASS: Citizen selected: ${CITIZEN_NAME}`);
}

// Select the first available vaccine and batch.
async function selectVaccineAndBatch(driver) {
  const vaccineLocator = By.css(".logdose-tile");

  const vaccine = await waitVisible(
    driver,
    vaccineLocator,
    "No vaccine options were displayed."
  );

  const vaccineName = (await vaccine.getText())
    .replace("💊", "")
    .trim();

  expect(vaccineName, "Vaccine name is empty.");

  await clickSafely(
    driver,
    vaccineLocator,
    "Could not select a vaccine."
  );

  const batchLocator = By.css(".logdose-batch-card");

  const batch = await waitVisible(
    driver,
    batchLocator,
    "No available batch was displayed for the selected vaccine."
  );

  const batchName = (
    await batch.findElement(By.css("strong")).getText()
  ).trim();

  expect(batchName, "Batch number is empty.");

  await clickSafely(
    driver,
    batchLocator,
    "Could not select a vaccine batch."
  );

  console.log(`PASS: Vaccine selected: ${vaccineName}`);
  console.log(`PASS: Batch selected: ${batchName}`);

  return { vaccineName, batchName };
}

// Submit the dose form.
async function logDose(driver) {
  await clickSafely(
    driver,
    By.xpath(
      "//button[@type='submit' and normalize-space()='Log Dose']"
    ),
    "Log Dose submit button was not found."
  );

  await waitVisible(
    driver,
    By.xpath("//h2[normalize-space()='Dose Logged']"),
    "Dose was not logged. Check form validation and backend errors."
  );

  console.log("PASS: Dose logged successfully.");
}

// Verify the success confirmation.
async function verifyRecord(driver, vaccineName, batchName) {
  const successCard = await waitVisible(
    driver,
    By.css(".logdose-success-card"),
    "Dose success card was not displayed."
  );

  const text = await successCard.getText();

  expect(
    text.includes(CITIZEN_NAME),
    "The success card did not show the selected citizen."
  );

  expect(
    text.includes(vaccineName),
    "The success card did not show the selected vaccine."
  );

  expect(
    text.includes(batchName),
    "The success card did not show the selected batch."
  );

  console.log("PASS: Citizen, vaccine and batch verified.");
}

// Main test runner.
async function runTest() {
  let driver;

  try {
    if (!WORKER_EMAIL || !WORKER_PASSWORD) {
      throw new Error(
        "Set WORKER_EMAIL and WORKER_PASSWORD in PowerShell before running the test."
      );
    }

    const options = new chrome.Options()
      .addArguments("--window-size=1440,1000");

    if (process.env.HEADLESS === "1") {
      options.addArguments("--headless=new");
    }

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    await driver.manage().setTimeouts({
      implicit: 0,
      pageLoad: 30000,
      script: 15000
    });

    console.log("\n==============================");
    console.log("TC-S11: Worker logs a dose");
    console.log("==============================");

    await loginAsWorker(driver);
    await openLogDose(driver);
    await selectCitizen(driver);

    const { vaccineName, batchName } =
      await selectVaccineAndBatch(driver);

    await logDose(driver);
    await verifyRecord(driver, vaccineName, batchName);

    console.log("\nPASS: TC-S11");
    console.log(
      "Worker login -> Log Dose -> Select citizen -> Select vaccine and batch -> Save dose"
    );
  } catch (error) {
    console.error("\nFAIL: TC-S11");
    console.error(error.message);

    if (driver) {
      try {
        console.error("URL:", await driver.getCurrentUrl());

        const body = await driver
          .findElement(By.tagName("body"))
          .getText();

        console.error("Page text:", body.substring(0, 1800));
      } catch {
        console.error("Could not collect page diagnostics.");
      }
    }

    process.exitCode = 1;
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

runTest();
