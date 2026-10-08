const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

const CITIZEN_EMAIL =
  process.env.CITIZEN_EMAIL || "23201032@uap-bd.edu";

const CITIZEN_PASSWORD =
  process.env.CITIZEN_PASSWORD || "tanha123";

const TIMEOUT = 15000;

const runId = Date.now();

const TEST_ADDRESS = `Selenium Test House ${runId}`;
const TEST_LOCATION = "Dhaka, Mirpur";
const TEST_REASON = `Selenium In-House Request ${runId}`;

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function getFutureDateTime() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function clickElement(driver, element) {
  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    element
  );

  try {
    await element.click();
  } catch (error) {
    if (error.name === "ElementClickInterceptedError") {
      await driver.executeScript(
        "arguments[0].click();",
        element
      );
    } else {
      throw error;
    }
  }
}

async function loginAsCitizen(driver) {
  await driver.get(BASE_URL);

  const loginButton = await driver.wait(
    until.elementLocated(
      By.xpath("//nav//button[normalize-space()='Login']")
    ),
    TIMEOUT
  );

  await clickElement(driver, loginButton);

  const emailField = await driver.wait(
    until.elementLocated(
      By.css("input[type='email'], input[name='email']")
    ),
    TIMEOUT
  );

  const passwordField = await driver.wait(
    until.elementLocated(
      By.css("input[type='password'], input[name='password']")
    ),
    TIMEOUT
  );

  await emailField.clear();
  await emailField.sendKeys(CITIZEN_EMAIL);

  await passwordField.clear();
  await passwordField.sendKeys(CITIZEN_PASSWORD);

  const submitButton = await driver.wait(
    until.elementLocated(
      By.css("button[type='submit']")
    ),
    TIMEOUT
  );

  await clickElement(driver, submitButton);

  await driver.wait(
    until.elementLocated(
      By.xpath("//h1[normalize-space()='Citizen Dashboard']")
    ),
    TIMEOUT
  );

  console.log("Citizen login successful.");
}

async function submitInHouseRequest(driver) {
  const requestButton = await driver.wait(
    until.elementLocated(
      By.xpath(
        "//button[contains(normalize-space(.),'Request In-House Visit')]"
      )
    ),
    TIMEOUT
  );

  await clickElement(driver, requestButton);

  await driver.wait(
    until.elementLocated(
      By.xpath(
        "//h2[normalize-space()='Request In-House Visit']"
      )
    ),
    TIMEOUT
  );

  console.log("Request In-House Visit page opened.");

  const addressField = await driver.wait(
    until.elementLocated(
      By.css("textarea[name='address']")
    ),
    TIMEOUT
  );

  const locationField = await driver.wait(
    until.elementLocated(
      By.css("input[name='location']")
    ),
    TIMEOUT
  );

  const preferredDateField = await driver.wait(
    until.elementLocated(
      By.css("input[name='preferredDate']")
    ),
    TIMEOUT
  );

  const reasonField = await driver.wait(
    until.elementLocated(
      By.css("input[name='vaccineOrReason']")
    ),
    TIMEOUT
  );

  const preferredDateTime = getFutureDateTime();

  await addressField.clear();
  await addressField.sendKeys(TEST_ADDRESS);

  await locationField.clear();
  await locationField.sendKeys(TEST_LOCATION);

  await driver.executeScript(
    `
      const input = arguments[0];
      const value = arguments[1];

      const setter =
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value"
        ).set;

      setter.call(input, value);

      input.dispatchEvent(
        new Event("input", { bubbles: true })
      );

      input.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    `,
    preferredDateField,
    preferredDateTime
  );

  await reasonField.clear();
  await reasonField.sendKeys(TEST_REASON);

  console.log("Form filled successfully.");
  console.log(`Address: ${TEST_ADDRESS}`);
  console.log(`Location: ${TEST_LOCATION}`);
  console.log(`Preferred Date: ${preferredDateTime}`);
  console.log(`Reason: ${TEST_REASON}`);

  const submitButton = await driver.wait(
    until.elementLocated(
      By.xpath(
        "//button[normalize-space()='Submit In-House Request']"
      )
    ),
    TIMEOUT
  );

  await driver.wait(
    until.elementIsEnabled(submitButton),
    TIMEOUT
  );

  await clickElement(driver, submitButton);

  console.log("Submit In-House Request button clicked.");

  await driver.wait(
    until.elementLocated(
      By.xpath(
        "//*[contains(normalize-space(.),'In-house visit requested successfully')]"
      )
    ),
    TIMEOUT
  );

  console.log("Success message displayed.");
}

async function runTest() {
  let driver;

  try {
    console.log("\n==========================================");
    console.log("IN-HOUSE REQUEST SUBMISSION E2E TEST");
    console.log("==========================================");

    const options = new chrome.Options();

    options.addArguments("--window-size=1440,1000");
    options.addArguments("--disable-gpu");
    options.addArguments("--disable-software-rasterizer");
    options.addArguments("--disable-gcm");
    options.addArguments("--disable-notifications");
    options.addArguments("--no-sandbox");
    options.addArguments("--disable-dev-shm-usage");

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
      script: 30000,
    });

    // Step 1: Citizen Login
    await loginAsCitizen(driver);

    // Step 2: Fill and Submit In-House Request
    await submitInHouseRequest(driver);

    console.log("\n==========================================");
    console.log("✅ TEST PASSED");
    console.log("==========================================");
    console.log("Flow Verified:");
    console.log("Citizen Login");
    console.log("→ Request In-House Visit");
    console.log("→ Form Filled");
    console.log("→ Submit Request");
    console.log("→ Success Message Displayed");
    console.log("==========================================");

    console.log(`Reason: ${TEST_REASON}`);
    console.log(`Address: ${TEST_ADDRESS}`);
    console.log(`Location: ${TEST_LOCATION}`);

    console.log("==========================================");
  } catch (error) {
    console.log("\n==========================================");
    console.log("❌ TEST FAILED");
    console.log("==========================================");
    console.log(error.message);
    console.log("==========================================");

    process.exitCode = 1;
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

runTest();