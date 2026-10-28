const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:5000/api";

const TIMEOUT = 10000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TEST_PASSWORD = "Nurjahan@123";
const WEAK_PASSWORD = "123";

const runId = new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(4, 14);

let counter = 0;

const newEmail = (tag) =>
  `selenium.${runId}.${tag}.${++counter}@test.com`;

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function poll(fn, timeout = TIMEOUT, what = "condition") {
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
      lastError ? ` (${lastError.message})` : ""
    }`
  );
}


/* =========================================================
   NAVIGATION SELECTORS
========================================================= */

const NAV_REGISTER =
  "//nav//button[normalize-space()='Register']";

const NAV_LOGIN =
  "//nav//button[normalize-space()='Login']";

const NAV_VERIFY =
  "//nav//button[normalize-space()='Verify Email']";

const NAV_CREATE_ADMIN =
  "//nav//button[normalize-space()='Create Admin']";


/* =========================================================
   COMMON FORM SELECTORS
========================================================= */

const EMAIL_FIELD =
  "input[name='email']";

const PASSWORD_FIELD =
  "input[name='password']";

const NAME_FIELD =
  "input[name='name']";

const CONFIRM_PASSWORD_FIELD =
  "input[name='confirmPassword']";


/* =========================================================
   HELPER FUNCTIONS
========================================================= */

async function clickIfExists(driver, xpath) {
  const elements = await driver.findElements(
    By.xpath(xpath)
  );

  if (elements.length > 0) {
    await elements[0].click();
    return true;
  }

  return false;
}


async function getVisibleText(driver) {
  const body = await driver.findElement(By.css("body"));

  return (await body.getText()).trim();
}


async function findButtonByText(driver, texts) {
  for (const text of texts) {
    const buttons = await driver.findElements(
      By.xpath(
        `//button[normalize-space()='${text}']`
      )
    );

    if (buttons.length > 0) {
      return buttons[0];
    }
  }

  throw new Error(
    `Could not find button: ${texts.join(" / ")}`
  );
}


async function fillField(driver, name, value) {
  const field = await driver.wait(
    until.elementLocated(By.name(name)),
    TIMEOUT
  );

  await field.clear();
  await field.sendKeys(value);
}


async function getFieldValue(driver, name) {
  return await driver
    .findElement(By.name(name))
    .getAttribute("value");
}


async function pageContains(driver, text) {
  const bodyText = await getVisibleText(driver);

  return bodyText
    .toLowerCase()
    .includes(text.toLowerCase());
}


async function waitForText(driver, text) {
  await poll(
    async () => pageContains(driver, text),
    TIMEOUT,
    `text '${text}'`
  );
}


/* =========================================================
   REGISTER
========================================================= */

async function openRegister(driver) {
  await driver.get(BASE_URL);

  const registerBtn = await driver.wait(
    until.elementLocated(By.xpath(NAV_REGISTER)),
    15000
  );

  await registerBtn.click();

  await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );
}


async function registerUser(
  driver,
  {
    name,
    email,
    password,
    confirmPassword = password,
  }
) {
  await fillField(driver, "name", name);
  await fillField(driver, "email", email);
  await fillField(driver, "password", password);

  const confirmFields = await driver.findElements(
    By.name("confirmPassword")
  );

  if (confirmFields.length > 0) {
    await fillField(
      driver,
      "confirmPassword",
      confirmPassword
    );
  }

  const submit = await findButtonByText(driver, [
    "Register",
    "Create Account",
    "Sign Up",
    "Submit",
  ]);

  await submit.click();
}


async function registerSuccess(driver) {
  const text = await getVisibleText(driver);

  return (
    /registered successfully/i.test(text) ||
    /registration successful/i.test(text) ||
    /account created/i.test(text) ||
    /user created/i.test(text) ||
    /success/i.test(text)
  );
}


/* =========================================================
   LOGIN
========================================================= */

async function openLogin(driver) {
  const loginButtons =
    await driver.findElements(
      By.xpath(NAV_LOGIN)
    );

  if (loginButtons.length > 0) {
    await loginButtons[0].click();
  } else {
    await driver.get(BASE_URL);
    await driver.wait(
      until.elementLocated(
        By.xpath(NAV_LOGIN)
      ),
      TIMEOUT
    );

    await driver
      .findElement(By.xpath(NAV_LOGIN))
      .click();
  }

  await driver.wait(
    until.elementLocated(
      By.name("email")
    ),
    TIMEOUT
  );
}


