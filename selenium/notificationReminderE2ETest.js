
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const path = require("path");
const mongoose = require("../backend/node_modules/mongoose");
const bcrypt = require("../backend/node_modules/bcryptjs");
const dotenv = require("../backend/node_modules/dotenv");

dotenv.config({
    path: path.join(__dirname, "../backend/.env"),
});

const User = require("../backend/models/User");
const Clinic = require("../backend/models/Clinic");
const Appointment = require("../backend/models/Appointment");
const Notification = require("../backend/models/Notification");
const createAppointmentReminders = require(
    "../backend/jobs/appointmentReminder"
);

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:5000/api";
const TIMEOUT = 20000;

// A fresh test account is generated for every run.
// It does not use or overwrite your personal account.
const RUN_ID = `${Date.now()}`;
const CITIZEN_EMAIL =
    `selenium.notification.${RUN_ID}@example.test`;
const CITIZEN_PASSWORD = "SeleniumTest123!";

const REQUESTED_CLINIC_ID =
    process.env.TEST_CLINIC_ID || "6ab2a8216d95d5053fb1323e";

let driver;
let token;
let citizenId;
let testUserId;
let clinicId;
let appointmentId;
let reminderId;
let reminderMessage;
let unreadCountBefore = 0;
let mongoConnected = false;

const results = [];

function expect(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

async function getPageText() {
    return driver.findElement(By.css("body")).getText();
}

async function getToken() {
    return driver.executeScript(`
        return localStorage.getItem("token")
            || localStorage.getItem("accessToken")
            || localStorage.getItem("jwt");
    `);
}

async function waitForLoaderToDisappear(timeout = TIMEOUT) {
    await driver.wait(async () => {
        const loaders = await driver.findElements(
            By.css(".ix-loader__glow")
        );

        for (const loader of loaders) {
            if (await loader.isDisplayed().catch(() => false)) {
                return false;
            }
        }

        return true;
    }, timeout, "Page loader did not disappear");
}

async function apiRequest(endpoint, options = {}) {
    return driver.executeAsyncScript(
        function (url, requestOptions, done) {
            fetch(url, requestOptions)
                .then(async (response) => {
                    const raw = await response.text();
                    let data = raw;

                    try {
                        data = JSON.parse(raw);
                    } catch {
                        // Keep the original response text.
                    }

                    done({
                        status: response.status,
                        ok: response.ok,
                        data,
                    });
                })
                .catch((error) => {
                    done({
                        status: 0,
                        ok: false,
                        error: error.message,
                    });
                });
        },
        endpoint,
        options
    );
}

function authHeaders() {
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
    };
}

async function getNotifications() {
    const response = await apiRequest(
        `${API_URL}/notifications`,
        {
            method: "GET",
            headers: authHeaders(),
        }
    );

    expect(
        response.status === 200,
        `Fetching notifications failed: HTTP ${response.status}. ` +
            JSON.stringify(response.data || response.error)
    );

    return response.data;
}

async function runCase(id, title, testFunction) {
    try {
        await testFunction();

        results.push({
            id,
            title,
            status: "PASS",
        });

        console.log(`PASS: ${id} - ${title}`);
    } catch (error) {
        results.push({
            id,
            title,
            status: "FAIL",
            error: error.message,
        });

        console.error(`FAIL: ${id} - ${title}`);
        console.error(error.message);
    }
}

// -----------------------------------------------------
// TEST SETUP: CREATE A TEMPORARY CITIZEN
// -----------------------------------------------------

async function setupTestData() {
    expect(
        Boolean(process.env.MONGO_URI),
        "MONGO_URI is missing from backend/.env"
    );

    await mongoose.connect(process.env.MONGO_URI);
    mongoConnected = true;

    // Use the supplied clinic ID if it exists.
    let clinic = null;

    if (mongoose.isValidObjectId(REQUESTED_CLINIC_ID)) {
        clinic = await Clinic.findById(REQUESTED_CLINIC_ID);
    }

    // Otherwise, use an existing active clinic.
    if (!clinic) {
        clinic = await Clinic.findOne({ status: "Active" });
    }

    // Some existing database records may not have a status field.
    if (!clinic) {
        clinic = await Clinic.findOne({});
    }

    expect(
        clinic,
        "No clinic was found in MongoDB. Create a clinic first."
    );

    clinicId = String(clinic._id);

    const hashedPassword = await bcrypt.hash(
        CITIZEN_PASSWORD,
        10
    );

    const testUser = await User.create({
        name: "Selenium Notification Test Citizen",
        email: CITIZEN_EMAIL,
        password: hashedPassword,
        role: "citizen",
        emailVerified: true,
    });

    testUserId = String(testUser._id);

    console.log("Temporary citizen created:", CITIZEN_EMAIL);
    console.log("Test clinic selected:", clinicId);
}

