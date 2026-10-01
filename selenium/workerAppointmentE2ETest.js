
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

// =====================================
// CONFIGURATION
// =====================================

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const WORKER_EMAIL =  "23201046@uap-bd.edu";
const WORKER_PASSWORD = "8s6l7e";
const TIMEOUT = 15000;

let driver;

// =====================================
// HELPER FUNCTIONS
// =====================================

async function waitForElement(locator, timeout = TIMEOUT) {
    return await driver.wait(
        until.elementLocated(locator),
        timeout
    );
}

async function waitForVisible(locator, timeout = TIMEOUT) {
    const element = await waitForElement(locator, timeout);

    await driver.wait(
        until.elementIsVisible(element),
        timeout
    );

    return element;
}

async function clickElement(locator, timeout = TIMEOUT) {
    const element = await waitForVisible(locator, timeout);

    await driver.wait(
        until.elementIsEnabled(element),
        timeout
    );

    await element.click();
    return element;
}

async function getPageText() {
    return await driver.findElement(By.css("body")).getText();
}

// =====================================
// TEST 1: OPEN IMUNIX
// =====================================

async function testOpenImuniX() {
    console.log("\n========== TEST 1: OPEN IMUNIX ==========");

    await driver.get(`${BASE_URL}/`);

    await driver.wait(
        until.elementLocated(By.css("body")),
        TIMEOUT
    );

    console.log("ImuniX website opened.");

    const pageText = await getPageText();

    if (!pageText.trim()) {
        throw new Error("ImuniX page is empty.");
    }

    console.log("PASS: ImuniX homepage loaded.");
}

// =====================================
// TEST 2: WORKER LOGIN
// =====================================

async function testWorkerLogin() {
    console.log("\n========== TEST 2: WORKER LOGIN ==========");

    if (!WORKER_EMAIL || !WORKER_PASSWORD) {
        throw new Error(
            "Set WORKER_EMAIL and WORKER_PASSWORD in PowerShell."
        );
    }

    // Open login page from homepage.
    const homeLoginButton = await clickElement(
        By.xpath("//button[normalize-space()='Login']")
    );

    console.log("Login page opened.");

    // Enter worker email.
    const emailInput = await waitForVisible(
        By.css("input[name='email']")
    );

    await emailInput.clear();
    await emailInput.sendKeys(WORKER_EMAIL);

    // Enter worker password.
    const passwordInput = await waitForVisible(
        By.css("input[name='password']")
    );

    await passwordInput.clear();
    await passwordInput.sendKeys(WORKER_PASSWORD);

    console.log("Worker login information entered.");

    // Find the login form's submit button.
    const submitButton = await clickElement(
        By.css("button[type='submit']")
    );

    console.log("Login button clicked.");

    // Wait for navigation or a logged-in page.
    await driver.wait(async () => {
        const url = await driver.getCurrentUrl();
        const text = await getPageText();

        return (
            !url.endsWith("/login") ||
            /dashboard|appointments|logout|sign out/i.test(text)
        );
    }, TIMEOUT);

    console.log("PASS: Worker login flow completed.");
}

// =====================================
// TEST 3: OPEN WORKER APPOINTMENTS
// =====================================

async function testOpenAppointments() {
    console.log("\n========== TEST 3: OPEN APPOINTMENTS ==========");

    // Find the Appointments navigation button or link.
    const appointmentLink = await driver.wait(
        async () => {
            const elements = await driver.findElements(
                By.xpath(
                    "//*[self::button or self::a]" +
                    "[contains(normalize-space(.), 'Appointments')]"
                )
            );

            for (const element of elements) {
                if (await element.isDisplayed()) {
                    return element;
                }
            }

            return false;
        },
        TIMEOUT
    );

    await appointmentLink.click();

    console.log("Appointments navigation clicked.");

    await driver.wait(async () => {
        const text = await getPageText();
        return /appointment/i.test(text);
    }, TIMEOUT);

    console.log("PASS: Appointment page opened.");
}

// =====================================
// TEST 4: VIEW TODAY'S APPOINTMENTS
// =====================================

async function testTodayAppointments() {
    console.log("\n========== TEST 4: TODAY'S APPOINTMENTS ==========");

    // Wait until loading finishes and appointment cards appear.
    await driver.wait(async () => {
        const cards = await driver.findElements(
            By.css('[data-testid="appointment-card"]')
        );

        return cards.length > 0;
    }, TIMEOUT);

    const cards = await driver.findElements(
        By.css('[data-testid="appointment-card"]')
    );

    console.log("Appointment cards found:", cards.length);

    if (cards.length === 0) {
        throw new Error("No appointment cards found.");
    }

    console.log("PASS: Today's appointment cards are displayed.");

    return cards.length;
}

// =====================================
// TEST 5: VIEW APPOINTMENT DETAILS
// =====================================

async function testAppointmentDetails() {
    console.log("\n========== TEST 5: APPOINTMENT DETAILS ==========");

    const pageText = await getPageText();

    // These are common appointment fields.
    // Adjust them if your UI uses different labels.
    const hasCitizen =
        /citizen|patient|name/i.test(pageText);

    const hasDate =
        /date|today|2026/i.test(pageText);

    const hasStatus =
        /pending|scheduled|completed|status/i.test(pageText);

    console.log("Citizen information found:", hasCitizen);
    console.log("Date information found:", hasDate);
    console.log("Status information found:", hasStatus);

    if (!hasCitizen || !hasDate || !hasStatus) {
        throw new Error(
            "Citizen, date, or status information may be missing."
        );
    }

    console.log("PASS: Appointment details are visible.");
}

