
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = "http://localhost:5173";
const TIMEOUT = 20000;

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

const uniqueId = Date.now();
const uniqueEmail = `selenium.${uniqueId}@example.com`;
const testName = `Selenium Profile ${uniqueId}`;

// ---------------- COMMON HELPERS ----------------

async function waitForLoader(driver) {
  await driver.wait(
    async () => {
      const overlays = await driver.findElements(
        By.css(".ix-loader__glow")
      );

      for (const overlay of overlays) {
        if (await overlay.isDisplayed()) return false;
      }

      return true;
    },
    TIMEOUT,
    "Loading overlay did not disappear"
  );
}

async function waitVisible(driver, locator) {
  const element = await driver.wait(
    until.elementLocated(locator),
    TIMEOUT
  );

  await driver.wait(
    until.elementIsVisible(element),
    TIMEOUT
  );

  return element;
}

async function clickElement(driver, element) {
  await waitForLoader(driver);

  await driver.wait(
    until.elementIsVisible(element),
    TIMEOUT
  );

  await driver.wait(
    until.elementIsEnabled(element),
    TIMEOUT
  );

  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    element
  );

  await waitForLoader(driver);
  await element.click();
}

async function clickNav(driver, name) {
  const button = await waitVisible(
    driver,
    By.xpath(`//nav//button[normalize-space()='${name}']`)
  );

  await clickElement(driver, button);
}

async function fill(driver, locator, value) {
  const element = await waitVisible(driver, locator);

  await element.clear();
  await element.sendKeys(value);
}

async function waitForBodyText(driver, pattern) {
  await driver.wait(
    async () => {
      const text = await driver
        .findElement(By.css("body"))
        .getText();

      return pattern.test(text);
    },
    TIMEOUT,
    `Expected page text: ${pattern}`
  );
}

async function startApp(driver) {
  await driver.get(BASE_URL);
  await waitForLoader(driver);
}

async function login(driver) {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    throw new Error(
      "Set TEST_EMAIL and TEST_PASSWORD in PowerShell."
    );
  }

  await startApp(driver);

  await driver.executeScript(
    "localStorage.clear(); sessionStorage.clear();"
  );

  await driver.navigate().refresh();
  await waitForLoader(driver);

  await clickNav(driver, "Login");

  await fill(
    driver,
    By.name("email"),
    TEST_EMAIL
  );

  await fill(
    driver,
    By.name("password"),
    TEST_PASSWORD
  );

  const submit = await waitVisible(
    driver,
    By.xpath(
      "//button[@type='submit' and normalize-space()='Sign in']"
    )
  );

  await clickElement(driver, submit);

  await driver.wait(
    async () =>
      Boolean(
        await driver.executeScript(
          "return localStorage.getItem('token');"
        )
      ),
    TIMEOUT,
    "Login token was not saved"
  );

  await waitForBodyText(driver, /dashboard/i);
}

// ---------------- TC-S01: REGISTER ----------------

async function testRegistration(driver) {
  console.log("\nTC-S01: Register new account");

  await startApp(driver);
  await clickNav(driver, "Register");

  // Selectors match the existing Register.jsx.
  await fill(driver, By.id("name"), "Selenium Test User");
  await fill(driver, By.id("email"), uniqueEmail);
  await fill(driver, By.id("password"), "Selenium@12345");
  await fill(driver, By.id("confirm"), "Selenium@12345");

  const submit = await waitVisible(
    driver,
    By.xpath(
      "//button[@type='submit' and normalize-space()='Create account']"
    )
  );

  await clickElement(driver, submit);

  // Register.jsx shows "OTP sent!" when registration succeeds.
  await driver.wait(
    async () => {
      const body = await driver
        .findElement(By.css("body"))
        .getText();

      return /otp sent/i.test(body);
    },
    TIMEOUT,
    "OTP confirmation was not displayed"
  );

  console.log(
    "PASS TC-S01: Registration confirmation displayed."
  );

  console.log("Test registration email:", uniqueEmail);
}

