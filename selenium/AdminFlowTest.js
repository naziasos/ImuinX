const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:5000/api";

const ADMIN_EMAIL = "imuinxproject@gmail.com";
const ADMIN_PASSWORD = "admin123";

const CLINIC_ADMIN_EMAIL = "23201030@uap-bd.edu";
const CLINIC_ADMIN_PASSWORD = "nurjahan@123";

const TIMEOUT = 10000;

const sleep = (ms) =>
  new Promise((r) => setTimeout(r, ms));


// ======================================================
// UNIQUE TEST DATA
// ======================================================

const runId = new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(4, 14);

let counter = 0;

const newClinicName = () =>
  `Selenium Test Clinic ${runId}-${++counter}`;

const newPhone = () =>
  `017${Date.now().toString().slice(-8)}`;

const newEmail = () =>
  `selenium.clinicadmin.${Date.now()}@test.com`;


// ======================================================
// EXPECT
// ======================================================

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}


// ======================================================
// POLL / WAIT
// ======================================================

async function poll(
  fn,
  timeout = TIMEOUT,
  what = "condition"
) {
  const end = Date.now() + timeout;
  let lastError;

  while (Date.now() < end) {
    try {
      const result = await fn();

      if (result) {
        return result;
      }
    } catch (e) {
      lastError = e;
    }

    await sleep(200);
  }

  throw new Error(
    `Timed out waiting for ${what}${
      lastError
        ? ` (${lastError.message})`
        : ""
    }`
  );
}


// ======================================================
// XPATH LOCATORS
// ======================================================

// Navbar login
const NAV_LOGIN =
  "//nav//button[normalize-space()='Login']";

// Admin dashboard
const ADMIN_DASHBOARD =
  "//h1[contains(normalize-space(),'Admin Dashboard')]";

// Clinic management
const CLINIC_MENU =
  "//button[contains(normalize-space(),'Clinic')]";

const CREATE_CLINIC_BUTTON =
  "//button[contains(normalize-space(),'Create Clinic') or contains(normalize-space(),'Add Clinic')]";

const CLINIC_NAME =
  "input[name='name']";

const CLINIC_ADDRESS =
  "input[name='address']";

const CLINIC_PHONE =
  "input[name='phone']";

// Clinic Admin assignment
const CLINIC_ADMIN_SELECT =
  "select[name='clinicAdmin']";

const ASSIGN_ADMIN_BUTTON =
  "//button[contains(normalize-space(),'Assign') and contains(normalize-space(),'Admin')]";


// Clinic Admin dashboard
const CLINIC_ADMIN_DASHBOARD =
  "//h1[normalize-space()='Clinic Admin Dashboard']";

const CLINIC_NAME_DISPLAY =
  "//*[contains(@class,'clinic-name') or @data-testid='clinic-name']";


// Success / Error messages
const SUCCESS =
  "//*[contains(@class,'bg-emerald-50') or contains(@class,'success')]";

const ERROR =
  "//*[contains(@class,'bg-red-50') or contains(@class,'error')]";


// ======================================================
// LOGIN
// ======================================================

async function login(
  driver,
  email,
  password
) {
  await driver.get(BASE_URL);

  const loginBtn = await driver.wait(
    until.elementLocated(
      By.xpath(NAV_LOGIN)
    ),
    20000
  );

  await loginBtn.click();

  const emailField =
    await driver.wait(
      until.elementLocated(
        By.name("email")
      ),
      TIMEOUT
    );

  await emailField.sendKeys(email);

  await driver
    .findElement(
      By.name("password")
    )
    .sendKeys(password);

  await driver
    .findElement(
      By.css("button[type='submit']")
    )
    .click();
}


// ======================================================
// ADMIN LOGIN
// ======================================================

async function loginAsAdmin(driver) {
  console.log(
    "Logging in as system admin..."
  );

  await login(
    driver,
    ADMIN_EMAIL,
    ADMIN_PASSWORD
  );

  await driver.wait(
    until.elementLocated(
      By.xpath(ADMIN_DASHBOARD)
    ),
    15000
  );

  console.log(
    "Admin login successful."
  );
}


// ======================================================
// OPEN CLINIC MANAGEMENT
// ======================================================

async function openClinicManagement(
  driver
) {
  const clinicMenu =
    await driver.wait(
      until.elementLocated(
        By.xpath(CLINIC_MENU)
      ),
      TIMEOUT
    );

  await clinicMenu.click();

  await driver.wait(
    until.elementLocated(
      By.xpath(CREATE_CLINIC_BUTTON)
    ),
    TIMEOUT
  );
}


