
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const WORKER_EMAIL = process.env.WORKER_EMAIL;
const WORKER_PASSWORD = process.env.WORKER_PASSWORD;
const CITIZEN_NAME = process.env.DOSE_CITIZEN_NAME || "Tanha Akter";
const TIMEOUT = 15000;

let driver;

async function visible(locator) {
  const elements = await driver.findElements(locator);

  for (const element of elements) {
    if (await element.isDisplayed()) return element;
  }

  return null;
}

async function waitVisible(locator, message) {
  return driver.wait(
    async () => await visible(locator),
    TIMEOUT,
    message
  );
}

async function clickElement(element) {
  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    element
  );

  await driver.wait(until.elementIsEnabled(element), TIMEOUT);
  await element.click();
}

async function loginAsWorker() {
  await driver.get(BASE_URL);

  let password = await visible(By.name("password"));

  if (!password) {
    const loginButton = await waitVisible(
      By.xpath("//nav//button[normalize-space()='Login']"),
      "Login button was not found."
    );

    await clickElement(loginButton);

    password = await waitVisible(
      By.name("password"),
      "Password field was not found."
    );
  }

  const email = await waitVisible(
    By.name("email"),
    "Email field was not found."
  );

  await email.sendKeys(WORKER_EMAIL);
  await password.sendKeys(WORKER_PASSWORD);

  await clickElement(
    await waitVisible(
      By.css("button[type='submit']"),
      "Login submit button was not found."
    )
  );

  await waitVisible(
    By.xpath("//h1[contains(normalize-space(),'Worker Dashboard')]"),
    "Worker Dashboard did not open."
  );

  console.log("PASS: Worker logged in.");
}

async function openLogDose() {
  await clickElement(
    await waitVisible(
      By.xpath("//button[contains(normalize-space(.),'Log Dose')]"),
      "Log Dose navigation was not found."
    )
  );

  await waitVisible(
    By.xpath("//h1[normalize-space()='Log a Dose']"),
    "Log a Dose page did not open."
  );

  console.log("PASS: Log Dose page opened.");
}

async function selectCitizen() {
  const search = await waitVisible(
    By.css("input[placeholder*='Type at least 2 letters']"),
    "Citizen search field was not found."
  );

  await search.sendKeys(CITIZEN_NAME);

  const citizen = await driver.wait(
    async () => {
      const options = await driver.findElements(
        By.css(".logdose-dropdown-item")
      );

      for (const option of options) {
        if (
          await option.isDisplayed() &&
          (await option.getText()).includes(CITIZEN_NAME)
        ) {
          return option;
        }
      }

      return null;
    },
    TIMEOUT,
    `Citizen "${CITIZEN_NAME}" was not found.`
  );

  await clickElement(citizen);
  console.log("PASS: Citizen selected:", CITIZEN_NAME);
}

async function selectVaccineAndBatch() {
  const vaccine = await driver.wait(
    async () => {
      const items = await driver.findElements(
        By.css(".logdose-tile")
      );

      for (const item of items) {
        if (await item.isDisplayed() && await item.isEnabled()) {
          return item;
        }
      }

      return null;
    },
    TIMEOUT,
    "No available vaccine was found."
  );

  const vaccineName = (await vaccine.getText())
    .replace("💊", "")
    .trim();

  await clickElement(vaccine);

  const batch = await driver.wait(
    async () => {
      const items = await driver.findElements(
        By.css(".logdose-batch-card")
      );

      for (const item of items) {
        if (await item.isDisplayed() && await item.isEnabled()) {
          return item;
        }
      }

      return null;
    },
    TIMEOUT,
    "No selectable vaccine batch was found."
  );

  const batchNumber = await batch
    .findElement(By.css("strong"))
    .getText();

  await clickElement(batch);

  console.log("PASS: Vaccine selected:", vaccineName);
  console.log("PASS: Batch selected:", batchNumber);

  return { vaccineName, batchNumber };
}

async function submitDose() {
  const dateInput = await waitVisible(
    By.css("input[type='date']"),
    "Date Administered field was not found."
  );

  const date = await dateInput.getAttribute("value");

  if (!date) {
    throw new Error("Date Administered is empty.");
  }

  await clickElement(
    await waitVisible(
      By.xpath(
        "//button[@type='submit' and normalize-space()='Log Dose']"
      ),
      "Log Dose submit button was not found."
    )
  );

  await waitVisible(
    By.xpath("//h2[normalize-space()='Dose Logged']"),
    "Dose Logged success message did not appear."
  );

  console.log("PASS: Dose record saved.");
  console.log("Date administered:", date);
}

async function verifySavedDose(vaccineName, batchNumber) {
  const successCard = await waitVisible(
    By.css(".logdose-success-card"),
    "Dose success details were not displayed."
  );

  const text = await successCard.getText();

  if (!text.includes(CITIZEN_NAME)) {
    throw new Error("Success details do not show the selected citizen.");
  }

  if (!text.includes(vaccineName)) {
    throw new Error("Success details do not show the selected vaccine.");
  }

  if (!text.includes(batchNumber)) {
    throw new Error("Success details do not show the selected batch.");
  }

  console.log("PASS: Citizen, vaccine and batch verified.");
}

async function runTest() {
  try {
    if (!WORKER_EMAIL || !WORKER_PASSWORD) {
      throw new Error(
        "Set WORKER_EMAIL and WORKER_PASSWORD in PowerShell."
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

    await driver.manage().setTimeouts({ implicit: 0 });

    console.log("\nTC-S11: Worker logs a dose");

    await loginAsWorker();
    await openLogDose();
    await selectCitizen();

    const { vaccineName, batchNumber } =
      await selectVaccineAndBatch();

    await submitDose();
    await verifySavedDose(vaccineName, batchNumber);

    console.log("\nPASS: TC-S11");
    console.log("Vaccine:", vaccineName);
    console.log("Batch:", batchNumber);
    console.log("Citizen:", CITIZEN_NAME);
  } catch (error) {
    console.error("\nFAIL: TC-S11");
    console.error(error.message);

    if (driver) {
      try {
        console.error("URL:", await driver.getCurrentUrl());
        console.error(
          "Page text:",
          (await driver.findElement(By.tagName("body")).getText())
            .substring(0, 1800)
        );
      } catch {}
    }

    process.exitCode = 1;
  } finally {
    if (driver) await driver.quit();
  }
}

runTest();
