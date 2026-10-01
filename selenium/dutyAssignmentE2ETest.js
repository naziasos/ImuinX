const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL =
  process.env.BASE_URL || "http://localhost:5173";

const API_URL =
  process.env.API_URL || "http://localhost:5000/api";

const CLINIC_ADMIN_EMAIL =
  process.env.CLINIC_ADMIN_EMAIL || "23201030@uap-bd.edu";

const CLINIC_ADMIN_PASSWORD =
  process.env.CLINIC_ADMIN_PASSWORD || "nurjahan@123";

const WORKER_EMAIL = (
  process.env.WORKER_EMAIL || "23201046@uap-bd.edu"
).toLowerCase();

const WORKER_PASSWORD =
  process.env.WORKER_PASSWORD || "8s6l7e";

const TIMEOUT = 10000;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));


function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}


class Skip extends Error {}


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
      lastError ? ` (${lastError.message})` : ""
    }`
  );
}


/* =========================================================
   LOCATORS
========================================================= */

const NAV_LOGIN =
  "//nav//button[normalize-space()='Login']";

const CLINIC_ADMIN_DASHBOARD =
  "//h1[normalize-space()='Clinic Admin Dashboard']";

const WORKER_DASHBOARD =
  "//h1[contains(normalize-space(),'Worker Dashboard')]";

const DAILY_DUTIES_NAV =
  "//button[contains(normalize-space(),'Daily Duties')]";

const ASSIGN_DUTY_HEADING =
  "//h1[normalize-space()='Assign Daily Clinic Duty']";

const ASSIGN_BUTTON =
  "//button[contains(normalize-space(),'Assign Workers')]";

const BACK_BUTTON =
  "//button[contains(normalize-space(),'Back to Dashboard')]";

const SHOW_WORK_NAV =
  "//button[contains(@class,'clinic-nav-item') and contains(normalize-space(),'Show Work')]";

const MY_WORK_HEADING =
  "//h1[normalize-space()='My Work']";

const LOGOUT_BUTTON =
  "//button[contains(normalize-space(),'Logout')]";


const workerCard = (email) =>
  `//label[contains(@class,'assign-duty-worker') and .//p[normalize-space()='${email}']]`;


/* =========================================================
   TEST DATA
========================================================= */

const rand = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const pad = (n) =>
  String(n).padStart(2, "0");

const DUTY_DATE =
  `${rand(2100, 8999)}-${pad(rand(1, 12))}-${pad(rand(1, 28))}`;

const TYPE_1 = "Vaccination";

const TYPE_2 = "In-House Visit";


const ctx = {
  ready: false,
  workerId: null,
};


/* =========================================================
   API HELPERS
========================================================= */

async function apiLogin(email, password) {

  const res = await fetch(
    `${API_URL}/auth/login`,
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        email,
        password,
      }),
    }
  );

  const data =
    await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `API login failed for ${email}: ` +
      `${res.status} ${data.message || ""}`
    );
  }

  return data;
}


/* =========================================================
   BROWSER HELPERS
========================================================= */

async function resetSession(driver) {

  await driver.get(BASE_URL);

  await driver.executeScript(
    "localStorage.clear(); sessionStorage.clear();"
  );

  await driver.navigate().refresh();
}


async function loginViaUi(
  driver,
  email,
  password,
  dashboardXpath
) {

  await resetSession(driver);

  const loginBtn = await driver.wait(
    until.elementLocated(
      By.xpath(NAV_LOGIN)
    ),
    15000
  );

  await loginBtn.click();

  const emailField = await driver.wait(
    until.elementLocated(
      By.name("email")
    ),
    TIMEOUT
  );

  await emailField.sendKeys(email);

  await driver
    .findElement(By.name("password"))
    .sendKeys(password);

  await driver
    .findElement(
      By.css("button[type='submit']")
    )
    .click();

  await driver.wait(
    until.elementLocated(
      By.xpath(dashboardXpath)
    ),
    15000
  );
}


