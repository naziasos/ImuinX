
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const CITIZEN_EMAIL = process.env.CITIZEN_EMAIL;
const CITIZEN_PASSWORD = process.env.CITIZEN_PASSWORD;
const TIMEOUT = 15000;

const runId = Date.now();
const TEST_ADDRESS = `Selenium Test House ${runId}`;
const TEST_LOCATION = "Dhaka, Mirpur";
const TEST_REASON = `Selenium In-House Request ${runId}`;

async function findVisible(driver, locator) {
  const elements = await driver.findElements(locator);

  for (const element of elements) {
    if (await element.isDisplayed()) {
      return element;
    }
  }

  return null;
}

async function clickElement(driver, element) {
  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    element
  );

  try {
    await element.click();
  } catch (error) {
    if (
      error.name === "ElementClickInterceptedError" ||
      error.name === "ElementNotInteractableError"
    ) {
      await driver.executeScript(
        "arguments[0].click();",
        element
      );
    } else {
      throw error;
    }
  }
}

async function waitForVisible(driver, locator, message) {
  return await driver.wait(
    async () => await findVisible(driver, locator),
    TIMEOUT,
    message
  );
}

async function getBodyText(driver) {
  return await driver.findElement(By.tagName("body")).getText();
}

function getFutureDateTime() {
  const date = new Date(Date.now() + 48 * 60 * 60 * 1000);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

async function loginAsCitizen(driver) {
  await driver.get(BASE_URL);

  let passwordField = await findVisible(
    driver,
    By.css("input[type='password']")
  );

  // Open the login form only if it is not already visible.
  if (!passwordField) {
    const loginButton = await waitForVisible(
      driver,
      By.xpath(
        "//nav//button[normalize-space()='Login']" +
        " | //nav//a[normalize-space()='Login']"
      ),
      "Login navigation was not found."
    );

    await clickElement(driver, loginButton);

    passwordField = await waitForVisible(
      driver,
      By.css("input[type='password']"),
      "Password field was not found."
    );
  }

  const emailField = await waitForVisible(
    driver,
    By.css("input[type='email'], input[name='email']"),
    "Email field was not found."
  );

  await emailField.clear();
  await emailField.sendKeys(CITIZEN_EMAIL);

  await passwordField.clear();
  await passwordField.sendKeys(CITIZEN_PASSWORD);

  // Your login form uses "Sign in".
  const signInButton = await waitForVisible(
    driver,
    By.xpath("//button[normalize-space()='Sign in']"),
    "Sign in button was not found."
  );

  await clickElement(driver, signInButton);

  await driver.wait(
    async () => {
      const text = await getBodyText(driver);

      return (
        /Logout/i.test(text) &&
        /Request In-House Visit/i.test(text)
      );
    },
    TIMEOUT,
    "Citizen login did not complete."
  );

  console.log("PASS: Citizen login successful.");
}

async function setDateTimeInput(driver, element, value) {
  await driver.executeScript(
    `
      const input = arguments[0];
      const value = arguments[1];

      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      ).set;

      setter.call(input, value);

      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    `,
    element,
    value
  );
}

async function openRequestForm(driver) {
  const addressLocator = By.css("textarea[name='address']");

  // The request form may already be open after login.
  let addressField = await findVisible(driver, addressLocator);

  if (!addressField) {
    const requestLink = await waitForVisible(
      driver,
      By.xpath(
        "//*[self::button or self::a]" +
        "[normalize-space()='Request In-House Visit']"
      ),
      "Request In-House Visit navigation was not found."
    );

    await clickElement(driver, requestLink);

    addressField = await waitForVisible(
      driver,
      addressLocator,
      "Visit address field was not found."
    );
  }

  console.log("PASS: Request form opened.");
  return addressField;
}

async function submitInHouseRequest(driver) {
  const addressField = await openRequestForm(driver);

  const locationField = await waitForVisible(
    driver,
    By.css("input[name='location']"),
    "Location field was not found."
  );

  const dateField = await waitForVisible(
    driver,
    By.css("input[name='preferredDate']"),
    "Preferred date field was not found."
  );

  const reasonField = await waitForVisible(
    driver,
    By.css("input[name='vaccineOrReason']"),
    "Vaccine/reason field was not found."
  );

  await addressField.clear();
  await addressField.sendKeys(TEST_ADDRESS);

  await locationField.clear();
  await locationField.sendKeys(TEST_LOCATION);

  await setDateTimeInput(
    driver,
    dateField,
    getFutureDateTime()
  );

  await reasonField.clear();
  await reasonField.sendKeys(TEST_REASON);

  console.log("PASS: Request form filled.");

  // Match "Submit in-house request" regardless of letter case.
  const submitButton = await waitForVisible(
    driver,
    By.xpath(
      "//button[contains(" +
      "translate(normalize-space(.)," +
      "'ABCDEFGHIJKLMNOPQRSTUVWXYZ'," +
      "'abcdefghijklmnopqrstuvwxyz')," +
      "'submit in-house request')]"
    ),
    "Submit in-house request button was not found."
  );

  await driver.wait(
    until.elementIsEnabled(submitButton),
    TIMEOUT,
    "Submit button is disabled."
  );

  await clickElement(driver, submitButton);

  // Wait for the actual success message from the application.
  await driver.wait(
    async () =>
      /in-house visit requested successfully/i.test(
        await getBodyText(driver)
      ),
    TIMEOUT,
    "Request success message was not displayed."
  );

  console.log("PASS: Request submitted successfully.");
}

async function verifyPendingRequest(driver) {
  // The actual UI displays "View my requests".
  const requestsLink = await waitForVisible(
    driver,
    By.xpath(
      "//*[self::button or self::a]" +
      "[contains(" +
      "translate(normalize-space(.)," +
      "'ABCDEFGHIJKLMNOPQRSTUVWXYZ'," +
      "'abcdefghijklmnopqrstuvwxyz')," +
      "'view my requests')" +
      " or contains(" +
      "translate(normalize-space(.)," +
      "'ABCDEFGHIJKLMNOPQRSTUVWXYZ'," +
      "'abcdefghijklmnopqrstuvwxyz')," +
      "'my in-house requests')]"
    ),
    "View my requests navigation was not found."
  );

  await clickElement(driver, requestsLink);

  // Verify the unique request reason and its Pending status.
  await driver.wait(
    async () => {
      const bodyText = await getBodyText(driver);

      return (
        bodyText.includes(TEST_REASON) &&
        /\bPending\b/i.test(bodyText)
      );
    },
    TIMEOUT,
    "The submitted request was not found with Pending status."
  );

  console.log("PASS: Request appears in My In-House Requests as Pending.");
}

async function runTest() {
  let driver;

  try {
    if (!CITIZEN_EMAIL || !CITIZEN_PASSWORD) {
      throw new Error(
        "Set CITIZEN_EMAIL and CITIZEN_PASSWORD environment variables."
      );
    }

    console.log("\n==========================================");
    console.log("TC-S09: CITIZEN IN-HOUSE REQUEST");
    console.log("==========================================");

    const options = new chrome.Options();
    options.addArguments("--window-size=1440,1000");
    options.addArguments("--disable-notifications");

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

    await loginAsCitizen(driver);
    await submitInHouseRequest(driver);
    await verifyPendingRequest(driver);

    console.log("\n==========================================");
    console.log("PASS: TC-S09");
    console.log("Citizen submits an in-house request.");
    console.log("Request appears with Pending status.");
    console.log(`Test reason: ${TEST_REASON}`);
    console.log("==========================================");
  } catch (error) {
    console.error("\nFAIL: TC-S09");
    console.error(error.message);

    if (driver) {
      try {
        console.log("Current URL:", await driver.getCurrentUrl());
        console.log(
          "Page text:",
          (await getBodyText(driver)).substring(0, 1500)
        );
      } catch {
        // Preserve the original error.
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