// ======================================================
// CREATE CLINIC
// ======================================================

async function createClinic(
  driver,
  clinicName,
  address,
  phone
) {
  const createBtn =
    await driver.wait(
      until.elementLocated(
        By.xpath(CREATE_CLINIC_BUTTON)
      ),
      TIMEOUT
    );

  await createBtn.click();

  await driver.wait(
    until.elementLocated(
      By.name("name")
    ),
    TIMEOUT
  );

  await driver
    .findElement(
      By.name("name")
    )
    .sendKeys(clinicName);

  await driver
    .findElement(
      By.name("address")
    )
    .sendKeys(address);

  await driver
    .findElement(
      By.name("phone")
    )
    .sendKeys(phone);

  await driver
    .findElement(
      By.css(
        "button[type='submit']"
      )
    )
    .click();
}


// ======================================================
// CHECK CLINIC CREATED
// ======================================================

async function clinicExists(
  driver,
  clinicName
) {
  return (
    await driver.findElements(
      By.xpath(
        `//*[normalize-space()='${clinicName}']`
      )
    )
  ).length > 0;
}


// ======================================================
// ASSIGN CLINIC ADMIN
// ======================================================

async function assignClinicAdmin(
  driver,
  clinicName,
  adminEmail
) {
  console.log(
    `Assigning ${adminEmail} as admin of ${clinicName}...`
  );

  // Select clinic
  const clinicOption =
    await driver.wait(
      until.elementLocated(
        By.xpath(
          `//tr[td[contains(normalize-space(),'${clinicName}')]]`
        )
      ),
      TIMEOUT
    );

  // Find assign button inside clinic row
  const assignBtn =
    await clinicOption.findElement(
      By.xpath(
        ".//button[contains(normalize-space(),'Assign') or contains(normalize-space(),'Admin')]"
      )
    );

  await assignBtn.click();

  // Wait for admin selector
  const adminSelect =
    await driver.wait(
      until.elementLocated(
        By.css(CLINIC_ADMIN_SELECT)
      ),
      TIMEOUT
    );

  await adminSelect
    .findElement(
      By.css(
        `option[value='${adminEmail}']`
      )
    )
    .click();

  await driver
    .findElement(
      By.xpath(ASSIGN_ADMIN_BUTTON)
    )
    .click();
}


// ======================================================
// SUCCESS MESSAGE
// ======================================================

async function successMessage(
  driver
) {
  return poll(
    async () => {
      const elements =
        await driver.findElements(
          By.xpath(SUCCESS)
        );

      if (!elements.length) {
        return null;
      }

      const text =
        await elements[0].getText();

      return text.trim()
        ? text.trim()
        : null;
    },
    TIMEOUT,
    "success message"
  );
}


// ======================================================
// ERROR MESSAGE
// ======================================================

async function errorMessage(
  driver
) {
  return poll(
    async () => {
      const elements =
        await driver.findElements(
          By.xpath(ERROR)
        );

      if (!elements.length) {
        return null;
      }

      const text =
        await elements[0].getText();

      return text.trim()
        ? text.trim()
        : null;
    },
    TIMEOUT,
    "error message"
  );
}


// ======================================================
// LOGOUT
// ======================================================

async function logout(driver) {
  const logoutButtons =
    await driver.findElements(
      By.xpath(
        "//button[normalize-space()='Logout']"
      )
    );

  if (logoutButtons.length) {
    await logoutButtons[0].click();

    await sleep(1000);
  }
}


// ======================================================
// CLINIC ADMIN LOGIN
// ======================================================

async function loginAsClinicAdmin(
  driver,
  email,
  password
) {
  console.log(
    "Logging in as clinic admin..."
  );

  await login(
    driver,
    email,
    password
  );

  await driver.wait(
    until.elementLocated(
      By.xpath(
        CLINIC_ADMIN_DASHBOARD
      )
    ),
    15000
  );

  console.log(
    "Clinic admin login successful."
  );
}


// ======================================================
// CHECK CLINIC ADMIN CAN SEE OWN CLINIC
// ======================================================

async function verifyOwnClinic(
  driver,
  clinicName
) {
  console.log(
    `Checking clinic: ${clinicName}`
  );

  await driver.wait(
    until.elementLocated(
      By.xpath(
        `//*[contains(normalize-space(),'${clinicName}')]`
      )
    ),
    TIMEOUT
  );

  const clinicElements =
    await driver.findElements(
      By.xpath(
        `//*[contains(normalize-space(),'${clinicName}')]`
      )
    );

  expect(
    clinicElements.length > 0,
    `Clinic admin cannot see clinic '${clinicName}'`
  );

  console.log(
    "Clinic admin can see their assigned clinic."
  );
}