async function logoutViaUi(driver) {

  const buttons =
    await driver.findElements(
      By.xpath(LOGOUT_BUTTON)
    );

  if (buttons.length > 0) {

    await buttons[0].click();

  } else {

    await driver.executeScript(
      "localStorage.clear();"
    );

    await driver.navigate().refresh();
  }

  await driver.wait(
    until.elementLocated(
      By.xpath(NAV_LOGIN)
    ),
    TIMEOUT
  );
}


async function waitAlert(driver) {

  await driver.wait(
    until.alertIsPresent(),
    TIMEOUT,
    "an alert dialog"
  );

  const alert =
    await driver.switchTo().alert();

  const text =
    await alert.getText();

  await alert.accept();

  return text;
}


/* =========================================================
   REACT INPUT HELPER
========================================================= */

async function setReactValue(
  driver,
  element,
  value
) {

  await driver.executeScript(
    `
    const el = arguments[0];

    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : el instanceof HTMLSelectElement
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;

    Object
      .getOwnPropertyDescriptor(proto, 'value')
      .set
      .call(el, arguments[1]);

    el.dispatchEvent(
      new Event('input', {
        bubbles: true
      })
    );

    el.dispatchEvent(
      new Event('change', {
        bubbles: true
      })
    );
    `,
    element,
    value
  );
}


/* =========================================================
   DUTY HELPERS
========================================================= */

async function clickAssign(driver) {

  const btn =
    await driver.findElement(
      By.xpath(ASSIGN_BUTTON)
    );

  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    btn
  );

  await btn.click();
}


async function openDailyDuties(driver) {

  const nav = await driver.wait(
    until.elementLocated(
      By.xpath(DAILY_DUTIES_NAV)
    ),
    TIMEOUT
  );

  await nav.click();

  await driver.wait(
    until.elementLocated(
      By.xpath(ASSIGN_DUTY_HEADING)
    ),
    TIMEOUT
  );
}


async function fillDutyForm(
  driver,
  {
    date,
    type,
    workerEmail,
  }
) {

  if (date !== undefined) {

    const dateInput =
      await driver.findElement(
        By.id("duty-date")
      );

    await setReactValue(
      driver,
      dateInput,
      date
    );
  }


  if (type) {

    const select =
      await driver.findElement(
        By.id("duty-type")
      );

    await select
      .findElement(
        By.xpath(
          `.//option[normalize-space()='${type}']`
        )
      )
      .click();
  }


  if (workerEmail) {

    const card = await poll(
      async () => {

        const found =
          await driver.findElements(
            By.xpath(
              workerCard(workerEmail)
            )
          );

        return found.length
          ? found[0]
          : null;
      },

      TIMEOUT,

      `worker card for ${workerEmail}`
    );

    await driver.executeScript(
      "arguments[0].scrollIntoView({block:'center'});",
      card
    );

    await card.click();
  }
}


async function selectedCountText(driver) {

  return (
    await driver
      .findElement(
        By.css(
          ".assign-duty-selected-count"
        )
      )
      .getText()
  ).trim();
}


async function expectedDateLabel(
  driver,
  iso
) {

  return driver.executeScript(
    `
    return new Date(arguments[0])
      .toLocaleDateString(
        undefined,
        {
          timeZone: 'UTC'
        }
      );
    `,
    iso
  );
}


async function dutyRowTexts(driver) {

  const rows =
    await driver.findElements(
      By.css(".show-work-duty")
    );

  const texts = [];

  for (const row of rows) {
    texts.push(
      await row.getText()
    );
  }

  return texts;
}


/* =========================================================
   TEST CASES
========================================================= */

const cases = [];

const tc = (
  id,
  title,
  fn
) =>
  cases.push({
    id,
    title,
    fn,
  });


const needsReady = () => {

  if (!ctx.ready) {
    throw new Skip(
      "Skipped because SD-01 failed."
    );
  }
};


/* =========================================================
   SD-01
========================================================= */