async function loginUser(
  driver,
  email,
  password
) {
  await fillField(
    driver,
    "email",
    email
  );

  await fillField(
    driver,
    "password",
    password
  );

  const submit = await findButtonByText(driver, [
    "Login",
    "Sign In",
    "Submit",
  ]);

  await submit.click();
}


async function getToken(driver) {
  return await driver.executeScript(
    "return localStorage.getItem('token');"
  );
}


async function getRoleFromToken(driver) {
  const token = await getToken(driver);

  if (!token) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(
        token.split(".")[1],
        "base64"
      ).toString()
    );

    return payload.role || null;
  } catch (e) {
    return null;
  }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logoutUser(driver) {
  const logoutButtons =
    await driver.findElements(
      By.xpath(
        "//button[normalize-space()='Logout']"
      )
    );

  if (logoutButtons.length === 0) {
    throw new Error(
      "Logout button not found"
    );
  }

  await logoutButtons[0].click();
}


async function tokenCleared(driver) {
  const token = await getToken(driver);

  return !token;
}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

async function openForgotPassword(driver) {
  const buttons = await driver.findElements(
    By.xpath(
      "//*[self::button or self::a][contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'forgot')]"
    )
  );

  if (buttons.length === 0) {
    throw new Error(
      "Forgot Password button/link not found"
    );
  }

  await buttons[0].click();

  await driver.wait(
    until.elementLocated(
      By.name("email")
    ),
    TIMEOUT
  );
}


async function requestPasswordReset(
  driver,
  email
) {
  await fillField(
    driver,
    "email",
    email
  );

  const submit = await findButtonByText(driver, [
    "Send Reset Link",
    "Reset Password",
    "Send",
    "Submit",
  ]);

  await submit.click();
}


/* =========================================================
   RESET PASSWORD
========================================================= */

async function openResetPassword(
  driver,
  resetToken
) {
  await driver.get(
    `${BASE_URL}/reset-password/${resetToken}`
  );

  await driver.wait(
    until.elementLocated(
      By.name("password")
    ),
    TIMEOUT
  );
}


async function resetPassword(
  driver,
  newPassword
) {
  await fillField(
    driver,
    "password",
    newPassword
  );

  const confirmFields =
    await driver.findElements(
      By.name("confirmPassword")
    );

  if (confirmFields.length > 0) {
    await fillField(
      driver,
      "confirmPassword",
      newPassword
    );
  }

  const submit = await findButtonByText(driver, [
    "Reset Password",
    "Update Password",
    "Save Password",
    "Submit",
  ]);

  await submit.click();
}


/* =========================================================
   API CHECK
========================================================= */

async function apiRequest(
  driver,
  endpoint,
  options = {}
) {
  return await driver.executeAsyncScript(
    async (endpoint, options, done) => {
      try {
        const response = await fetch(
          endpoint,
          options
        );

        const text =
          await response.text();

        let data = null;

        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }

        done({
          status: response.status,
          ok: response.ok,
          data,
        });
      } catch (error) {
        done({
          status: 0,
          ok: false,
          error: error.message,
        });
      }
    },
    endpoint,
    options
  );
}


/* =========================================================
   TEST CASES
========================================================= */

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


/* ---------------------------------------------------------
   TC-01
--------------------------------------------------------- */

tc(
  "TC-01",
  "Registration page loads with required fields",
  async (d) => {
    await openRegister(d);

    expect(
      await d.findElements(
        By.name("name")
      ).then((x) => x.length > 0),
      "Name field missing"
    );

    expect(
      await d.findElements(
        By.name("email")
      ).then((x) => x.length > 0),
      "Email field missing"
    );

    expect(
      await d.findElements(
        By.name("password")
      ).then((x) => x.length > 0),
      "Password field missing"
    );

    const body =
      await getVisibleText(d);

    expect(
      /register|create account|sign up/i.test(
        body
      ),
      "Registration page heading/text missing"
    );
  }
);


/* ---------------------------------------------------------
   TC-02
--------------------------------------------------------- */

