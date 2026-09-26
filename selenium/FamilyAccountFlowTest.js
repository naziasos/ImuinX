const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = "http://localhost:5173";

const CITIZEN_EMAIL = "23201032@uap-bd.edu";
const CITIZEN_PASSWORD = "tanha123";

const TIMEOUT = 10000;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ======================================================
// UNIQUE TEST DATA
// ======================================================

const runId = new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(4, 14);

const TEST_MEMBER_NAME = `Selenium Family Member ${runId}`;

// ======================================================
// EXPECT
// ======================================================

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ======================================================
// XPATH LOCATORS
// ======================================================

// Navbar login
const NAV_LOGIN =
  "//nav//button[normalize-space()='Login']";

// Citizen dashboard
const CITIZEN_DASHBOARD =
  "//h1[normalize-space()='Citizen Dashboard']";

// Family Account button
const FAMILY_ACCOUNT_BUTTON =
  "//button[contains(normalize-space(),'Family Account')]";

// Family Account page
const FAMILY_ACCOUNT_TITLE =
  "//h1[normalize-space()='Family Account']";

// Add Family Member
const ADD_FAMILY_MEMBER_BUTTON =
  "//button[contains(normalize-space(),'Add Family Member')]";

// Form fields
const MEMBER_NAME =
  "input[name='name']";

const MEMBER_DOB =
  "input[name='dateOfBirth']";

const MEMBER_GENDER =
  "select[name='gender']";

const MEMBER_RELATIONSHIP =
  "select[name='relationship']";

// Form submit
const SUBMIT_FAMILY_MEMBER =
  "//button[@type='submit' and normalize-space()='Add Family Member']";

// Member profile
const VIEW_PROFILE_BUTTON =
  "//button[normalize-space()='View Profile']";

const SELECTED_PROFILE =
  "//p[normalize-space()='SELECTED PROFILE']";

// Appointments
const APPOINTMENTS_HEADING =
  "//h3[normalize-space()='Appointments']";

// Vaccination records
const VACCINATION_RECORDS_HEADING =
  "//h3[normalize-space()='Vaccination Records']";

// Logout
const LOGOUT_BUTTON =
  "//button[normalize-space()='Logout']";

// ======================================================
// LOGIN
// ======================================================

async function login(driver, email, password) {

  await driver.get(BASE_URL);

  const loginButton = await driver.wait(
    until.elementLocated(By.xpath(NAV_LOGIN)),
    TIMEOUT
  );

  await loginButton.click();

  const emailField = await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );

  await emailField.sendKeys(email);

  const passwordField = await driver.findElement(
    By.name("password")
  );

  await passwordField.sendKeys(password);

  const submitButton = await driver.findElement(
    By.css("button[type='submit']")
  );

  await submitButton.click();
}

// ======================================================
// CITIZEN LOGIN
// ======================================================

async function loginAsCitizen(driver) {

  console.log("Logging in as citizen...");

  await login(
    driver,
    CITIZEN_EMAIL,
    CITIZEN_PASSWORD
  );

  await driver.wait(
    until.elementLocated(
      By.xpath(CITIZEN_DASHBOARD)
    ),
    15000
  );

  console.log("Citizen login successful.");
}

// ======================================================
// OPEN FAMILY ACCOUNT
// ======================================================

async function openFamilyAccount(driver) {

  const familyButton = await driver.wait(
    until.elementLocated(
      By.xpath(FAMILY_ACCOUNT_BUTTON)
    ),
    TIMEOUT
  );

  await familyButton.click();

  await driver.wait(
    until.elementLocated(
      By.xpath(FAMILY_ACCOUNT_TITLE)
    ),
    TIMEOUT
  );

  console.log("Family Account opened.");
}

// ======================================================
// ADD FAMILY MEMBER
// ======================================================