// ======================================================
// TEST CASES
// ======================================================

const cases = [];

const tc = (
  id,
  title,
  fn,
  defect
) =>
  cases.push({
    id,
    title,
    fn,
    defect,
  });


// ======================================================
// TC-01
// ADMIN LOGIN
// ======================================================

tc(
  "TC-01",
  "Admin can log in and open clinic management",
  async (driver) => {
    await loginAsAdmin(driver);

    await openClinicManagement(
      driver
    );

    expect(
      (
        await driver.findElements(
          By.xpath(
            CREATE_CLINIC_BUTTON
          )
        )
      ).length > 0,
      "Create Clinic button is not visible"
    );
  }
);


// ======================================================
// TC-02
// CREATE CLINIC
// ======================================================

let TEST_CLINIC_NAME = "";
let TEST_CLINIC_PHONE = "";

tc(
  "TC-02",
  "Admin can create a clinic",
  async (driver) => {
    TEST_CLINIC_NAME =
      newClinicName();

    TEST_CLINIC_PHONE =
      newPhone();

    await createClinic(
      driver,
      TEST_CLINIC_NAME,
      "Dhaka, Bangladesh",
      TEST_CLINIC_PHONE
    );

    const message =
      await successMessage(
        driver
      );

    console.log(
      `Success message: ${message}`
    );

    expect(
      message
        .toLowerCase()
        .includes("success"),
      "Clinic creation success message not found"
    );

    expect(
      await clinicExists(
        driver,
        TEST_CLINIC_NAME
      ),
      `Created clinic '${TEST_CLINIC_NAME}' not found`
    );
  }
);


// ======================================================
// TC-03
// ASSIGN CLINIC ADMIN
// ======================================================

tc(
  "TC-03",
  "Admin can assign clinic admin",
  async (driver) => {
    expect(
      TEST_CLINIC_NAME !== "",
      "Clinic name is missing"
    );

    expect(
      CLINIC_ADMIN_EMAIL !== "",
      "Clinic admin email is empty"
    );

    await assignClinicAdmin(
      driver,
      TEST_CLINIC_NAME,
      CLINIC_ADMIN_EMAIL
    );

    const message =
      await successMessage(
        driver
      );

    console.log(
      `Assignment message: ${message}`
    );

    expect(
      message
        .toLowerCase()
        .includes("success"),
      "Clinic admin assignment was not successful"
    );
  }
);


// ======================================================
// TC-04
// CLINIC ADMIN LOGIN
// ======================================================

tc(
  "TC-04",
  "Assigned clinic admin can log in",
  async (driver) => {
    await logout(driver);

    await loginAsClinicAdmin(
      driver,
      CLINIC_ADMIN_EMAIL,
      CLINIC_ADMIN_PASSWORD
    );

    expect(
      (
        await driver.findElements(
          By.xpath(
            CLINIC_ADMIN_DASHBOARD
          )
        )
      ).length > 0,
      "Clinic Admin Dashboard is not visible"
    );
  }
);


// ======================================================
// TC-05
// CLINIC ADMIN CAN SEE OWN CLINIC
// ======================================================

tc(
  "TC-05",
  "Clinic admin can see their assigned clinic",
  async (driver) => {
    await verifyOwnClinic(
      driver,
      TEST_CLINIC_NAME
    );
  }
);


// ======================================================
// TC-06
// COMPLETE END-TO-END FLOW
// ======================================================

