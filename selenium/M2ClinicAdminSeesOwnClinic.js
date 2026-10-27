
const { Builder, By, until } = require("selenium-webdriver");

const BASE_URL = "http://localhost:5173";
const TIMEOUT = 15000;

const CLINIC_ADMIN_EMAIL = process.env.CLINIC_ADMIN_EMAIL;
const CLINIC_ADMIN_PASSWORD = process.env.CLINIC_ADMIN_PASSWORD;

const EXPECTED_CLINIC_NAME = "ImuniX Clinic";
const EXPECTED_WORKER_COUNT = 3;

async function waitForLoaderToDisappear(driver) {
  await driver.wait(async () => {
    const loaders = await driver.findElements(
      By.css(".ix-loader__glow")
    );

    for (const loader of loaders) {
      try {
        if (await loader.isDisplayed()) {
          return false;
        }
      } catch {
        // Loader has disappeared.
      }
    }

    return true;
  }, TIMEOUT, "Loading overlay did not disappear");
}

async function getBodyText(driver) {
  return await driver.findElement(By.css("body")).getText();
}

async function clickVisibleElement(driver, locator, description) {
  const element = await driver.wait(
    until.elementLocated(locator),
    TIMEOUT,
    `${description} was not found`
  );

  await driver.wait(
    until.elementIsVisible(element),
    TIMEOUT,
    `${description} is not visible`
  );

  await waitForLoaderToDisappear(driver);
  await element.click();
  await waitForLoaderToDisappear(driver);
}

async function runTest() {
  if (!CLINIC_ADMIN_EMAIL || !CLINIC_ADMIN_PASSWORD) {
    throw new Error(
      "Set CLINIC_ADMIN_EMAIL and CLINIC_ADMIN_PASSWORD first."
    );
  }

  const driver = await new Builder()
    .forBrowser("chrome")
    .build();

  try {
    await driver.manage().window().maximize();

    // Step 1: Open the application.
    await driver.get(BASE_URL);
    await waitForLoaderToDisappear(driver);

    // Step 2: Open Login.
    await clickVisibleElement(
      driver,
      By.xpath("//nav//button[normalize-space()='Login']"),
      "Login button"
    );

    // Step 3: Enter Clinic Admin credentials.
    const emailField = await driver.wait(
      until.elementLocated(By.name("email")),
      TIMEOUT
    );
    await emailField.sendKeys(CLINIC_ADMIN_EMAIL);

    const passwordField = await driver.wait(
      until.elementLocated(By.name("password")),
      TIMEOUT
    );
    await passwordField.sendKeys(CLINIC_ADMIN_PASSWORD);

    // Step 4: Submit login.
    await clickVisibleElement(
      driver,
      By.css("button[type='submit']"),
      "Login submit button"
    );

    // Step 5: Verify the Clinic Admin Dashboard.
    await driver.wait(
      until.elementLocated(
        By.xpath(
          "//h1[contains(normalize-space(.), 'Clinic Admin Dashboard')]"
        )
      ),
      TIMEOUT,
      "Clinic Admin Dashboard did not open"
    );

    await waitForLoaderToDisappear(driver);

    console.log("PASS: Clinic Admin login successful.");
    console.log("PASS: Clinic Admin Dashboard opened.");

    // Step 6: Verify assigned clinic.
    const dashboardText = await getBodyText(driver);

    if (!dashboardText.includes(EXPECTED_CLINIC_NAME)) {
      throw new Error(
        `Assigned clinic "${EXPECTED_CLINIC_NAME}" was not displayed.`
      );
    }

    console.log(
      `PASS: Assigned clinic "${EXPECTED_CLINIC_NAME}" is displayed.`
    );

    // Step 7: Open Workers List.
    await clickVisibleElement(
      driver,
      By.xpath(
        "//*[self::button or self::a]" +
        "[contains(normalize-space(.), 'Workers List')]"
      ),
      "Workers List menu item"
    );

    // Step 8: Wait for the actual worker cards to load.
    await driver.wait(
      until.elementsLocated(
        By.css(".worker-management-card")
      ),
      TIMEOUT,
      "Worker cards did not load"
    );

    await waitForLoaderToDisappear(driver);

    // Step 9: Count visible worker cards.
    const workerElements = await driver.findElements(
      By.css(".worker-management-card")
    );

    let visibleWorkerCount = 0;

    for (const worker of workerElements) {
      try {
        if (await worker.isDisplayed()) {
          visibleWorkerCount++;
        }
      } catch {
        // Ignore elements removed from the page.
      }
    }

    if (visibleWorkerCount !== EXPECTED_WORKER_COUNT) {
      throw new Error(
        `Expected ${EXPECTED_WORKER_COUNT} workers, ` +
        `but found ${visibleWorkerCount} visible worker cards.`
      );
    }

    console.log(
      `PASS: Workers List displays ${visibleWorkerCount} worker cards.`
    );

    console.log(
      "PASS TC-S06: Assigned clinic displayed and its 3 worker cards verified."
    );

  } catch (error) {
    console.error("FAIL TC-S06:", error.message);
    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
}

runTest();