tc(
  "SD-01",

  "Preconditions: admin and worker can log in; worker belongs to the admin's clinic",

  async () => {

    const admin =
      await apiLogin(
        CLINIC_ADMIN_EMAIL,
        CLINIC_ADMIN_PASSWORD
      );

    expect(
      admin.user.role === "clinicAdmin",

      `${CLINIC_ADMIN_EMAIL} is not a clinicAdmin ` +
      `(role: ${admin.user.role}).`
    );


    const worker =
      await apiLogin(
        WORKER_EMAIL,
        WORKER_PASSWORD
      );

    expect(
      worker.user.role === "worker",

      `${WORKER_EMAIL} is not a worker ` +
      `(role: ${worker.user.role}).`
    );


    const res =
      await fetch(
        `${API_URL}/clinics/my-clinic/workers`,
        {
          headers: {
            Authorization:
              `Bearer ${admin.token}`,
          },
        }
      );


    const data =
      await res.json();


    expect(
      res.ok,
      `Could not load clinic workers: ${data.message}`
    );


    const match =
      (data.workers || [])
        .find(
          (w) =>
            w.email === WORKER_EMAIL
        );


    expect(
      match,

      `Worker ${WORKER_EMAIL} is not in ` +
      `the clinic of ${CLINIC_ADMIN_EMAIL}.`
    );


    ctx.workerId = match._id;
    ctx.ready = true;
  }
);


/* =========================================================
   SD-02
========================================================= */

tc(
  "SD-02",

  "Clinic admin logs in and opens the Daily Duties page; clinic workers are listed",

  async (driver) => {

    needsReady();

    await loginViaUi(
      driver,
      CLINIC_ADMIN_EMAIL,
      CLINIC_ADMIN_PASSWORD,
      CLINIC_ADMIN_DASHBOARD
    );

    await openDailyDuties(driver);

    await poll(
      async () =>
        (
          await driver.findElements(
            By.xpath(
              workerCard(WORKER_EMAIL)
            )
          )
        ).length > 0,

      TIMEOUT,

      "target worker in the list"
    );
  }
);


/* =========================================================
   SD-03
========================================================= */

tc(
  "SD-03",

  "Form validation: date, then duty type, then worker are required",

  async (driver) => {

    needsReady();


    await clickAssign(driver);

    expect(
      (await waitAlert(driver)) ===
        "Please select a date.",

      "Expected 'Please select a date.' alert."
    );


    await fillDutyForm(
      driver,
      {
        date: DUTY_DATE,
      }
    );


    await clickAssign(driver);

    expect(
      (await waitAlert(driver)) ===
        "Please select a duty type.",

      "Expected 'Please select a duty type.' alert."
    );


    await fillDutyForm(
      driver,
      {
        type: TYPE_1,
      }
    );


    await clickAssign(driver);

    expect(

      (await waitAlert(driver)) ===
        "Please select at least one worker.",

      "Expected 'Please select at least one worker.' alert."
    );
  }
);


/* =========================================================
   SD-04
========================================================= */

tc(
  "SD-04",

  "Selecting and deselecting a worker updates the Selected counter and summary",

  async (driver) => {

    needsReady();


    expect(
      (await selectedCountText(driver))
        .startsWith("0"),

      "Counter should start at 0."
    );


    await fillDutyForm(
      driver,
      {
        workerEmail: WORKER_EMAIL,
      }
    );


    expect(
      (await selectedCountText(driver))
        .startsWith("1"),

      "Counter should show 1 after selecting a worker."
    );


    const summary =
      await driver
        .findElement(
          By.css(".assign-duty-summary")
        )
        .getText();


    expect(
      summary.includes(DUTY_DATE),

      "Summary does not show the chosen date."
    );


    expect(
      summary.includes(TYPE_1),

      "Summary does not show the chosen duty type."
    );


    await driver
      .findElement(
        By.xpath(
          workerCard(WORKER_EMAIL)
        )
      )
      .click();


    expect(
      (await selectedCountText(driver))
        .startsWith("0"),

      "Counter should return to 0 after deselecting."
    );
  }
);


/* =========================================================
   SD-05
========================================================= */

tc(
  "SD-05",

  "Admin assigns Vaccination to the worker -> success alert and form resets",

  async (driver) => {

    needsReady();


    await fillDutyForm(
      driver,
      {
        workerEmail: WORKER_EMAIL,
      }
    );


    await clickAssign(driver);


    expect(
      (await waitAlert(driver)) ===
        "Duty assigned successfully!",

      "Expected success alert."
    );


    const dateValue =
      await driver
        .findElement(
          By.id("duty-date")
        )
        .getAttribute("value");


    expect(
      dateValue === "",

      `Date should be cleared after success, ` +
      `got '${dateValue}'.`
    );


    expect(
      (await selectedCountText(driver))
        .startsWith("0"),

      "Selected workers should be cleared after success."
    );
  }
);