tc(
  "TC-06",
  "Full flow: create clinic -> assign admin -> clinic admin login -> see own clinic",
  async (driver) => {
    const problems = [];

    // --------------------------------------------------
    // STEP 1: ADMIN LOGIN
    // --------------------------------------------------

    await logout(driver);

    await loginAsAdmin(driver);

    if (
      (
        await driver.findElements(
          By.xpath(
            ADMIN_DASHBOARD
          )
        )
      ).length === 0
    ) {
      problems.push(
        "Step 1: Admin dashboard not visible"
      );
    }


    // --------------------------------------------------
    // STEP 2: OPEN CLINIC MANAGEMENT
    // --------------------------------------------------

    await openClinicManagement(
      driver
    );


    // --------------------------------------------------
    // STEP 3: CREATE CLINIC
    // --------------------------------------------------

    TEST_CLINIC_NAME =
      newClinicName();

    TEST_CLINIC_PHONE =
      newPhone();

    await createClinic(
      driver,
      TEST_CLINIC_NAME,
      "Dhaka, Bangladesh",
      TEST_CLINIC_PHONE
    );

    const createMessage =
      await successMessage(
        driver
      );

    if (
      !createMessage
        .toLowerCase()
        .includes("success")
    ) {
      problems.push(
        "Step 3: Clinic was not created successfully"
      );
    }


    // --------------------------------------------------
    // STEP 4: VERIFY CLINIC EXISTS
    // --------------------------------------------------

    if (
      !(await clinicExists(
        driver,
        TEST_CLINIC_NAME
      ))
    ) {
      problems.push(
        `Step 4: Created clinic '${TEST_CLINIC_NAME}' not found`
      );
    }


    // --------------------------------------------------
    // STEP 5: ASSIGN CLINIC ADMIN
    // --------------------------------------------------

    await assignClinicAdmin(
      driver,
      TEST_CLINIC_NAME,
      CLINIC_ADMIN_EMAIL
    );

    const assignMessage =
      await successMessage(
        driver
      );

    if (
      !assignMessage
        .toLowerCase()
        .includes("success")
    ) {
      problems.push(
        "Step 5: Clinic admin assignment failed"
      );
    }


    // --------------------------------------------------
    // STEP 6: LOGOUT ADMIN
    // --------------------------------------------------

    await logout(driver);


    // --------------------------------------------------
    // STEP 7: LOGIN AS CLINIC ADMIN
    // --------------------------------------------------

    await loginAsClinicAdmin(
      driver,
      CLINIC_ADMIN_EMAIL,
      CLINIC_ADMIN_PASSWORD
    );

    if (
      (
        await driver.findElements(
          By.xpath(
            CLINIC_ADMIN_DASHBOARD
          )
        )
      ).length === 0
    ) {
      problems.push(
        "Step 7: Clinic Admin Dashboard not visible"
      );
    }


    // --------------------------------------------------
    // STEP 8: VERIFY OWN CLINIC
    // --------------------------------------------------

    try {
      await verifyOwnClinic(
        driver,
        TEST_CLINIC_NAME
      );
    } catch (error) {
      problems.push(
        `Step 8: ${error.message}`
      );
    }


    // --------------------------------------------------
    // FINAL CHECK
    // --------------------------------------------------

    expect(
      problems.length === 0,
      `Full-flow deviations:\n- ${problems.join(
        "\n- "
      )}`
    );
  }
);


// ======================================================
// MAIN TEST RUNNER
// ======================================================

async function adminClinicFlowTest() {
  const options =
    new chrome.Options()
      .addArguments(
        "--window-size=1440,1000"
      );

  if (
    process.env.HEADLESS === "1"
  ) {
    options.addArguments(
      "--headless=new"
    );
  }

  // Open Chrome
  const driver =
    await new Builder()
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
      "   ADMIN CLINIC SELENIUM FUNCTIONAL TEST"
    );

    console.log(
      "========================================"
    );

    console.log("");

    console.log(
      "Opening application..."
    );


    // --------------------------------------------------
    // RUN TEST CASES
    // --------------------------------------------------

    for (const c of cases) {
      try {
        await c.fn(driver);

        results.push({
          id: c.id,
          title: c.title,
          status: "PASS",
        });

        console.log(
          `PASSED  ${c.id} - ${c.title}`
        );
      } catch (error) {
        results.push({
          id: c.id,
          title: c.title,
          status: "FAIL",
          note: `${
            c.defect
              ? `[${c.defect}] `
              : ""
          }${error.message}`,
        });

        console.log(
          `FAILED  ${c.id} - ${c.title}`
        );

        console.log(
          `        ${error.message}`
        );
      }
    }


    // --------------------------------------------------
    // FINAL RESULT
    // --------------------------------------------------

    const passed =
      results.filter(
        (r) =>
          r.status === "PASS"
      ).length;

    const failed =
      results.filter(
        (r) =>
          r.status === "FAIL"
      ).length;

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "             TEST RESULT"
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

    if (failed) {
      process.exitCode = 1;
    }

  } catch (error) {
    console.log("");

    console.log(
      "Admin clinic test could not run!"
    );

    console.log(
      error.message || error
    );

    process.exitCode = 1;

  } finally {

    // Keep browser open only if KEEP_OPEN=1
    if (
      process.env.KEEP_OPEN !== "1"
    ) {
      await driver.quit();
    }
  }
}


// ======================================================
// START TEST
// ======================================================

adminClinicFlowTest();