// -----------------------------------------------------
// TC-01: CITIZEN LOGIN THROUGH THE REAL LOGIN PAGE
// -----------------------------------------------------

async function testCitizenLogin() {
    await driver.get(BASE_URL);
    await waitForLoaderToDisappear(30000);

    const loginButton = await driver.wait(
        until.elementLocated(
            By.xpath("//nav//button[normalize-space()='Login']")
        ),
        TIMEOUT
    );

    await driver.wait(until.elementIsVisible(loginButton), TIMEOUT);
    await driver.wait(until.elementIsEnabled(loginButton), TIMEOUT);
    await loginButton.click();

    const emailField = await driver.wait(
        until.elementLocated(By.name("email")),
        TIMEOUT
    );

    await driver.wait(until.elementIsVisible(emailField), TIMEOUT);
    await emailField.sendKeys(CITIZEN_EMAIL);

    const passwordField = await driver.wait(
        until.elementLocated(By.name("password")),
        TIMEOUT
    );

    await passwordField.sendKeys(CITIZEN_PASSWORD);

    const submitButton = await driver.wait(
        until.elementLocated(By.css("button[type='submit']")),
        TIMEOUT
    );

    await driver.wait(until.elementIsEnabled(submitButton), TIMEOUT);
    await submitButton.click();

    // Wait for a token or a visible login error.
    await driver.wait(async () => {
        const currentToken = await getToken();

        if (currentToken) {
            return true;
        }

        const pageText = await getPageText();

        return (
            pageText.includes("Invalid email or password") ||
            pageText.includes("Please verify your email")
        );
    }, TIMEOUT, "Login did not return a result");

    token = await getToken();

    if (!token) {
        throw new Error(
            "Login failed. Page text: " + await getPageText()
        );
    }

    const storedUser = await driver.executeScript(
        "return localStorage.getItem('user');"
    );

    if (storedUser) {
        const user = JSON.parse(storedUser);
        citizenId = String(user.id || user._id || "");
    }

    // Fallback for applications that store only the JWT.
    if (!citizenId) {
        const payload = JSON.parse(
            Buffer.from(
                token.split(".")[1],
                "base64url"
            ).toString("utf8")
        );

        citizenId = String(
            payload._id || payload.id || payload.userId || ""
        );
    }

    expect(citizenId, "Citizen ID was not found after login.");

    expect(
        citizenId === testUserId,
        "Logged-in user does not match the temporary test citizen."
    );

    console.log("TC-01 login successful.");
}

// -----------------------------------------------------
// TC-02: BOOK APPOINTMENT AND CREATE REMINDER
// -----------------------------------------------------

async function testCreateAppointmentReminder() {
    // The reminder job checks appointments scheduled within 24 hours.
    const appointmentTime = new Date(
        Date.now() + 4 * 60 * 60 * 1000
    );

    const date = [
        appointmentTime.getFullYear(),
        String(appointmentTime.getMonth() + 1).padStart(2, "0"),
        String(appointmentTime.getDate()).padStart(2, "0"),
    ].join("-");

    const time = [
        String(appointmentTime.getHours()).padStart(2, "0"),
        String(appointmentTime.getMinutes()).padStart(2, "0"),
    ].join(":");

    const booking = await apiRequest(
        `${API_URL}/appointments`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                citizenId,
                clinicId,
                date,
                time,
            }),
        }
    );

    expect(
        booking.status === 201,
        `Appointment booking failed: HTTP ${booking.status}. ` +
            JSON.stringify(booking.data || booking.error)
    );

    appointmentId = String(booking.data.appointmentId || "");

    expect(
        appointmentId,
        "Booking response did not contain appointmentId."
    );

    const appointment = await Appointment.findById(appointmentId);

    expect(
        appointment,
        "Booked appointment was not found in MongoDB."
    );

    expect(
        String(appointment.citizenId) === citizenId,
        "Appointment belongs to a different citizen."
    );

    // Run the actual existing reminder job without waiting for cron.
    await createAppointmentReminders();

    const reminder = await Notification.findOne({
        userId: citizenId,
        referenceId: appointmentId,
        type: "appointment_reminder",
    });

    expect(
        reminder,
        "Reminder job did not create the expected notification."
    );

    reminderId = String(reminder._id);
    reminderMessage = reminder.message;

    expect(
        reminder.isRead === false,
        "A newly created reminder should be unread."
    );

    console.log("Appointment booked:", appointmentId);
    console.log("Reminder created:", reminderId);
}

