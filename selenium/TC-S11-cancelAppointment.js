
const { Builder, By, until } = require("selenium-webdriver");
const assert = require("assert");

const BASE_URL = "http://localhost:5173";
const EMAIL = process.env.CITIZEN_EMAIL;
const PASSWORD = process.env.CITIZEN_PASSWORD;
const TIMEOUT = 10000;

async function getPageText(driver) {
  return await driver.findElement(By.css("body")).getText();
}

async function findVisibleByText(driver, text) {
  const xpath =
    `//*[self::button or self::a or self::div or self::span]` +
    `[normalize-space(.)="${text}"]`;

  const elements = await driver.findElements(By.xpath(xpath));

  for (const element of elements) {
    if (await element.isDisplayed() && await element.isEnabled()) {
      return element;
    }
  }

  return null;
}

async function clickVisibleText(driver, text) {
  const element = await driver.wait(
    async () => await findVisibleByText(driver, text),
    TIMEOUT,
    `Could not find clickable text: "${text}"`
  );

  await element.click();
}

async function runTest() {
  const driver = await new Builder().forBrowser("chrome").build();

  try {
    assert(EMAIL && PASSWORD,
      "Set CITIZEN_EMAIL and CITIZEN_PASSWORD first.");

    // 1. Open application
    await driver.get(BASE_URL);
    await driver.wait(
      until.elementLocated(By.css("body")),
      TIMEOUT
    );
    await driver.sleep(1000);

    console.log("Opened URL:", await driver.getCurrentUrl());

    // 2. Open login form if needed
    let passwordFields = await driver.findElements(
      By.css('input[type="password"]')
    );

    if (passwordFields.length === 0) {
      const loginLink = await findVisibleByText(driver, "Login");

      if (loginLink) {
        await loginLink.click();
      } else {
        throw new Error(
          "Login form is not open and Login option was not found."
        );
      }
    }

    // 3. Find and fill login form
    await driver.wait(
      until.elementLocated(By.css('input[type="password"]')),
      TIMEOUT,
      "Password field not found."
    );

    const emailFields = await driver.findElements(
      By.css(
        'input[type="email"], input[name="email"], input[placeholder="Email address"]'
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

    // Actual login page button says "Sign in"
    await clickVisibleText(driver, "Sign in");

    // 4. Wait and check login result
    await driver.sleep(2000);

    let pageText = await getPageText(driver);
    console.log("URL after login:", await driver.getCurrentUrl());

    if (/invalid credentials|incorrect password|login failed/i.test(pageText)) {
      throw new Error("Login failed. Check the citizen test account credentials.");
    }

    // 5. Open My Appointments
    const appointmentsLink = await findVisibleByText(
      driver,
      "My Appointments"
    );

    if (!appointmentsLink) {
      console.log("Page after login:", pageText.substring(0, 1800));
      throw new Error(
        'Login may not have reached the citizen dashboard, or "My Appointments" is not currently visible.'
      );
    }

    await appointmentsLink.click();
    await driver.sleep(1000);

    // 6. Find an active appointment's Cancel button
    const cancelButton = await driver.wait(
      async () => {
        const buttons = await driver.findElements(
          By.xpath(
            "//button[contains(" +
            "translate(normalize-space(.),'CANCEL','cancel'),'cancel'" +
            ")]"
          )
        );

        for (const button of buttons) {
          if (await button.isDisplayed() && await button.isEnabled()) {
            return button;
          }
        }

        return false;
      },
      TIMEOUT,
      "No active appointment Cancel button found. Create a test appointment first."
    );

    await cancelButton.click();

    // 7. Confirm browser dialog if shown
    try {
      await driver.wait(until.alertIsPresent(), 2000);
      await driver.switchTo().alert().accept();
    } catch {
      // No browser confirmation dialog.
    }

    // 8. Verify cancellation status
    await driver.wait(
      async () => {
        const text = await getPageText(driver);
        return /cancelled/i.test(text);
      },
      TIMEOUT,
      "Cancelled status was not displayed after the cancellation request."
    );

    console.log("PASS: TC-S11 - Cancellation status verified.");
    console.log(
      "Note: Verify slot availability separately on the booking page."
    );
  } catch (error) {
    console.error("FAIL: TC-S11", error.message);

    try {
      console.log("Current URL:", await driver.getCurrentUrl());
      console.log(
        "Visible page text:",
        (await getPageText(driver)).substring(0, 1800)
      );
    } catch {
      // Preserve the original failure.
    }

    process.exitCode = 1;
  } finally {
    await driver.quit();
  }
}

runTest();
