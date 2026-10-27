const { Builder, By, until } = require("selenium-webdriver");

const BASE_URL = "http://localhost:5173";
const TIMEOUT = 15000;

const CLINIC_ADMIN_EMAIL = process.env.CLINIC_ADMIN_EMAIL;
const CLINIC_ADMIN_PASSWORD = process.env.CLINIC_ADMIN_PASSWORD;

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
        // Loader was removed from the DOM.
      }
    }

    return true;
  }, TIMEOUT, "Loading overlay did not disappear");
}

async function clickWhenReady(driver, locator) {
  await waitForLoaderToDisappear(driver);

  const element = await driver.wait(
    until.elementLocated(locator),
    TIMEOUT
  );

  await driver.wait(
    until.elementIsVisible(element),
    TIMEOUT
  );

  await driver.wait(
    until.elementIsEnabled(element),
    TIMEOUT
  );

  await waitForLoaderToDisappear(driver);
  await element.click();
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

  const runId = Date.now();
  const workerName = `M2 Selenium Worker ${runId}`;
  const workerEmail = `m2.worker.${runId}@example.com`;

  try {
    await driver.manage().window().maximize();

    // Step 1: Open the application.
    await driver.get(BASE_URL);

    // Step 2: Open Login.
    await clickWhenReady(
      driver,
      By.xpath("//nav//button[normalize-space()='Login']")
    );

    // Step 3: Enter clinic admin credentials.
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
    await clickWhenReady(
      driver,
      By.css("button[type='submit']")
    );

    // Step 5: Verify the clinic admin dashboard.
    await driver.wait(
      until.elementLocated(
        By.xpath(
          "//h1[contains(normalize-space(.), 'Clinic Admin Dashboard')]"
        )
      ),
      TIMEOUT
    );

    await waitForLoaderToDisappear(driver);

    // Step 6: Click Add Worker in the sidebar menu.
    await clickWhenReady(
      driver,
      By.xpath(
        "//*[self::button or self::a]" +
        "[contains(normalize-space(.), 'Add Worker')]"
      )
    );

    // Step 7: Wait for the Add Worker form.
    const workerNameField = await driver.wait(
      until.elementLocated(
        By.css("input[placeholder='Enter worker name']")
      ),
      TIMEOUT
    );

    await driver.wait(
      until.elementIsVisible(workerNameField),
      TIMEOUT
    );

    await workerNameField.sendKeys(workerName);

    const workerEmailField = await driver.wait(
      until.elementLocated(
        By.css("input[placeholder='Enter worker email']")
      ),
      TIMEOUT
    );

    await workerEmailField.sendKeys(workerEmail);

    // Step 8: Submit the form.
    await clickWhenReady(
      driver,
      By.css("button.create-worker-button")
    );

    // Step 9: Verify worker creation success message.
    await driver.wait(async () => {
      const messages = await driver.findElements(
        By.css(".add-worker-message")
      );

      for (const message of messages) {
        try {
          if (!(await message.isDisplayed())) {
            continue;
          }

          const text = (await message.getText()).toLowerCase();

          if (text.includes("worker created successfully")) {
            return true;
          }
        } catch {
          // Retry if the page re-renders.
        }
      }

      return false;
    }, TIMEOUT, "Worker creation success message not found");

    // Step 10: Verify the Workers page.
    await driver.wait(
      until.elementLocated(
        By.xpath("//h1[normalize-space()='Workers']")
      ),
      TIMEOUT
    );

    await waitForLoaderToDisappear(driver);

    // Step 11: Verify the new worker appears in the list.
    await driver.wait(async () => {
      const entries = await driver.findElements(
        By.xpath(
          `//*[contains(normalize-space(.), '${workerEmail}')]`
        )
      );

      for (const entry of entries) {
        try {
          if (await entry.isDisplayed()) {
            return true;
          }
        } catch {
          // Retry if the list re-renders.
        }
      }

      return false;
    }, TIMEOUT, "Created worker was not found in the Workers list");

    console.log(
      "PASS TC-S06: Worker created and shown in worker list."
    );
    console.log("Worker:", workerName);
    console.log("Worker email:", workerEmail);
  } catch (error) {
    console.error("FAIL TC-S06:", error.message);
    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
}

runTest();