tc(
  "TC-02",
  "Valid user registration",
  async (d) => {
    await openRegister(d);

    const email =
      newEmail("REGISTER");

    await registerUser(d, {
      name: "Selenium Test User",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(1000);

    const body =
      await getVisibleText(d);

    expect(
      /success|registered|created|verify/i.test(
        body
      ),
      "Successful registration message not found"
    );

    console.log(
      `        Registered email: ${email}`
    );
  }
);


/* ---------------------------------------------------------
   TC-03
--------------------------------------------------------- */

tc(
  "TC-03",
  "Duplicate email registration rejected",
  async (d) => {
    await openRegister(d);

    const email =
      newEmail("DUPLICATE");

    await registerUser(d, {
      name: "Duplicate Test User",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(800);

    /*
      Try same email again
    */

    await openRegister(d);

    await registerUser(d, {
      name: "Duplicate Test User 2",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(800);

    const body =
      await getVisibleText(d);

    expect(
      /already exists|already registered|duplicate|email.*taken|user.*exists/i.test(
        body
      ),
      "Duplicate email error message not found"
    );
  }
);


/* ---------------------------------------------------------
   TC-04
--------------------------------------------------------- */

tc(
  "TC-04",
  "Weak password rejected",
  async (d) => {
    await openRegister(d);

    const email =
      newEmail("WEAK");

    await registerUser(d, {
      name: "Weak Password User",
      email,
      password: WEAK_PASSWORD,
      confirmPassword: WEAK_PASSWORD,
    });

    await sleep(500);

    const body =
      await getVisibleText(d);

    expect(
      /password.*weak|password.*8|strong password|uppercase|lowercase|special character|invalid password/i.test(
        body
      ),
      "Weak password validation message not found"
    );
  }
);


/* ---------------------------------------------------------
   TC-05
--------------------------------------------------------- */

tc(
  "TC-05",
  "Valid credentials allow login",
  async (d) => {
    const email =
      newEmail("LOGIN");

    /*
      Register test account first
    */

    await openRegister(d);

    await registerUser(d, {
      name: "Login Test User",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(1000);

    /*
      Open login
    */

    await openLogin(d);

    await loginUser(
      d,
      email,
      TEST_PASSWORD
    );

    await sleep(1000);

    const token =
      await getToken(d);

    expect(
      token,
      "Authentication token was not stored"
    );

    console.log(
      `        Login token received`
    );
  }
);


/* ---------------------------------------------------------
   TC-06
--------------------------------------------------------- */

tc(
  "TC-06",
  "Invalid credentials return authentication error",
  async (d) => {
    await openLogin(d);

    const email =
      newEmail("INVALID");

    await loginUser(
      d,
      email,
      "WrongPassword@999"
    );

    await sleep(700);

    const body =
      await getVisibleText(d);

    expect(
      /invalid|incorrect|wrong|unauthorized|failed|credentials/i.test(
        body
      ),
      "Invalid credential error message not found"
    );

    const token =
      await getToken(d);

    expect(
      !token,
      "Token must not be generated for invalid credentials"
    );
  }
);


/* ---------------------------------------------------------
   TC-07
--------------------------------------------------------- */

tc(
  "TC-07",
  "Login token contains user role",
  async (d) => {
    const email =
      newEmail("ROLE");

    await openRegister(d);

    await registerUser(d, {
      name: "Role Test User",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(800);

    await openLogin(d);

    await loginUser(
      d,
      email,
      TEST_PASSWORD
    );

    await sleep(800);

    const token =
      await getToken(d);

    expect(
      token,
      "Token not found"
    );

    const role =
      await getRoleFromToken(d);

    expect(
      role,
      "Role missing from authentication token"
    );

    console.log(
      `        User role: ${role}`
    );
  }
);


/* ---------------------------------------------------------
   TC-08
--------------------------------------------------------- */

tc(
  "TC-08",
  "Logout clears authentication token",
  async (d) => {
    const email =
      newEmail("LOGOUT");

    await openRegister(d);

    await registerUser(d, {
      name: "Logout Test User",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(800);

    await openLogin(d);

    await loginUser(
      d,
      email,
      TEST_PASSWORD
    );

    await sleep(800);

    expect(
      await getToken(d),
      "Token should exist before logout"
    );

    await logoutUser(d);

    await sleep(700);

    expect(
      await tokenCleared(d),
      "Token was not cleared after logout"
    );

    const body =
      await getVisibleText(d);

    expect(
      /login|sign in/i.test(body),
      "User was not redirected to login page"
    );
  }
);


/* ---------------------------------------------------------
   TC-09
--------------------------------------------------------- */

tc(
  "TC-09",
  "Forgot password request accepted for registered email",
  async (d) => {
    const email =
      newEmail("FORGOT");

    /*
      Register account
    */

    await openRegister(d);

    await registerUser(d, {
      name: "Forgot Password User",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(800);

    /*
      Open login
    */

    await openLogin(d);

    /*
      Open forgot password
    */

    await openForgotPassword(d);

    await requestPasswordReset(
      d,
      email
    );

    await sleep(800);

    const body =
      await getVisibleText(d);

    expect(
      /reset|email|sent|link/i.test(body),
      "Password reset confirmation not found"
    );

    console.log(
      `        Reset requested for: ${email}`
    );
  }
);


/* ---------------------------------------------------------
   TC-10
--------------------------------------------------------- */

tc(
  "TC-10",
  "Password reset link validation",
  async (d) => {
    /*
      This test assumes your backend provides
      a reset token during testing.

      Replace this value with the token generated
      by your backend/email test setup.
    */

    const resetToken =
      process.env.RESET_TOKEN;

    if (!resetToken) {
      throw new Error(
        "RESET_TOKEN environment variable not provided"
      );
    }

    await openResetPassword(
      d,
      resetToken
    );

    expect(
      await d.findElements(
        By.name("password")
      ).then((x) => x.length > 0),
      "Reset password field not found"
    );

    expect(
      await d.findElements(
        By.name("confirmPassword")
      ).then((x) => x.length > 0),
      "Confirm password field not found"
    );
  }
);


/* ---------------------------------------------------------
   TC-11
--------------------------------------------------------- */

tc(
  "TC-11",
  "Reset password allows login with new password",
  async (d) => {
    const email =
      newEmail("RESETLOGIN");

    const newPassword =
      "NewPassword@123";

    /*
      Register account
    */

    await openRegister(d);

    await registerUser(d, {
      name: "Reset Login User",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(800);

    /*
      At this point your actual reset-token
      retrieval mechanism is required.
    */

    const resetToken =
      process.env.RESET_TOKEN;

    if (!resetToken) {
      throw new Error(
        "RESET_TOKEN required for reset-password test"
      );
    }

    await openResetPassword(
      d,
      resetToken
    );

    await resetPassword(
      d,
      newPassword
    );

    await sleep(1000);

    /*
      Login with new password
    */

    await openLogin(d);

    await loginUser(
      d,
      email,
      newPassword
    );

    await sleep(800);

    expect(
      await getToken(d),
      "Login with new password failed"
    );
  }
);


/* ---------------------------------------------------------
   TC-12
--------------------------------------------------------- */

tc(
  "TC-12",
  "Complete authentication flow: register -> login -> logout",
  async (d) => {
    const email =
      newEmail("E2E");

    /*
      STEP 1
      Register
    */

    await openRegister(d);

    await registerUser(d, {
      name: "Complete Flow User",
      email,
      password: TEST_PASSWORD,
    });

    await sleep(800);

    /*
      STEP 2
      Login
    */

    await openLogin(d);

    await loginUser(
      d,
      email,
      TEST_PASSWORD
    );

    await sleep(800);

    const token =
      await getToken(d);

    expect(
      token,
      "STEP 2: Login token was not generated"
    );

    /*
      STEP 3
      Role
    */

    const role =
      await getRoleFromToken(d);

    expect(
      role,
      "STEP 3: User role missing from token"
    );

    /*
      STEP 4
      Logout
    */

    await logoutUser(d);

    await sleep(800);

    expect(
      await tokenCleared(d),
      "STEP 4: Token was not cleared"
    );

    const body =
      await getVisibleText(d);

    expect(
      /login|sign in/i.test(body),
      "STEP 4: User was not redirected to login"
    );

    console.log(
      `        E2E user: ${email}`
    );

    console.log(
      `        E2E role: ${role}`
    );
  }
);


/* =========================================================
   RUNNER
========================================================= */

async function authenticationFlowTest() {
  const options =
    new chrome.Options().addArguments(
      "--window-size=1440,1000"
    );

  if (process.env.HEADLESS === "1") {
    options.addArguments(
      "--headless=new"
    );
  }

  const driver =
    await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

  const results = [];

  try {
    console.log("");
    console.log(
      "=============================================="
    );
    console.log(
      "     AUTHENTICATION SELENIUM FUNCTIONAL TEST"
    );
    console.log(
      "=============================================="
    );
    console.log("");

    console.log(
      "Opening application..."
    );

    await driver.get(BASE_URL);

    await driver.wait(
      until.elementLocated(
        By.css("body")
      ),
      15000
    );

    console.log(
      "Application opened successfully."
    );

    console.log("");
    console.log(
      "Running authentication test cases..."
    );
    console.log("");

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
      "=============================================="
    );
    console.log(
      "                 TEST RESULT"
    );
    console.log(
      "=============================================="
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
      "=============================================="
    );

    console.log("");

    if (failed > 0) {
      console.log(
        "FAILED TEST CASE DETAILS:"
      );

      for (const result of results) {
        if (result.status === "FAIL") {
          console.log(
            `- ${result.id}: ${result.note}`
          );
        }
      }

      process.exitCode = 1;
    }
  } catch (error) {
    console.log("");
    console.log(
      "Authentication test could not run!"
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

authenticationFlowTest();