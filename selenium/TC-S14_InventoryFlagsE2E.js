const {
  Builder,
  By,
  until,
  loginAndOpenInventory,
  fillNewBatchForm,
  getBatchRow,
  closeDriver,
  futureDate,
} = require("./inventoryE2EHelpers");

(async function TC_S14_InventoryFlagsE2E() {
  let driver;

  try {
    driver = await new Builder().forBrowser("chrome").build();

    console.log("Step 1: Login and open inventory...");
    await loginAndOpenInventory(driver);

    const batchNumber = `SELENIUM-S14-${Date.now()}`;

    console.log("Step 2: Create low-stock, near-expiry batch...");
    console.log("Batch number:", batchNumber);

    await fillNewBatchForm(driver, batchNumber, 5, 10);

    // Verify expiry date input
    const expiryInput = await driver.findElement(
      By.css('input[name="expiryDate"]')
    );

    const expectedExpiry = futureDate(10);
    const actualExpiry = await expiryInput.getAttribute("value");

    console.log("Expected expiry:", expectedExpiry);
    console.log("Expiry input value:", actualExpiry);

    if (actualExpiry !== expectedExpiry) {
      throw new Error(
        `Expiry date mismatch. Expected ${expectedExpiry}, got ${actualExpiry}`
      );
    }

    const addButton = await driver.wait(
      until.elementLocated(
        By.xpath("//button[normalize-space(.)='Add Vaccine Batch']")
      ),
      10000
    );

    await driver.executeScript(
      "arguments[0].scrollIntoView({block:'center'});",
      addButton
    );

    await driver.wait(until.elementIsVisible(addButton), 10000);
    await driver.wait(until.elementIsEnabled(addButton), 10000);

    await addButton.click();

    console.log("Step 3: Verify the new batch appears...");

    let row;

    try {
      row = await driver.wait(
        until.elementLocated(
          By.xpath(`//tr[.//*[normalize-space(.)='${batchNumber}']]`)
        ),
        15000
      );
    } catch (error) {
      console.error("Batch row was not found.");
      console.error("Current URL:", await driver.getCurrentUrl());

      console.error(
        "Page text after submission:\n",
        await driver.findElement(By.css("body")).getText()
      );

      throw error;
    }

    await driver.wait(until.elementIsVisible(row), 10000);

    let rowText = await row.getText();

    console.log("Initial row:\n" + rowText);

    if (!rowText.includes("Low stock")) {
      throw new Error(`Low stock flag missing. Row: ${rowText}`);
    }

    if (!rowText.includes("Expiring Soon")) {
      throw new Error(`Expiring Soon status missing. Row: ${rowText}`);
    }

    console.log("Step 4: Both flags are visible.");

    const editButton = await row.findElement(
      By.xpath(".//button[normalize-space(.)='Edit Stock']")
    );

    await driver.executeScript(
      "arguments[0].scrollIntoView({block:'center'});",
      editButton
    );

    await editButton.click();

    const quantityInput = await driver.wait(
      until.elementLocated(By.css('input[name="quantity"]')),
      10000
    );

    const updateExpiryInput = await driver.wait(
      until.elementLocated(By.css('input[name="expiryDate"]')),
      10000
    );

    const updatedExpiry = futureDate(90);

    await quantityInput.clear();
    await quantityInput.sendKeys("50");

    await updateExpiryInput.clear();
    await updateExpiryInput.sendKeys(updatedExpiry);

    const actualUpdatedExpiry =
      await updateExpiryInput.getAttribute("value");

    console.log("Updated expiry expected:", updatedExpiry);
    console.log("Updated expiry input value:", actualUpdatedExpiry);

    if (actualUpdatedExpiry !== updatedExpiry) {
      throw new Error(
        `Updated expiry mismatch. Expected ${updatedExpiry}, got ${actualUpdatedExpiry}`
      );
    }

    const updateButton = await driver.wait(
      until.elementLocated(
        By.xpath("//button[normalize-space(.)='Update Stock']")
      ),
      10000
    );

    await driver.wait(until.elementIsVisible(updateButton), 10000);
    await driver.wait(until.elementIsEnabled(updateButton), 10000);

    await updateButton.click();

    console.log("Step 5: Verify flags clear after update...");

    await driver.wait(
      async () => {
        try {
          const updatedRow = await getBatchRow(driver, batchNumber);
          const text = await updatedRow.getText();

          return (
            /\b50\b/.test(text) &&
            text.includes("Active") &&
            !text.includes("Low stock") &&
            !text.includes("Expiring Soon")
          );
        } catch (_) {
          return false;
        }
      },
      15000,
      "Updated batch values or flags did not change as expected."
    );

    row = await getBatchRow(driver, batchNumber);
    rowText = await row.getText();

    console.log("Updated row:\n" + rowText);

    console.log(
      "TC-S14 PASSED: Low-stock and near-expiry flags appeared and cleared after update."
    );
  } catch (error) {
    console.error("\nTC-S14 FAILED:", error.message);
    process.exitCode = 1;
  } finally {
    if (driver) {
      try {
        await closeDriver(driver);
      } catch (error) {
        console.error("Browser cleanup warning:", error.message);
      }
    }
  }
})();