// -----------------------------------------------------
// TC-03: PREVENT DUPLICATE REMINDERS
// -----------------------------------------------------

async function testNoDuplicateReminder() {
    const countBefore = await Notification.countDocuments({
        userId: citizenId,
        referenceId: appointmentId,
        type: "appointment_reminder",
    });

    await createAppointmentReminders();

    const countAfter = await Notification.countDocuments({
        userId: citizenId,
        referenceId: appointmentId,
        type: "appointment_reminder",
    });

    expect(
        countBefore === 1 && countAfter === 1,
        `Expected one reminder before and after rerunning the job. ` +
            `Before=${countBefore}, after=${countAfter}`
    );

    console.log("Duplicate reminder check passed.");
}

// -----------------------------------------------------
// TC-04: NOTIFICATION BELL AND UNREAD COUNT
// -----------------------------------------------------

async function testNotificationBell() {
    const bell = await driver.wait(
        until.elementLocated(
            By.css('button[aria-label="Notifications"]')
        ),
        TIMEOUT
    );

    await driver.wait(until.elementIsVisible(bell), TIMEOUT);
    await bell.click();

    await driver.wait(async () => {
        const text = await getPageText();
        return text.includes("Notifications");
    }, TIMEOUT, "Notification dropdown did not open");

    const data = await getNotifications();

    const reminder = data.notifications.find(
        (item) => String(item._id) === reminderId
    );

    expect(
        reminder,
        "The reminder was not returned by GET /api/notifications."
    );

    expect(
        reminder.isRead === false,
        "The reminder should still be unread."
    );

    expect(
        data.unreadCount >= 1,
        "Unread count should include the reminder."
    );

    unreadCountBefore = data.unreadCount;

    await driver.wait(async () => {
        const pageText = await getPageText();
        return pageText.includes(reminderMessage);
    }, TIMEOUT, "Reminder message is not visible in the UI");

    console.log(
        "Reminder visible. Unread count:",
        unreadCountBefore
    );
}

// -----------------------------------------------------
// TC-05: MARK REMINDER AS READ
// -----------------------------------------------------

function xpathLiteral(value) {
    if (!value.includes("'")) {
        return `'${value}'`;
    }

    if (!value.includes('"')) {
        return `"${value}"`;
    }

    return "concat('" + value.split("'").join("', \"'\", '") + "')";
}

async function testMarkReminderAsRead() {
    const reminderButton = await driver.wait(
        until.elementLocated(
            By.xpath(
                `//button[contains(., ${xpathLiteral(reminderMessage)})]`
            )
        ),
        TIMEOUT
    );

    await reminderButton.click();

    // Poll the API-backed database state until it is read.
    await driver.wait(async () => {
        const reminder = await Notification.findById(reminderId);
        return Boolean(reminder && reminder.isRead === true);
    }, TIMEOUT, "Backend did not mark the reminder as read");

    const updated = await getNotifications();

    const reminder = updated.notifications.find(
        (item) => String(item._id) === reminderId
    );

    expect(
        reminder && reminder.isRead === true,
        "Read status was not persisted by the backend."
    );

    expect(
        updated.unreadCount === unreadCountBefore - 1,
        `Unread count mismatch. Expected ${unreadCountBefore - 1}, ` +
            `received ${updated.unreadCount}.`
    );

    console.log("Reminder marked as read.");
}

// -----------------------------------------------------
// TC-06: READ STATUS PERSISTS AFTER REFRESH
// -----------------------------------------------------

