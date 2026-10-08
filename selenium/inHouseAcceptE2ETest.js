const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const WORKER_EMAIL = "23201046@uap-bd.edu";
const WORKER_PASSWORD = "8s6l7e";
const TIMEOUT = 20000;

let driver;

// Wait until the loader is absent or hidden
async function waitForLoader() {
  await driver.wait(async () => {
    const loaders = await driver.findElements(
      By.css(".ix-loader__glow")
    );

    for (const loader of loaders) {
      if (await loader.isDisplayed()) {
        return false;
      }
    }

    return true;
  }, TIMEOUT, "Loader did not disappear");
}

// Find a button, wait for loader, then click
async function safeClick(locator) {
  await waitForLoader();

  const button = await driver.wait(
    until.elementLocated(locator),
    TIMEOUT
  );

  await driver.wait(until.elementIsVisible(button), TIMEOUT);
  await driver.wait(until.elementIsEnabled(button), TIMEOUT);

  // Ensure it is in the viewport
  await driver.executeScript(
    "arguments[0].scrollIntoView({ block: 'center' });",
    button
  );

  // Check again immediately before clicking
  await waitForLoader();

  // Re-find in case the page re-rendered
  const freshButton = await driver.findElement(locator);
  await freshButton.click();
}

async function testAcceptInHouseVisit() {
  console.log("\n========================================");
  console.log("TEST: Worker accepts in-house visit");
  console.log("========================================");

  // 1. Open application
  await driver.get(BASE_URL);
  await waitForLoader();

  // 2. Open Login
  await safeClick(
    By.xpath("//button[normalize-space()='Login']")
  );

  // 3. Enter credentials
  await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );

  await driver.findElement(By.name("email")).sendKeys(WORKER_EMAIL);
  await driver.findElement(By.name("password")).sendKeys(WORKER_PASSWORD);

  // 4. Submit login
  await safeClick(By.css("button[type='submit']"));

  // 5. Wait for worker dashboard
  await driver.wait(
    until.elementLocated(
      By.xpath("//*[contains(normalize-space(.), 'In-House')]")
    ),
    TIMEOUT
  );

  console.log("Worker dashboard opened.");

  // 6. Accept a pending request
  const acceptLocator = By.xpath(
    "//button[normalize-space()='Accept Request']"
  );

  await driver.wait(
    until.elementLocated(acceptLocator),
    TIMEOUT
  );

  console.log("Pending request found.");

  await safeClick(acceptLocator);

  console.log("Accept Request clicked.");

  // 7. Verify no pending Accept buttons remain
  await driver.wait(async () => {
    await waitForLoader();

    const buttons = await driver.findElements(acceptLocator);
    return buttons.length === 0;
  }, TIMEOUT);

  console.log("PASS: In-house visit was accepted.");
}

(async () => {
  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(new chrome.Options())
      .build();

    await testAcceptInHouseVisit();
  } catch (error) {
    console.error("\nFAIL:", error.message);
    process.exitCode = 1;
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
})();