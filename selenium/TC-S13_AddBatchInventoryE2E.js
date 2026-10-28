
const {
  Builder,
  By,
  until,
  loginAndOpenInventory,
  fillNewBatchForm,
  getBatchRow,
  closeDriver,
} = require("./inventoryE2EHelpers");

(async function TC_S13_AddBatchInventoryE2E() {
  let driver;

  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .build();

    console.log("Step 1: Logging in...");
    await loginAndOpenInventory(driver);

    const batchNumber = `SELENIUM-S13-${Date.now()}`;

    console.log("Step 2: Filling the batch form...");

    await fillNewBatchForm(
      driver,
      batchNumber,
      25,
      120
    );

    const addButton = await driver.wait(
      until.elementLocated(
        By.xpath(
          "//button[normalize-space(.)='Add Vaccine Batch']"
        )
      ),
      10000
    );

    await driver.executeScript(
      "arguments[0].scrollIntoView({block:'center'});",
      addButton
    );

    await driver.wait(
      until.elementIsVisible(addButton),
      10000
    );

    await driver.wait(
      until.elementIsEnabled(addButton),
      10000
    );

    console.log("Step 3: Submitting batch...");
    console.log("Batch number:", batchNumber);

    await addButton.click();

    console.log("Step 4: Waiting for batch row...");

    let row;

    try {
      row = await driver.wait(
        until.elementLocated(
          By.xpath(
            `//tr[.//*[normalize-space(.)='${batchNumber}']]`
          )
        ),
        10000
      );
    } catch (error) {
      console.error(
        "\nOriginal row error:",
        error.message
      );

      console.error(
        "\nCurrent URL:",
        await driver.getCurrentUrl()
      );

      const pageText = await driver
        .findElement(By.css("body"))
        .getText();

      console.error(
        "\nVisible page text after submission:\n"
      );

      console.error(pageText);

      throw new Error(
        "Batch row was not found. Read the original error and page text above."
      );
    }

    const rowText = await row.getText();

    if (!rowText.includes("25")) {
      throw new Error(
        `Expected quantity 25. Actual row:\n${rowText}`
      );
    }

    if (!rowText.includes("Active")) {
      throw new Error(
        `Expected Active status. Actual row:\n${rowText}`
      );
    }

    console.log(
      "\nTC-S13 PASSED: Batch appears in the inventory table."
    );

    console.log("Verified row:\n" + rowText);
  } catch (error) {
    console.error(
      "\nTC-S13 FAILED:",
      error.message
    );

    process.exitCode = 1;
  } finally {
    if (driver) {
      try {
        await closeDriver(driver);
      } catch (error) {
        console.error(
          "Browser cleanup warning:",
          error.message
        );
      }
    }
  }
})();