/* =========================================================
   SD-06
========================================================= */

tc(
  "SD-06",

  "Assigning the SAME duty to the same worker on the same date again is rejected",

  async (driver) => {

    needsReady();


    await fillDutyForm(
      driver,
      {
        date: DUTY_DATE,
        type: TYPE_1,
        workerEmail: WORKER_EMAIL,
      }
    );


    await clickAssign(driver);


    const text =
      await waitAlert(driver);


    expect(

      /already has this duty/i.test(text),

      `Expected a duplicate-duty message, ` +
      `got: "${text}"`
    );


    expect(
      (await selectedCountText(driver))
        .startsWith("1"),

      "Failed worker should remain selected for retry."
    );
  }
);


/* =========================================================
   SD-07
========================================================= */

tc(
  "SD-07",

  "Same worker, same date, DIFFERENT duty type is accepted",

  async (driver) => {

    needsReady();


    await fillDutyForm(
      driver,
      {
        date: DUTY_DATE,
        type: TYPE_2,
      }
    );


    await clickAssign(driver);


    expect(
      (await waitAlert(driver)) ===
        "Duty assigned successfully!",

      "Second duty type should be accepted."
    );
  }
);


/* =========================================================
   SD-08
========================================================= */

tc(
  "SD-08",

  "Worker logs in -> Show Work lists BOTH assigned duties with correct type and date",

  async (driver) => {

    needsReady();


    await driver
      .findElement(
        By.xpath(BACK_BUTTON)
      )
      .click();


    await driver.wait(
      until.elementLocated(
        By.xpath(
          CLINIC_ADMIN_DASHBOARD
        )
      ),
      TIMEOUT
    );


    await logoutViaUi(driver);


    await loginViaUi(
      driver,
      WORKER_EMAIL,
      WORKER_PASSWORD,
      WORKER_DASHBOARD
    );


    const showWork =
      await driver.wait(
        until.elementLocated(
          By.xpath(SHOW_WORK_NAV)
        ),
        TIMEOUT
      );


    await showWork.click();


    await driver.wait(
      until.elementLocated(
        By.xpath(MY_WORK_HEADING)
      ),
      TIMEOUT
    );


    const label =
      await expectedDateLabel(
        driver,
        DUTY_DATE
      );


    const rows =
      await poll(
        async () => {

          const texts =
            await dutyRowTexts(driver);

          return texts.length
            ? texts
            : null;
        },

        TIMEOUT,

        "duty rows on Show Work page"
      );


    const vaccination =
      rows.filter(
        (t) =>
          t.includes(TYPE_1) &&
          t.includes(label)
      );


    const inHouse =
      rows.filter(
        (t) =>
          t.includes(TYPE_2) &&
          t.includes(label)
      );


    expect(
      vaccination.length === 1,

      `Expected exactly 1 '${TYPE_1}' row ` +
      `on ${label}, found ${vaccination.length}.`
    );


    expect(
      inHouse.length === 1,

      `Expected exactly 1 '${TYPE_2}' row ` +
      `on ${label}, found ${inHouse.length}.`
    );


    expect(
      rows.every(
        (t) =>
          t.includes("Assigned")
      ),

      "Every duty row should show Assigned status."
    );


    const badge =
      (
        await driver
          .findElement(
            By.css(".show-work-count")
          )
          .getText()
      ).trim();


    expect(
      Number(badge) === rows.length,

      `Duty counter (${badge}) does not match ` +
      `number of rows (${rows.length}).`
    );
  }
);


/* =========================================================
   SD-09
========================================================= */