async function testReadStatusPersists() {
    await driver.navigate().refresh();
    await waitForLoaderToDisappear(30000);

    const bell = await driver.wait(
        until.elementLocated(
            By.css('button[aria-label="Notifications"]')
        ),
        TIMEOUT
    );

    await driver.wait(until.elementIsVisible(bell), TIMEOUT);
    await bell.click();

    await driver.wait(async () => {
        const text = await getPageText();
        return text.includes("Notifications");
    }, TIMEOUT, "Notification dropdown did not reopen");

    const data = await getNotifications();

    const reminder = data.notifications.find(
        (item) => String(item._id) === reminderId
    );

    expect(
        reminder && reminder.isRead === true,
        "Reminder did not remain read after page refresh."
    );

    expect(
        data.unreadCount === unreadCountBefore - 1,
        "Unread count changed unexpectedly after refresh."
    );

    console.log("Read status persisted after refresh.");
}

// -----------------------------------------------------
// CLEANUP: REMOVE ONLY THIS TEST'S DATA
// -----------------------------------------------------

async function cleanupTestData() {
    if (!mongoConnected || process.env.KEEP_TEST_DATA === "1") {
        if (process.env.KEEP_TEST_DATA === "1") {
            console.log("KEEP_TEST_DATA=1; test records were preserved.");
        }
        return;
    }

    try {
        if (appointmentId) {
            await Notification.deleteMany({
                userId: testUserId,
                referenceId: appointmentId,
            });

            await Appointment.deleteOne({
                _id: appointmentId,
                citizenId: testUserId,
            });
        }

        if (testUserId) {
            // Remove any other notifications belonging to this temporary user.
            await Notification.deleteMany({
                userId: testUserId,
            });

            await User.deleteOne({
                _id: testUserId,
                email: CITIZEN_EMAIL,
            });
        }

        console.log("Temporary test data cleaned up.");
    } catch (error) {
        console.error("Test data cleanup failed:", error.message);
    }
}

// -----------------------------------------------------
// MAIN TEST RUNNER
// -----------------------------------------------------

async function main() {
    const options = new chrome.Options().addArguments(
        "--window-size=1440,1000"
    );

    if (process.env.HEADLESS === "1") {
        options.addArguments("--headless=new");
    }

    try {
        await setupTestData();

        driver = await new Builder()
            .forBrowser("chrome")
            .setChromeOptions(options)
            .build();

        await runCase(
            "TC-01",
            "Citizen login",
            testCitizenLogin
        );

        if (token && citizenId) {
            await runCase(
                "TC-02",
                "Book appointment and create reminder",
                testCreateAppointmentReminder
            );
        }

        if (reminderId) {
            await runCase(
                "TC-03",
                "Prevent duplicate reminders",
                testNoDuplicateReminder
            );

            await runCase(
                "TC-04",
                "Notification bell and unread count",
                testNotificationBell
            );

            await runCase(
                "TC-05",
                "Mark reminder as read",
                testMarkReminderAsRead
            );

            await runCase(
                "TC-06",
                "Read status persists after refresh",
                testReadStatusPersists
            );
        }
    } finally {
        if (driver && process.env.KEEP_OPEN !== "1") {
            await driver.quit().catch(() => {});
        }

        await cleanupTestData();

        if (mongoConnected) {
            await mongoose.disconnect().catch(() => {});
            mongoConnected = false;
        }
    }

    console.log("\n========== US-15 SELENIUM RESULTS ==========");

    for (const result of results) {
        console.log(
            `${result.status}: ${result.id} - ${result.title}`
        );

        if (result.error) {
            console.log("  Reason:", result.error);
        }
    }

    const passed = results.filter(
        (result) => result.status === "PASS"
    ).length;

    const failed = results.filter(
        (result) => result.status === "FAIL"
    ).length;

    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    if (failed > 0 || results.length !== 6) {
        process.exitCode = 1;
    }
}

main().catch(async (error) => {
    console.error("Selenium test could not run:", error);

    if (driver && process.env.KEEP_OPEN !== "1") {
        await driver.quit().catch(() => {});
    }

    await cleanupTestData();

    if (mongoConnected) {
        await mongoose.disconnect().catch(() => {});
    }

    process.exitCode = 1;
});
