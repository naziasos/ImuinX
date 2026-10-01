const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = "http://localhost:5173";

const WORKER_EMAIL = "23201046@uap-bd.edu";
const WORKER_PASSWORD = "8s6l7e";

const CITIZEN_NAME = "Tanha Akter";

const TIMEOUT = 10000;

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loginAsWorker(driver) {
  await driver.get(BASE_URL);

  await driver.wait(
    until.elementLocated(
      By.xpath("//nav//button[normalize-space()='Login']")
    ),
    TIMEOUT
  );

  await driver
    .findElement(By.xpath("//nav//button[normalize-space()='Login']"))
    .click();

  await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );

  await driver.findElement(By.name("email")).sendKeys(WORKER_EMAIL);
  await driver.findElement(By.name("password")).sendKeys(WORKER_PASSWORD);

  await driver
    .findElement(By.css("button[type='submit']"))
    .click();

  await driver.wait(
    until.elementLocated(
      By.xpath("//h1[contains(normalize-space(),'Worker Dashboard')]")
    ),
    15000
  );

  console.log("Worker login successful.");
}

async function openLogDose(driver) {
  await driver.wait(
    until.elementLocated(
      By.xpath("//button[contains(normalize-space(),'Log Dose')]")
    ),
    TIMEOUT
  );

  await driver
    .findElement(
      By.xpath("//button[contains(normalize-space(),'Log Dose')]")
    )
    .click();

  await driver.wait(
    until.elementLocated(
      By.xpath("//h1[normalize-space()='Log a Dose']")
    ),
    TIMEOUT
  );

  console.log("Log Dose page opened.");
}

async function selectCitizen(driver) {
  const searchBox = await driver.wait(
    until.elementLocated(
      By.css("input[placeholder*='Type at least 2 letters']")
    ),
    TIMEOUT
  );

  await searchBox.sendKeys(CITIZEN_NAME);

  await driver.sleep(1000);

  const citizen = await driver.wait(
    until.elementLocated(
      By.xpath(
        `//button[contains(@class,'logdose-dropdown-item')][contains(.,'${CITIZEN_NAME}')]`
      )
    ),
    TIMEOUT
  );

  await citizen.click();

  console.log("Citizen selected:", CITIZEN_NAME);
}

async function selectVaccineAndBatch(driver) {
  // Select first available vaccine
  const vaccine = await driver.wait(
    until.elementLocated(
      By.css(".logdose-tile")
    ),
    TIMEOUT
  );

  // Remove the 💊 icon from the vaccine name
  const vaccineName = (await vaccine.getText())
    .replace("💊", "")
    .trim();

  await vaccine.click();

  // Select first available batch
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

  console.log("Vaccine selected:", vaccineName);
  console.log("Batch selected:", batchName);

  return { vaccineName, batchName };
}

async function logDose(driver) {
  await driver
    .findElement(
      By.xpath(
        "//button[@type='submit' and normalize-space()='Log Dose']"
      )
    )
    .click();

  await driver.wait(
    until.elementLocated(
      By.xpath("//h2[normalize-space()='Dose Logged']")
    ),
    15000
  );

  console.log("Dose logged successfully.");
}

async function verifyRecord(driver, vaccineName, batchName) {
  const successCard = await driver.findElement(
    By.css(".logdose-success-card")
  );

  const text = await successCard.getText();

  expect(
    text.includes(CITIZEN_NAME),
    "Correct citizen was not shown in the dose record."
  );

  expect(
    text.includes(vaccineName),
    "Selected vaccine was not shown in the dose record."
  );

  expect(
    text.includes(batchName),
    "Selected batch was not shown in the dose record."
  );

  console.log("Correct citizen record verified.");
}

async function runTest() {
  let driver;

  try {
    const options = new chrome.Options()
      .addArguments("--window-size=1440,1000");

    if (process.env.HEADLESS === "1") {
      options.addArguments("--headless=new");
    }

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    console.log("\n==============================");
    console.log("DOSE LOGGING E2E TEST");
    console.log("==============================");

    await loginAsWorker(driver);
    await openLogDose(driver);
    await selectCitizen(driver);

    const { vaccineName, batchName } =
      await selectVaccineAndBatch(driver);

    await logDose(driver);
    await verifyRecord(driver, vaccineName, batchName);

    console.log("\n✅ TEST PASSED");
    console.log(
      "Health Worker → Log Dose → Correct Citizen verified."
    );

  } catch (error) {
    console.log("\n❌ TEST FAILED");
    console.log(error.message);

    process.exitCode = 1;

  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

runTest();