tc(
  "SD-09",

  "Worker's sidebar: Show Work keeps the worker logged in; Logout logs out",

  async (driver) => {

    needsReady();


    await driver
      .findElement(
        By.xpath(SHOW_WORK_NAV)
      )
      .click();


    await sleep(800);


    const stillThere =
      await driver.findElements(
        By.xpath(MY_WORK_HEADING)
      );


    expect(
      stillThere.length > 0,

      "Clicking Show Work logged the worker out."
    );


    const logout =
      await driver.findElement(
        By.css("button.clinic-logout")
      );


    await logout.click();


    await driver.wait(
      until.elementLocated(
        By.xpath(NAV_LOGIN)
      ),
      TIMEOUT
    );


    const token =
      await driver.executeScript(
        "return localStorage.getItem('token');"
      );


    expect(
      !token,

      "Token still present in localStorage after Logout."
    );
  }
);


/* =========================================================
   SD-10
========================================================= */

tc(
  "SD-10",

  "Access control API: worker cannot assign, admin cannot read worker duties, no token is rejected",

  async () => {

    needsReady();


    const worker =
      await apiLogin(
        WORKER_EMAIL,
        WORKER_PASSWORD
      );


    const admin =
      await apiLogin(
        CLINIC_ADMIN_EMAIL,
        CLINIC_ADMIN_PASSWORD
      );


    const body =
      JSON.stringify({
        workerId: ctx.workerId,
        dutyDate: DUTY_DATE,
        dutyType: TYPE_1,
      });


    const json = {
      "Content-Type":
        "application/json",
    };


    const asWorker =
      await fetch(
        `${API_URL}/clinics/my-clinic/duties`,
        {
          method: "POST",

          headers: {
            ...json,

            Authorization:
              `Bearer ${worker.token}`,
          },

          body,
        }
      );


    expect(
      asWorker.status === 403,

      `Worker assigning a duty: ` +
      `expected 403, got ${asWorker.status}.`
    );


    const adminReads =
      await fetch(
        `${API_URL}/clinics/my-duty`,
        {
          headers: {
            Authorization:
              `Bearer ${admin.token}`,
          },
        }
      );


    expect(
      adminReads.status === 403,

      `Clinic admin on /my-duty: ` +
      `expected 403, got ${adminReads.status}.`
    );


    const anonymous =
      await fetch(
        `${API_URL}/clinics/my-duty`
      );


    expect(
      anonymous.status === 401,

      `No token on /my-duty: ` +
      `expected 401, got ${anonymous.status}.`
    );


    const badInput =
      await fetch(
        `${API_URL}/clinics/my-clinic/duties`,
        {
          method: "POST",

          headers: {
            ...json,

            Authorization:
              `Bearer ${admin.token}`,
          },

          body: JSON.stringify({
            workerId:
              "not-an-object-id",

            dutyDate:
              DUTY_DATE,

            dutyType:
              TYPE_1,
          }),
        }
      );


    expect(
      badInput.status === 400,

      `Malformed workerId: ` +
      `expected 400, got ${badInput.status}.`
    );
  }
);


/* =========================================================
   TEST RUNNER
========================================================= */

async function main() {

  const options =
    new chrome.Options()
      .addArguments(
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


  console.log(
    "\n========================================"
  );

  console.log(
    " DUTY ASSIGNMENT E2E (Selenium)"
  );

  console.log(
    "========================================"
  );

  console.log(
    `Duty date used this run: ${DUTY_DATE}\n`
  );


  try {

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

        const isSkip =
          error instanceof Skip;


        results.push({
          id: c.id,
          title: c.title,
          status:
            isSkip
              ? "SKIP"
              : "FAIL",
        });


        console.log(
          `${isSkip ? "SKIPPED" : "FAILED"} ` +
          `${c.id} - ${c.title}`
        );


        console.log(
          `        ${error.message}`
        );
      }
    }


  } finally {

    const count = (status) =>
      results.filter(
        (r) =>
          r.status === status
      ).length;


    console.log(
      "\n========================================"
    );


    console.log(
      ` Total ${results.length} | ` +
      `Passed ${count("PASS")} | ` +
      `Failed ${count("FAIL")} | ` +
      `Skipped ${count("SKIP")}`
    );


    console.log(
      "========================================\n"
    );


    if (process.env.KEEP_OPEN !== "1") {
      await driver.quit();
    }
  }
}


main().catch((error) => {

  console.error(
    "Duty assignment Selenium test could not run:",
    error.message || error
  );

  process.exitCode = 1;
});