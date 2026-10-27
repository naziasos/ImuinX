
const { Builder, By, until } = require("selenium-webdriver");
const assert = require("assert");

const BASE_URL = "http://localhost:5173";
const EMAIL = process.env.WORKER_EMAIL;
const PASSWORD = process.env.WORKER_PASSWORD;
const TIMEOUT = 10000;

async function getPageText(driver) {
  return await driver.findElement(By.css("body")).getText();
}

async function findVisibleElement(driver, xpath) {
  const elements = await driver.findElements(By.xpath(xpath));

  for (const element of elements) {
    if (
      await element.isDisplayed() &&
      await element.isEnabled()
    ) {
      return element;
    }
  }

  return null;
}

async function clickText(driver, text) {
  const xpath =
    `//button[normalize-space(.)="${text}"]` +
    ` | //a[normalize-space(.)="${text}"]`;

  const element = await driver.wait(
    async () => await findVisibleElement(driver, xpath),
    TIMEOUT,
    `Could not find clickable button/link: "${text}"`
  );

  await element.click();
}

async function runTest() {
  const driver = await new Builder().forBrowser("chrome").build();

  try {
    assert(
      EMAIL && PASSWORD,
      "Set WORKER_EMAIL and WORKER_PASSWORD environment variables."
    );

    // Step 1: Open ImuniX
    await driver.get(BASE_URL);
    await driver.sleep(1000);

    console.log("Opened URL:", await driver.getCurrentUrl());
    console.log("Page title:", await driver.getTitle());

    // Step 2: Open login form if it is not already open
    let passwordFields = await driver.findElements(
      By.css('input[type="password"]')
    );

    if (passwordFields.length === 0) {
      const loginLink = await findVisibleElement(
        driver,
        "//button[normalize-space(.)='Login']" +
        " | //a[normalize-space(.)='Login']"
      );

      if (loginLink) {
        await loginLink.click();
        await driver.sleep(700);
      }
    }

    // Step 3: Wait for login form
    await driver.wait(
      until.elementLocated(By.css('input[type="password"]')),
      TIMEOUT,
      "Password field not found. Login form did not open."
    );

    const emailFields = await driver.findElements(
      By.css(
        'input[type="email"], input[name="email"], ' +
        'input[placeholder="Email address"]'
      )
    );

    passwordFields = await driver.findElements(
      By.css('input[type="password"]')
    );

    assert(emailFields.length > 0, "Email field not found.");
    assert(passwordFields.length > 0, "Password field not found.");

    await emailFields[0].clear();
    await emailFields[0].sendKeys(EMAIL);

    await passwordFields[0].clear();
    await passwordFields[0].sendKeys(PASSWORD);

    // Actual login button text from your UI
    await clickText(driver, "Sign in");

    // Step 4: Wait for login result
    await driver.sleep(2000);

    let pageText = await getPageText(driver);

    console.log("URL after login:", await driver.getCurrentUrl());

    if (
      /invalid credentials|incorrect password|login failed/i.test(pageText)
    ) {
      throw new Error(
        "Worker login failed. Check the test account credentials."
      );
    }

    // Step 5: Open worker appointments
    const appointmentsLink = await findVisibleElement(
      driver,
      "//button[normalize-space(.)='Appointments']" +
      " | //a[normalize-space(.)='Appointments']"
    );

    if (!appointmentsLink) {
      console.log("Page after login:", pageText.substring(0, 1800));
      throw new Error(
        'Worker "Appointments" menu was not found after login.'
      );
    }

    await appointmentsLink.click();
    await driver.sleep(1000);

    // Step 6: Find a Process button for an eligible appointment
    const processButton = await driver.wait(
      async () => {
        return await findVisibleElement(
          driver,
          "//button[normalize-space(.)='Process']"
        );
      },
      TIMEOUT,
      "No Process button found. Check that an eligible Confirmed appointment is assigned to this worker."
    );

    await processButton.click();
    await driver.sleep(500);

    // Step 7: Complete appointment
    await clickText(driver, "✓ Mark Appointment Completed");

    // Step 8: Verify Completed status
    await driver.wait(
      async () => {
        const text = await getPageText(driver);
        return /\bcompleted\b/i.test(text);
      },
      TIMEOUT,
      "Completed status was not displayed."
    );

    // Step 9: Verify completion action is no longer available
    const completionButtons = await driver.findElements(
      By.xpath(
        "//button[contains(normalize-space(.),'Mark Appointment Completed')]"
      )
    );

    let visibleCompletionButtons = 0;

    for (const button of completionButtons) {
      if (await button.isDisplayed()) {
        visibleCompletionButtons++;
      }
    }

    assert.strictEqual(
      visibleCompletionButtons,
      0,
      "Completion action is still visible after completion."
    );

    console.log(
      "PASS: TC-S12 - Completed status verified and completion action is no longer visible."
    );
  } catch (error) {
    console.error("FAIL: TC-S12", error.message);

    try {
      console.log("Current URL:", await driver.getCurrentUrl());
      console.log(
        "Visible page text:",
        (await getPageText(driver)).substring(0, 1800)
      );
    } catch {
      // Keep the original error.
    }

    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
}

runTest();
