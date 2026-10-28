
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const WORKER_EMAIL = process.env.WORKER_EMAIL;
const WORKER_PASSWORD = process.env.WORKER_PASSWORD;
const TEST_REASON = process.env.INHOUSE_TEST_REASON || "";
const TIMEOUT = 20000;

let driver;

async function bodyText() {
  return await driver.findElement(By.tagName("body")).getText();
}

async function visibleElement(locator) {
  const elements = await driver.findElements(locator);

  for (const element of elements) {
    if (await element.isDisplayed()) return element;
  }

  return null;
}

async function waitVisible(locator, message) {
  return await driver.wait(
    async () => await visibleElement(locator),
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

  try {
    await element.click();
  } catch (error) {
    if (
      error.name === "ElementClickInterceptedError" ||
      error.name === "ElementNotInteractableError"
    ) {
      await driver.executeScript("arguments[0].click();", element);
    } else {
      throw error;
    }
  }
}

async function acceptBrowserAlertIfPresent() {
  try {
    await driver.wait(async () => {
      try {
        await driver.switchTo().alert();
        return true;
      } catch {
        return false;
      }
    }, 3000);

    const alert = await driver.switchTo().alert();
    console.log("Application message:", await alert.getText());
    await alert.accept();
  } catch {
    // Some application responses may not display a browser alert.
  }
}

async function loginAsWorker() {
  await driver.get(BASE_URL);

  let passwordField = await visibleElement(
    By.css("input[type='password']")
  );

  if (!passwordField) {
    const loginButton = await waitVisible(
      By.xpath(
        "//nav//button[normalize-space()='Login']" +
        " | //nav//a[normalize-space()='Login']"
      ),
      "Login navigation was not found."
    );

    await clickElement(loginButton);

    passwordField = await waitVisible(
      By.css("input[type='password']"),
      "Worker password field was not found."
    );
  }

  const emailField = await waitVisible(
    By.css("input[name='email'], input[type='email']"),
    "Worker email field was not found."
  );

  await emailField.clear();
  await emailField.sendKeys(WORKER_EMAIL);

  await passwordField.clear();
  await passwordField.sendKeys(WORKER_PASSWORD);

  const signInButton = await waitVisible(
    By.css("button[type='submit']"),
    "Login submit button was not found."
  );

  await clickElement(signInButton);

  await driver.wait(async () => {
    const text = await bodyText();
    return /Show Work/i.test(text) && /Logout/i.test(text);
  }, TIMEOUT, "Worker login did not complete.");

  console.log("PASS: Worker login successful.");
}

async function openShowWork() {
  // If Show Work is already open, do not click the navigation again.
  if (
    await visibleElement(
      By.css(".show-work-card")
    )
  ) {
    console.log("PASS: Show Work page is already open.");
    return;
  }

  const showWorkButton = await waitVisible(
    By.xpath(
      "//*[self::button or self::a]" +
      "[normalize-space()='Show Work']"
    ),
    "Show Work navigation was not found."
  );

  await clickElement(showWorkButton);

  await waitVisible(
    By.css(".show-work-card"),
    "In-House Visits work panel did not open."
  );

  console.log("PASS: Show Work page opened.");
}

async function findTargetRequestCard() {
  const cards = await driver.findElements(
    By.css(".show-work-duty")
  );

  for (const card of cards) {
    if (!(await card.isDisplayed())) continue;

    const text = await card.getText();

    if (TEST_REASON && !text.includes(TEST_REASON)) {
      continue;
    }

    if (!/Accept Request/i.test(text)) {
      continue;
    }

    return card;
  }

  return null;
}

async function acceptPendingRequest() {
  const availableTab = await waitVisible(
    By.xpath(
      "//button[contains(normalize-space(.), 'Available Requests')]"
    ),
    "Available Requests tab was not found."
  );

  if (await availableTab.isEnabled()) {
    await clickElement(availableTab);
  }

  const card = await driver.wait(
    async () => await findTargetRequestCard(),
    TIMEOUT,
    TEST_REASON
      ? "The specified test request is not available. Check its preferred date against the worker's In-House Visit duty dates."
      : "No eligible Pending request was found. Check the worker's In-House Visit duty dates."
  );

  const cardText = await card.getText();
  console.log("Request selected:\n" + cardText);

  const acceptButton = await card.findElement(
    By.xpath(".//button[normalize-space()='Accept Request']")
  );

  await clickElement(acceptButton);
  await acceptBrowserAlertIfPresent();

  const acceptedTab = await waitVisible(
    By.xpath(
      "//button[contains(normalize-space(.), 'My Accepted Visits')]"
    ),
    "My Accepted Visits tab was not found."
  );

  await driver.wait(
    async () => await acceptedTab.isEnabled(),
    TIMEOUT
  );

  await clickElement(acceptedTab);

  const acceptedCard = await driver.wait(
    async () => {
      const cards = await driver.findElements(
        By.css(".show-work-duty")
      );

      for (const item of cards) {
        if (!(await item.isDisplayed())) continue;

        const text = await item.getText();

        if (
          (!TEST_REASON || text.includes(TEST_REASON)) &&
          /\bAccepted\b/i.test(text)
        ) {
          return item;
        }
      }

      return null;
    },
    TIMEOUT,
    "Request was not displayed as Accepted."
  );

  console.log("PASS: Request status changed to Accepted.");
  return acceptedCard;
}

async function completeAcceptedVisit() {
  const acceptedCard = await acceptPendingRequest();

  const completeButton = await acceptedCard.findElement(
    By.xpath(".//button[normalize-space()='Complete Visit']")
  );

  await clickElement(completeButton);
  await acceptBrowserAlertIfPresent();

  const completedTab = await waitVisible(
    By.xpath(
      "//button[contains(normalize-space(.), 'Completed Visits')]"
    ),
    "Completed Visits tab was not found."
  );

  await clickElement(completedTab);

  const completedCard = await driver.wait(
    async () => {
      const cards = await driver.findElements(
        By.css(".show-work-duty")
      );

      for (const card of cards) {
        if (!(await card.isDisplayed())) continue;

        const text = await card.getText();

        if (
          (!TEST_REASON || text.includes(TEST_REASON)) &&
          /\bCompleted\b/i.test(text) &&
          /Visit completed/i.test(text)
        ) {
          return card;
        }
      }

      return null;
    },
    TIMEOUT,
    "Request was not displayed as Completed."
  );

  console.log("PASS: Request status changed to Completed.");
  console.log("Completed request details:\n" + await completedCard.getText());
}

async function runTest() {
  try {
    if (!WORKER_EMAIL || !WORKER_PASSWORD) {
      throw new Error(
        "Please set WORKER_EMAIL and WORKER_PASSWORD in PowerShell first."
      );
    }

    console.log("\n======================================");
    console.log("TC-S10: WORKER ACCEPTS AND COMPLETES VISIT");
    console.log("======================================");

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

    await loginAsWorker();
    await openShowWork();
    await completeAcceptedVisit();

    console.log("\n======================================");
    console.log("PASS: TC-S10");
    console.log("Worker accepted the request.");
    console.log("Worker completed the visit.");
    console.log("Status: Pending -> Accepted -> Completed");
    console.log("======================================");
  } catch (error) {
    console.error("\nFAIL: TC-S10");
    console.error(error.message);

    if (driver) {
      try {
        console.error("Current URL:", await driver.getCurrentUrl());
        console.error(
          "Current page text:\n",
          (await bodyText()).substring(0, 2500)
        );
      } catch {}
    }

    process.exitCode = 1;
  } finally {
    if (driver) await driver.quit();
  }
}

runTest();
