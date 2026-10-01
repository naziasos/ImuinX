const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

async function test() {
  let driver;

  try {
    console.log("Starting Chrome...");

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(new chrome.Options())
      .build();

    await driver.manage().window().maximize();

    // =============================
    // OPEN IMUNIX
    // =============================
    console.log("Opening ImuniX...");
    await driver.get("http://localhost:5173/");

    // =============================
    // LOGIN
    // =============================
    const homeLoginButton = await driver.wait(
      async () => {
        const buttons = await driver.findElements(
          By.xpath("//button[normalize-space()='Login']")
        );

        return buttons.length > 0 ? buttons[0] : false;
      },
      10000
    );

    await homeLoginButton.click();

    console.log("Login page opened.");

    const emailInput = await driver.wait(
      async () => {
        const elements = await driver.findElements(
          By.css("input[name='email']")
        );

        return elements.length > 0 ? elements[0] : false;
      },
      10000
    );

    const passwordInput = await driver.findElement(
      By.css("input[name='password']")
    );

    // CHANGE THESE
    await emailInput.sendKeys("23201032@uap-bd.edu");
    await passwordInput.sendKeys("tanha123");

    console.log("Login information entered.");

    const loginButtons = await driver.findElements(
      By.xpath("//button[normalize-space()='Login']")
    );

    await loginButtons[1].click();

    console.log("Login button clicked.");

    await driver.sleep(3000);

    // =============================
    // OPEN APPOINTMENTS
    // =============================
    const appointmentButton = await driver.wait(
      async () => {
        const buttons = await driver.findElements(
          By.xpath("//button[contains(normalize-space(.), 'Appointments')]")
        );

        return buttons.length > 0 ? buttons[0] : false;
      },
      10000
    );

    await appointmentButton.click();

    console.log("Appointments page opened.");

    await driver.sleep(2000);

    // =============================
    // SELECT CLINIC
    // =============================
    const clinicSelect = await driver.wait(
      async () => {
        const selects = await driver.findElements(By.css("select"));

        return selects.length > 0 ? selects[0] : false;
      },
      10000
    );

    const clinicOptions = await clinicSelect.findElements(
      By.css("option")
    );

    if (clinicOptions.length < 2) {
      throw new Error("No clinic is available.");
    }

    await clinicOptions[1].click();

    console.log("Clinic selected.");

    // =============================
    // SELECT DATE
    // =============================
    const dateInput = await driver.findElement(
      By.css("input[type='date']")
    );

    const appointmentDate = "2026-10-02";

    await dateInput.sendKeys(appointmentDate);

    console.log("Date selected:", appointmentDate);

    // =============================
    // WAIT FOR TIME SLOTS
    // =============================
    await driver.sleep(3000);

    // =============================
    // FIND 09:30 AM
    // =============================
    console.log("Looking for 09:30 AM...");

    const timeButton = await driver.wait(
      async () => {
        const buttons = await driver.findElements(
          By.xpath("//button[normalize-space()='09:30 AM']")
        );

        return buttons.length > 0 ? buttons[0] : false;
      },
      10000
    );

    console.log("09:30 AM found.");

    // =============================
    // SELECT TIME
    // =============================
    await timeButton.click();

    console.log("09:30 AM selected.");

    // =============================
    // CONFIRM BUTTON
    // =============================
    const confirmButton = await driver.wait(
      async () => {
        const buttons = await driver.findElements(
          By.xpath("//button[normalize-space()='Confirm Appointment']")
        );

        if (buttons.length === 0) {
          return false;
        }

        const enabled = await buttons[0].isEnabled();

        return enabled ? buttons[0] : false;
      },
      10000
    );

    console.log("Confirm Appointment button is enabled.");

    await confirmButton.click();

    console.log("Confirm Appointment clicked.");

    // =============================
    // HANDLE SUCCESS ALERT
    // =============================
    console.log("Waiting for confirmation alert...");

    await driver.sleep(1000);

    try {
      const alert = await driver.switchTo().alert();

      const alertText = await alert.getText();

      console.log("\n========== ALERT ==========");
      console.log(alertText);

      await alert.accept();

      console.log("Alert accepted.");

      if (alertText.includes("Appointment Booked Successfully")) {
        console.log("\nSUCCESS: Appointment was booked.");
      } else {
        console.log("\nAlert appeared, but success text was not found.");
      }

    } catch (alertError) {
      console.log("No browser alert was found.");
    }

    // =============================
    // VERIFY APPOINTMENT
    // =============================
    await driver.sleep(2000);

    console.log("\n========== VERIFYING APPOINTMENT ==========");

    const pageText = await driver
      .findElement(By.css("body"))
      .getText();

    console.log(pageText);

    if (
      pageText.includes("10/2/2026") &&
      pageText.includes("09:30 AM")
    ) {
      console.log("\nSUCCESS: New appointment appears in the appointment list.");
    } else {
      console.log("\nWARNING: New appointment was not found in the page text.");
    }

    console.log("\n======================================");
    console.log("APPOINTMENT TEST FINISHED");
    console.log("======================================");

    await driver.sleep(5000);

  } catch (error) {
    console.error("\n========== ERROR ==========");
    console.error(error);
  } finally {
    if (driver) {
      await driver.quit();
      console.log("Chrome closed.");
    }
  }
}

test();