async function addFamilyMember(driver) {

  console.log(
    `Adding family member: ${TEST_MEMBER_NAME}`
  );

  const addButton = await driver.wait(
    until.elementLocated(
      By.xpath(ADD_FAMILY_MEMBER_BUTTON)
    ),
    TIMEOUT
  );

  await addButton.click();

  await driver.wait(
    until.elementLocated(
      By.name("name")
    ),
    TIMEOUT
  );

  await driver
    .findElement(By.name("name"))
    .sendKeys(TEST_MEMBER_NAME);

  await driver
    .findElement(By.name("dateOfBirth"))
    .sendKeys("2018-06-10");

  await driver
    .findElement(By.name("gender"))
    .sendKeys("Female");

  await driver
    .findElement(By.name("relationship"))
    .sendKeys("Child");

  await driver
    .findElement(
      By.xpath(SUBMIT_FAMILY_MEMBER)
    )
    .click();

  await sleep(1000);

  console.log("Family member added.");
}

// ======================================================
// VERIFY FAMILY MEMBER
// ======================================================

async function verifyFamilyMember(driver) {

  console.log(
    `Checking family member: ${TEST_MEMBER_NAME}`
  );

  await driver.wait(
    until.elementLocated(
      By.xpath(
        `//*[normalize-space()='${TEST_MEMBER_NAME}']`
      )
    ),
    TIMEOUT
  );

  const memberElements =
    await driver.findElements(
      By.xpath(
        `//*[normalize-space()='${TEST_MEMBER_NAME}']`
      )
    );

  expect(
    memberElements.length > 0,
    `Family member '${TEST_MEMBER_NAME}' was not found`
  );

  console.log(
    "Family member is visible."
  );
}

// ======================================================
// SWITCH / SELECT FAMILY PROFILE
// ======================================================

async function switchToFamilyProfile(driver) {

  console.log(
    "Opening family member profile..."
  );

  const viewProfileButton =
    await driver.wait(
      until.elementLocated(
        By.xpath(VIEW_PROFILE_BUTTON)
      ),
      TIMEOUT
    );

  await viewProfileButton.click();

  await driver.wait(
    until.elementLocated(
      By.xpath(SELECTED_PROFILE)
    ),
    TIMEOUT
  );

  console.log(
    "Family member profile opened."
  );
}

// ======================================================
// VERIFY SELECTED PROFILE
// ======================================================

async function verifySelectedProfile(driver) {

  console.log(
    "Checking selected family profile..."
  );

  const selectedName =
    await driver.wait(
      until.elementLocated(
        By.xpath(
          `//p[normalize-space()='SELECTED PROFILE']/following::h2[1][normalize-space()='${TEST_MEMBER_NAME}']`
        )
      ),
      TIMEOUT
    );

  expect(
    await selectedName.isDisplayed(),
    "Selected family member name is not displayed"
  );

  // Verify profile information
  const dob = await driver.findElements(
    By.xpath(
      "//p[normalize-space()='Date of Birth']/following-sibling::p"
    )
  );

  expect(
    dob.length > 0,
    "Date of Birth is not displayed"
  );

  const gender = await driver.findElements(
    By.xpath(
      "//p[normalize-space()='Gender']/following-sibling::p"
    )
  );

  expect(
    gender.length > 0,
    "Gender is not displayed"
  );

  const relationship = await driver.findElements(
    By.xpath(
      "//p[normalize-space()='Relationship']/following-sibling::p"
    )
  );

  expect(
    relationship.length > 0,
    "Relationship is not displayed"
  );

  console.log(
    "Selected family profile verified."
  );
}

// ======================================================
// VERIFY APPOINTMENT / VACCINATION SECTIONS
// ======================================================

async function verifyProfileSections(driver) {

  console.log(
    "Checking appointment and vaccination sections..."
  );

  const appointments =
    await driver.findElements(
      By.xpath(APPOINTMENTS_HEADING)
    );

  expect(
    appointments.length > 0,
    "Appointments section is not displayed"
  );

  const vaccinationRecords =
    await driver.findElements(
      By.xpath(VACCINATION_RECORDS_HEADING)
    );

  expect(
    vaccinationRecords.length > 0,
    "Vaccination Records section is not displayed"
  );

  console.log(
    "Profile appointment and vaccination sections are visible."
  );
}

// ======================================================
// LOGOUT
// ======================================================

async function logout(driver) {

  const logoutButtons =
    await driver.findElements(
      By.xpath(LOGOUT_BUTTON)
    );

  if (logoutButtons.length > 0) {

    await logoutButtons[0].click();

    await sleep(1000);

    console.log("Logged out.");
  }
}

// ======================================================
// TEST CASES
// ======================================================