// =====================================
// TEST 6: PROCESS APPOINTMENT
// =====================================

async function testProcessAppointment() {
    console.log("\n========== TEST 6: PROCESS APPOINTMENT ==========");

    // Find a visible Process button.
    // Change the button text if your application uses another label.
    const processButton = await driver.wait(
        async () => {
            const buttons = await driver.findElements(
                By.xpath(
                    "//button[contains(" +
                    "translate(normalize-space(.)," +
                    "'ABCDEFGHIJKLMNOPQRSTUVWXYZ'," +
                    "'abcdefghijklmnopqrstuvwxyz')," +
                    "'process')]"
                )
            );

            for (const button of buttons) {
                if (
                    await button.isDisplayed() &&
                    await button.isEnabled()
                ) {
                    return button;
                }
            }

            return false;
        },
        TIMEOUT
    );

    await processButton.click();

    console.log("Process appointment button clicked.");

    // Wait for a processing dialog or completion action.
    await driver.wait(async () => {
        const text = await getPageText();

        return /complete|vaccin|process|administer/i.test(text);
    }, TIMEOUT);

    console.log("PASS: Appointment processing action opened.");
}

// =====================================
// TEST 7: COMPLETE APPOINTMENT
// =====================================

async function testCompleteAppointment() {
    console.log("\n========== TEST 7: COMPLETE APPOINTMENT ==========");

    // Find the completion button.
    // Adapt this XPath to your actual UI button label.
    const completeButton = await driver.wait(
        async () => {
            const buttons = await driver.findElements(
                By.xpath(
                    "//button[contains(" +
                    "translate(normalize-space(.)," +
                    "'ABCDEFGHIJKLMNOPQRSTUVWXYZ'," +
                    "'abcdefghijklmnopqrstuvwxyz')," +
                    "'complete')]"
                )
            );

            for (const button of buttons) {
                if (
                    await button.isDisplayed() &&
                    await button.isEnabled()
                ) {
                    return button;
                }
            }

            return false;
        },
        TIMEOUT
    );

    await completeButton.click();

    console.log("Complete appointment button clicked.");

    // Handle a browser confirmation alert if the app uses one.
    try {
        await driver.wait(
            async () => {
                try {
                    await driver.switchTo().alert();
                    return true;
                } catch {
                    return false;
                }
            },
            2000
        );

        const alert = await driver.switchTo().alert();
        console.log("Confirmation alert:", await alert.getText());
        await alert.accept();
        console.log("Confirmation accepted.");
    } catch {
        console.log("No browser confirmation alert.");
    }

    // Wait for the page to show Completed.
    await driver.wait(async () => {
        const text = await getPageText();
        return /\bcompleted\b/i.test(text);
    }, TIMEOUT);

    console.log("PASS: Appointment completion is shown.");
}

// =====================================
// TEST 8: PREVENT DUPLICATE COMPLETION
// =====================================

async function testDuplicateCompletion() {
    console.log("\n========== TEST 8: DUPLICATE COMPLETION ==========");

    const pageText = await getPageText();

    if (!/\bcompleted\b/i.test(pageText)) {
        throw new Error(
            "Appointment is not visibly marked completed."
        );
    }

    // Check whether an enabled completion action remains.
    const completionButtons = await driver.findElements(
        By.xpath(
            "//button[contains(" +
            "translate(normalize-space(.)," +
            "'ABCDEFGHIJKLMNOPQRSTUVWXYZ'," +
            "'abcdefghijklmnopqrstuvwxyz')," +
            "'complete')]"
        )
    );

    let enabledCompletionAction = false;

    for (const button of completionButtons) {
        if (
            await button.isDisplayed() &&
            await button.isEnabled()
        ) {
            enabledCompletionAction = true;
            break;
        }
    }

    if (enabledCompletionAction) {
        throw new Error(
            "A completion button is still enabled after completion."
        );
    }

    console.log(
        "PASS: No enabled completion button is visible after completion."
    );
}

// =====================================
// MAIN TEST RUNNER
// =====================================

async function test() {
    console.log("\n======================================");
    console.log(" IMUNIX US-04 WORKER E2E TEST");
    console.log("======================================");

    try {
        console.log("Starting Chrome...");

        driver = await new Builder()
            .forBrowser("chrome")
            .setChromeOptions(new chrome.Options())
            .build();

        await driver.manage().window().maximize();

        await testOpenImuniX();
        await testWorkerLogin();
        await testOpenAppointments();
        await testTodayAppointments();
        await testAppointmentDetails();
        await testProcessAppointment();
        await testCompleteAppointment();
        await testDuplicateCompletion();

        console.log("\n======================================");
        console.log("US-04 TEST FLOW FINISHED");
        console.log("======================================");

    } catch (error) {
        console.error("\n========== TEST ERROR ==========");
        console.error(error.message);

        if (driver) {
            try {
                const screenshot = await driver.takeScreenshot();
                require("fs").writeFileSync(
                    "workerAppointment-error.png",
                    screenshot,
                    "base64"
                );
                console.log("Error screenshot saved.");
            } catch {
                console.log("Could not save error screenshot.");
            }
        }
    } finally {
        if (driver) {
            await driver.quit();
            console.log("Chrome closed.");
        }
    }
}

test();