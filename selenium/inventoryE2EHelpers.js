const { Builder, By, until, Key } = require("selenium-webdriver");
const { Select } = require("selenium-webdriver/lib/select");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const EMAIL = process.env.CLINIC_ADMIN_EMAIL;
const PASSWORD = process.env.CLINIC_ADMIN_PASSWORD;

// Wait until the loading overlay disappears
async function waitForOverlayGone(driver) {
  await driver.wait(async () => {
    const loaders = await driver.findElements(
      By.css(".ix-loader")
    );

    if (loaders.length === 0) {
      return true;
    }

    try {
      return !(await loaders[0].isDisplayed());
    } catch {
      return true;
    }
  }, 20000);
}

// Safely click an element
async function safeClick(driver, element) {
  await waitForOverlayGone(driver);
  await driver.wait(until.elementIsVisible(element), 10000);
  await driver.wait(until.elementIsEnabled(element), 10000);

  try {
    await element.click();
  } catch (error) {
    const message = String(error.message).toLowerCase();

    if (
      !message.includes("intercepted") &&
      !message.includes("not clickable") &&
      !message.includes("other element")
    ) {
      throw error;
    }

    await waitForOverlayGone(driver);
    await driver.sleep(500);
    await element.click();
  }
}

// Find a visible button by its exact text
async function findVisibleButton(driver, text) {
  const buttons = await driver.findElements(
    By.css("button")
  );

  for (const button of buttons) {
    try {
      if (
        (await button.isDisplayed()) &&
        (await button.isEnabled()) &&
        (await button.getText()).trim() === text
      ) {
        return button;
      }
    } catch {
      // Ignore unavailable elements
    }
  }

  throw new Error(`Visible button not found: "${text}"`);
}

// Find the inventory menu
async function findInventoryMenu(driver) {
  const candidates = await driver.findElements(
    By.xpath("//a | //button | //*[@role='button']")
  );

  for (const element of candidates) {
    try {
      if (!(await element.isDisplayed())) {
        continue;
      }

      const text = (await element.getText()).trim();

      if (text.toLowerCase().includes("inventory")) {
        return element;
      }
    } catch {
      // Continue checking other elements
    }
  }

  return null;
}

// Login and open the vaccine inventory page
async function loginAndOpenInventory(driver) {
  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "Clinic admin credentials are missing. Set CLINIC_ADMIN_EMAIL and CLINIC_ADMIN_PASSWORD."
    );
  }

  await driver.get(BASE_URL);
  await driver.sleep(500);
  await waitForOverlayGone(driver);

  const loginButton = await findVisibleButton(
    driver,
    "Login"
  );

  await safeClick(driver, loginButton);

  const emailInput = await driver.wait(
    until.elementLocated(
      By.css('input[name="email"]')
    ),
    15000
  );

  const passwordInput = await driver.wait(
    until.elementLocated(
      By.css('input[name="password"]')
    ),
    15000
  );

  await emailInput.clear();
  await emailInput.sendKeys(EMAIL);

  await passwordInput.clear();
  await passwordInput.sendKeys(PASSWORD);
  await passwordInput.sendKeys(Key.ENTER);

  await driver.wait(
    until.elementLocated(
      By.xpath(
        "//*[normalize-space(.)='Clinic Admin Dashboard']"
      )
    ),
    20000
  );

  await waitForOverlayGone(driver);

  const inventoryMenu = await driver.wait(
    async () => {
      const menu = await findInventoryMenu(driver);
      return menu || false;
    },
    15000,
    "Inventory menu was not found."
  );

  await safeClick(driver, inventoryMenu);

  await driver.wait(
    until.elementLocated(
      By.xpath(
        "//*[normalize-space(.)='Vaccine Inventory']"
      )
    ),
    15000
  );

  await waitForOverlayGone(driver);
  await driver.sleep(500);
}

// Generate a date in YYYY-MM-DD format
function futureDate(daysFromNow) {
  const date = new Date();

  date.setDate(date.getDate() + daysFromNow);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Set an HTML date input and verify its value
async function setDateInput(driver, input, dateValue) {
  await driver.wait(
    until.elementIsVisible(input),
    10000
  );

  await driver.wait(
    until.elementIsEnabled(input),
    10000
  );

  await driver.executeScript(
    `
      const input = arguments[0];
      const dateValue = arguments[1];

      input.focus();

      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      ).set;

      setter.call(input, dateValue);

      input.dispatchEvent(
        new Event("input", { bubbles: true })
      );

      input.dispatchEvent(
        new Event("change", { bubbles: true })
      );

      input.blur();
    `,
    input,
    dateValue
  );

  await driver.wait(async () => {
    const actualValue = await input.getAttribute("value");
    return actualValue === dateValue;
  }, 5000, `Date input did not accept ${dateValue}`);

  const actualValue = await input.getAttribute("value");

  console.log("Expected expiry date:", dateValue);
  console.log("Actual expiry input value:", actualValue);

  if (actualValue !== dateValue) {
    throw new Error(
      `Could not set expiry date. Expected ${dateValue}, got ${actualValue}`
    );
  }
}

// Fill the Add Vaccine Batch form
async function fillNewBatchForm(
  driver,
  batchNumber,
  quantity,
  expiryDays
) {
  const vaccineSelect = await driver.wait(
    until.elementLocated(
      By.css('select[name="vaccineId"]')
    ),
    15000
  );

  await driver.wait(async () => {
    const options = await vaccineSelect.findElements(
      By.css("option")
    );

    for (const option of options) {
      const value = await option.getAttribute("value");

      if (value) {
        return true;
      }
    }

    return false;
  }, 15000);

  const options = await vaccineSelect.findElements(
    By.css("option")
  );

  let selectedValue = null;

  for (const option of options) {
    const value = await option.getAttribute("value");
    const text = (await option.getText()).trim();

    if (value && text) {
      selectedValue = value;
      break;
    }
  }

  if (!selectedValue) {
    throw new Error(
      "No active vaccine is available. Add an active vaccine first."
    );
  }

  const select = new Select(vaccineSelect);
  await select.selectByValue(selectedValue);

  const batchInput = await driver.wait(
    until.elementLocated(
      By.css('input[name="batchNumber"]')
    ),
    10000
  );

  const quantityInput = await driver.wait(
    until.elementLocated(
      By.css('input[name="quantity"]')
    ),
    10000
  );

  const expiryInput = await driver.wait(
    until.elementLocated(
      By.css('input[name="expiryDate"]')
    ),
    10000
  );

  await batchInput.clear();
  await batchInput.sendKeys(batchNumber);

  await quantityInput.clear();
  await quantityInput.sendKeys(String(quantity));

  const expiryDate = futureDate(expiryDays);

  await setDateInput(
    driver,
    expiryInput,
    expiryDate
  );
}

// Find an inventory table row by batch number
async function getBatchRow(driver, batchNumber) {
  const xpath =
    `//tr[.//*[normalize-space(.)='${batchNumber}']]`;

  return driver.wait(
    until.elementLocated(By.xpath(xpath)),
    15000
  );
}

// Close the Selenium browser
async function closeDriver(driver) {
  if (driver) {
    await driver.quit();
  }
}

module.exports = {
  Builder,
  By,
  until,
  loginAndOpenInventory,
  fillNewBatchForm,
  getBatchRow,
  closeDriver,
  futureDate,
  setDateInput,
};