const cases = [];

const tc = (id, title, fn) => {

  cases.push({
    id,
    title,
    fn
  });

};

// ======================================================
// TC-01
// CITIZEN LOGIN
// ======================================================

tc(
  "TC-01",
  "Citizen can log in",
  async (driver) => {

    await loginAsCitizen(driver);

  }
);

// ======================================================
// TC-02
// OPEN FAMILY ACCOUNT
// ======================================================

tc(
  "TC-02",
  "Citizen can open Family Account",
  async (driver) => {

    await openFamilyAccount(driver);

  }
);

// ======================================================
// TC-03
// ADD FAMILY MEMBER
// ======================================================

tc(
  "TC-03",
  "Citizen can add a family member",
  async (driver) => {

    await addFamilyMember(driver);

  }
);

// ======================================================
// TC-04
// VERIFY FAMILY MEMBER
// ======================================================

tc(
  "TC-04",
  "Added family member is displayed",
  async (driver) => {

    await verifyFamilyMember(driver);

  }
);

// ======================================================
// TC-05
// SWITCH PROFILE
// ======================================================

tc(
  "TC-05",
  "Citizen can switch to family member profile",
  async (driver) => {

    await switchToFamilyProfile(driver);

  }
);

// ======================================================
// TC-06
// VERIFY PROFILE
// ======================================================

tc(
  "TC-06",
  "Selected family profile information is displayed",
  async (driver) => {

    await verifySelectedProfile(driver);

  }
);

// ======================================================
// TC-07
// VERIFY APPOINTMENT / RECORD SECTIONS
// ======================================================

tc(
  "TC-07",
  "Selected profile contains appointment and vaccination sections",
  async (driver) => {

    await verifyProfileSections(driver);

  }
);

// ======================================================
// TC-08
// COMPLETE END-TO-END FLOW
// ======================================================

tc(
  "TC-08",
  "Full family account flow",
  async (driver) => {

    await logout(driver);

    await loginAsCitizen(driver);

    await openFamilyAccount(driver);

    await addFamilyMember(driver);

    await verifyFamilyMember(driver);

    await switchToFamilyProfile(driver);

    await verifySelectedProfile(driver);

    await verifyProfileSections(driver);

  }
);

// ======================================================
// MAIN TEST RUNNER
// ======================================================

async function familyAccountFlowTest() {

  const options = new chrome.Options()
    .addArguments(
      "--window-size=1440,1000"
    );

  if (process.env.HEADLESS === "1") {

    options.addArguments(
      "--headless=new"
    );

  }

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  const results = [];

  try {

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "   FAMILY ACCOUNT SELENIUM TEST"
    );
    console.log(
      "========================================"
    );
    console.log("");

    for (const testCase of cases) {

      try {

        await testCase.fn(driver);

        results.push({
          id: testCase.id,
          title: testCase.title,
          status: "PASS"
        });

        console.log(
          `PASSED  ${testCase.id} - ${testCase.title}`
        );

      } catch (error) {

        results.push({
          id: testCase.id,
          title: testCase.title,
          status: "FAIL",
          note: error.message
        });

        console.log(
          `FAILED  ${testCase.id} - ${testCase.title}`
        );

        console.log(
          `        ${error.message}`
        );

      }

    }

    // ==================================================
    // FINAL RESULT
    // ==================================================

    const passed =
      results.filter(
        (r) => r.status === "PASS"
      ).length;

    const failed =
      results.filter(
        (r) => r.status === "FAIL"
      ).length;

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "            TEST RESULT"
    );

    console.log(
      "========================================"
    );

    console.log(
      `Total : ${results.length}`
    );

    console.log(
      `Passed: ${passed}`
    );

    console.log(
      `Failed: ${failed}`
    );

    console.log(
      `Result: ${passed}/${results.length} passed`
    );

    console.log(
      "========================================"
    );

    console.log("");

    if (failed > 0) {
      process.exitCode = 1;
    }

  } catch (error) {

    console.log("");
    console.log(
      "Family account test could not run!"
    );

    console.log(
      error.message || error
    );

    process.exitCode = 1;

  } finally {

    if (process.env.KEEP_OPEN !== "1") {
      await driver.quit();
    }

  }
}

familyAccountFlowTest();