// ---------------- TC-S02: LOGIN ----------------

async function testLogin(driver) {
  console.log("\nTC-S02: Login and dashboard");

  await login(driver);

  console.log(
    "PASS TC-S02: Login token saved and dashboard displayed."
  );
}

// ---------------- TC-S03: LOGIN + EDIT PROFILE ----------------

async function testEditProfile(driver) {
  console.log("\nTC-S03: Login and edit profile");

  await login(driver);

  // Existing dashboard navigation selector.
  const editButton = await waitVisible(
    driver,
    By.xpath(
      "//button[contains(normalize-space(),'Edit Profile')]"
    )
  );

  await clickElement(driver, editButton);

  await waitVisible(
    driver,
    By.xpath("//h1[normalize-space()='Edit Your Profile']")
  );

  const nameField = await waitVisible(
    driver,
    By.id("profile-name")
  );

  // Keep the original name so the test can restore it.
  const originalName = await nameField.getAttribute("value");

  if (!originalName || !originalName.trim()) {
    throw new Error("Original profile name was empty.");
  }

  // Change the name and save.
  await nameField.clear();
  await nameField.sendKeys(testName);

  const saveButton = await waitVisible(
    driver,
    By.xpath(
      "//button[@type='submit' and normalize-space()='Save Changes']"
    )
  );

  await clickElement(driver, saveButton);

  await driver.wait(
    async () => {
      const statuses = await driver.findElements(
        By.css("[role='status']")
      );

      for (const status of statuses) {
        const text = await status.getText();

        if (/updated successfully/i.test(text)) {
          return true;
        }
      }

      return false;
    },
    TIMEOUT,
    "Profile update success message was not displayed"
  );

  const savedName = await driver
    .findElement(By.id("profile-name"))
    .getAttribute("value");

  if (savedName !== testName) {
    throw new Error("Updated profile name did not remain in the form.");
  }

  console.log("PASS: Profile update success message displayed.");

  // Try to restore the original name to avoid leaving test data behind.
  try {
    const currentNameField = await waitVisible(
      driver,
      By.id("profile-name")
    );

    await currentNameField.clear();
    await currentNameField.sendKeys(originalName);

    const saveAgain = await waitVisible(
      driver,
      By.xpath(
        "//button[@type='submit' and normalize-space()='Save Changes']"
      )
    );

    await clickElement(driver, saveAgain);

    await driver.wait(
      async () => {
        const field = await driver.findElement(
          By.id("profile-name")
        );

        return (
          (await field.getAttribute("value")) === originalName
        );
      },
      TIMEOUT,
      "Original name was not restored in the form"
    );

    console.log("Original profile name restoration attempted.");
  } catch (error) {
    console.log(
      "WARNING: Could not confirm profile restoration:",
      error.message
    );
  }

  console.log("PASS TC-S03: Profile edit and save verified.");
}

// ---------------- RUN TESTS ----------------

async function runTest(testFunction, testName) {
  let driver;

  try {
    const options = new chrome.Options();

    options.addArguments(
      "--disable-extensions",
      "--disable-background-networking",
      "--no-first-run"
    );

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    await testFunction(driver);
    return true;
  } catch (error) {
    console.error(`FAIL ${testName}:`, error.message);
    return false;
  } finally {
    if (driver) {
      try {
        await driver.quit();
      } catch {
        // Chrome may already have disconnected.
      }
    }
  }
}

async function main() {
  let passed = 0;
  let failed = 0;

  const tests = [
    ["TC-S01", testRegistration],
    ["TC-S02", testLogin],
    ["TC-S03", testEditProfile],
  ];

  for (const [name, testFunction] of tests) {
    console.log(`\n========== ${name} ==========`);

    const success = await runTest(testFunction, name);

    if (success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log("\n========== TEST SUMMARY ==========");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}`);
  console.log("==================================");

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Selenium execution error:", error.message);
  process.exitCode = 1;
});
