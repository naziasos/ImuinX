const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL =
  process.env.BASE_URL || "http://localhost:5173";

const CITIZEN_EMAIL =
  process.env.CITIZEN_EMAIL || "23201032@uap-bd.edu";

const CITIZEN_PASSWORD =
  process.env.CITIZEN_PASSWORD || "tanha123";

const WORKER_EMAIL =
  process.env.WORKER_EMAIL || "23201046@uap-bd.edu";

const WORKER_PASSWORD =
  process.env.WORKER_PASSWORD || "8s6l7e";

const CLINIC_ADMIN_EMAIL =
  process.env.CLINIC_ADMIN_EMAIL || "23201030@uap-bd.edu";

const CLINIC_ADMIN_PASSWORD =
  process.env.CLINIC_ADMIN_PASSWORD || "nurjahan@123";

const TIMEOUT = 10000;

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

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
   LOCATORS
========================================================= */

const NAV_LOGIN =
  "//nav//button[normalize-space()='Login']";

const CITIZEN_DASHBOARD =
  "//h1[normalize-space()='Citizen Dashboard']";

const WORKER_DASHBOARD =
  "//h1[contains(normalize-space(),'Worker Dashboard')]";

const CLINIC_ADMIN_DASHBOARD =
  "//h1[normalize-space()='Clinic Admin Dashboard']";

// Sidebar "Feedback" item (citizen + clinic admin dashboards)
const FEEDBACK_NAV =
  "//button[contains(@class,'clinic-nav-item')][contains(normalize-space(),'Feedback')]";

// Unread/pending badge inside the sidebar item
const FEEDBACK_NAV_BADGE = `${FEEDBACK_NAV}//em`;

const CITIZEN_FEEDBACK_HEADING =
  "//h1[normalize-space()='Your feedback']";

const CLINIC_FEEDBACK_HEADING =
  "//h1[normalize-space()='Patient Feedback']";

const MY_FEEDBACK_TAB =
  "//button[@role='tab'][contains(normalize-space(),'My feedback')]";

const cardByComment = (comment) =>
  `//article[contains(@class,'fb-card')][.//p[contains(@class,'fb-comment')][normalize-space()='${comment}']]`;


/* =========================================================
   TEST DATA
========================================================= */

const runId = new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(4, 14);

const RATING = 3;
const TAGS = ["Staff Behavior", "Cleanliness"];
const FEEDBACK_COMMENT = `Selenium submission ${runId}`;

const ctx = {
  citizenName: "",
  pendingBefore: 0,
  submittedBefore: 0,
  vaccineType: "",
};


/* =========================================================
   HELPERS
========================================================= */

async function click(driver, element) {
  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    element
  );

  await element.click();
}

async function logout(driver) {
  // Same thing the app's own Logout button does
  await driver.executeScript(
    "localStorage.removeItem('token'); localStorage.removeItem('user');"
  );

  await driver.get(BASE_URL);
}

async function loginAs(driver, email, password, dashboardXpath, label) {
  await driver.get(BASE_URL);

  const loginBtn = await driver.wait(
    until.elementLocated(By.xpath(NAV_LOGIN)),
    15000
  );

  await loginBtn.click();

  const emailField = await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );

  await emailField.sendKeys(email);

  await driver
    .findElement(By.name("password"))
    .sendKeys(password);

  await driver
    .findElement(By.css("button[type='submit']"))
    .click();

  await driver.wait(
    until.elementLocated(By.xpath(dashboardXpath)),
    15000
  );

  console.log(`${label} login successful.`);
}

async function openFeedbackFromSidebar(driver, headingXpath) {
  const navItem = await driver.wait(
    until.elementLocated(By.xpath(FEEDBACK_NAV)),
    TIMEOUT
  );

  await navItem.click();

  await driver.wait(
    until.elementLocated(By.xpath(headingXpath)),
    TIMEOUT
  );

  await poll(
    async () =>
      (await driver.findElements(By.css(".fb-spinner"))).length === 0,
    TIMEOUT,
    "feedback page to finish loading"
  );
}

// "To review" and "My feedback" counters from the tab bar
async function readTabCounts(driver) {
  const counts = await driver.findElements(
    By.css(".fb-tabs .fb-count")
  );

  expect(counts.length === 2, "Feedback tab counters not found.");

  return {
    pending: parseInt(await counts[0].getText(), 10),
    submitted: parseInt(await counts[1].getText(), 10),
  };
}

async function waitForToast(driver, includes) {
  return poll(
    async () => {
      const toasts = await driver.findElements(By.css(".fb-toast"));

      if (toasts.length === 0) {
        return false;
      }

      return (await toasts[0].getText()).includes(includes);
    },
    TIMEOUT,
    `toast containing "${includes}"`
  );
}


/* =========================================================
   STEP 1 - BASELINE: CITIZEN'S CURRENT FEEDBACK COUNTS
========================================================= */

async function recordBaseline(driver) {
  await loginAs(
    driver,
    CITIZEN_EMAIL,
    CITIZEN_PASSWORD,
    CITIZEN_DASHBOARD,
    "Citizen"
  );

  const user = JSON.parse(
    await driver.executeScript("return localStorage.getItem('user');")
  );

  ctx.citizenName = user?.name || "";

  expect(ctx.citizenName, "Could not read the citizen's name after login.");

  await openFeedbackFromSidebar(driver, CITIZEN_FEEDBACK_HEADING);

  const counts = await readTabCounts(driver);

  ctx.pendingBefore = counts.pending;
  ctx.submittedBefore = counts.submitted;

  console.log(
    `Baseline - to review: ${ctx.pendingBefore}, submitted: ${ctx.submittedBefore}`
  );
}


/* =========================================================
   STEP 2 - WORKER LOGS A DOSE (CREATES THE PENDING FEEDBACK)
========================================================= */

async function workerLogsDose(driver) {
  await loginAs(
    driver,
    WORKER_EMAIL,
    WORKER_PASSWORD,
    WORKER_DASHBOARD,
    "Worker"
  );

  const logDoseNav = await driver.wait(
    until.elementLocated(
      By.xpath("//button[contains(normalize-space(),'Log Dose')]")
    ),
    TIMEOUT
  );

  await logDoseNav.click();

  await driver.wait(
    until.elementLocated(
      By.xpath("//h1[normalize-space()='Log a Dose']")
    ),
    TIMEOUT
  );

  const searchBox = await driver.wait(
    until.elementLocated(
      By.css("input[placeholder*='Type at least 2 letters']")
    ),
    TIMEOUT
  );

  await searchBox.sendKeys(ctx.citizenName);

  await sleep(1000);

  const citizenOption = await driver.wait(
    until.elementLocated(
      By.xpath(
        `//button[contains(@class,'logdose-dropdown-item')][contains(.,'${ctx.citizenName}')]`
      )
    ),
    TIMEOUT
  );

  await citizenOption.click();

  const vaccine = await driver.wait(
    until.elementLocated(By.css(".logdose-tile")),
    TIMEOUT
  );

  await vaccine.click();

  const batch = await driver.wait(
    until.elementLocated(By.css(".logdose-batch-card")),
    TIMEOUT
  );

  await batch.click();

  await driver
    .findElement(
      By.xpath("//button[@type='submit' and normalize-space()='Log Dose']")
    )
    .click();

  await driver.wait(
    until.elementLocated(
      By.xpath("//h2[normalize-space()='Dose Logged']")
    ),
    15000
  );

  console.log("Dose logged for the citizen.");
}


/* =========================================================
   STEP 3 - CITIZEN SEES THE NEW PENDING FEEDBACK
========================================================= */

async function citizenSeesPending(driver) {
  await loginAs(
    driver,
    CITIZEN_EMAIL,
    CITIZEN_PASSWORD,
    CITIZEN_DASHBOARD,
    "Citizen"
  );

  const expected = ctx.pendingBefore + 1;

  // Dashboard badge
  await poll(
    async () => {
      const badge = await driver.findElements(By.xpath(FEEDBACK_NAV_BADGE));

      return (
        badge.length > 0 &&
        parseInt(await badge[0].getText(), 10) === expected
      );
    },
    TIMEOUT,
    `Feedback badge to show ${expected}`
  );

  console.log(`Dashboard badge shows ${expected} pending.`);

  // Feedback page counters + list
  await openFeedbackFromSidebar(driver, CITIZEN_FEEDBACK_HEADING);

  const counts = await readTabCounts(driver);

  expect(
    counts.pending === expected,
    `"To review" should be ${expected}, got ${counts.pending}.`
  );

  const visits = await driver.findElements(By.css(".fb-visit"));

  expect(
    visits.length === expected,
    `Expected ${expected} visits in the list, got ${visits.length}.`
  );

  console.log("Feedback page lists the new visit.");
}


/* =========================================================
   STEP 4 - CITIZEN SUBMITS FEEDBACK
========================================================= */

async function citizenSubmitsFeedback(driver) {
  const expectedPending = ctx.pendingBefore + 1;

  // Select the newest visit (list is newest first)
  await click(driver, await driver.findElement(By.css(".fb-visit")));

  let form = await driver.wait(
    until.elementLocated(By.css(".fb-form")),
    TIMEOUT
  );

  const summary = await form.findElements(By.css(".fb-summary strong"));

  ctx.vaccineType = (await summary[0].getText()).trim();

  expect(
    (await summary[1].getText()).includes(ctx.citizenName),
    "Visit summary does not show the vaccinated person."
  );

  console.log("Reviewing visit:", ctx.vaccineType);

  // ---- Validation: no rating ----
  await click(
    driver,
    await form.findElement(By.css("button[type='submit']"))
  );

  const ratingError = await driver.wait(
    until.elementLocated(By.css(".fb-form .fb-alert")),
    TIMEOUT
  );

  expect(
    (await ratingError.getText()).includes("star rating"),
    "Missing-rating validation message was not shown."
  );

  console.log("Missing-rating validation verified.");

  // ---- "Maybe later" keeps the item pending ----
  await click(
    driver,
    await form.findElement(By.css(".fb-actions .fb-btn.ghost"))
  );

  await waitForToast(driver, "for later");

  expect(
    (await readTabCounts(driver)).pending === expectedPending,
    "'Maybe later' should keep the visit in the To review list."
  );

  console.log("'Maybe later' verified - visit stays pending.");

  // ---- Fill in and submit ----
  await click(driver, await driver.findElement(By.css(".fb-visit")));

  form = await driver.wait(
    until.elementLocated(By.css(".fb-form")),
    TIMEOUT
  );

  await click(
    driver,
    await form.findElement(
      By.css(`button[aria-label='${RATING} stars']`)
    )
  );

  for (const tag of TAGS) {
    const chip = await form.findElement(
      By.xpath(`.//div[contains(@class,'fb-chips')]//button[contains(normalize-space(),'${tag}')]`)
    );

    await click(driver, chip);

    expect(
      (await chip.getAttribute("aria-pressed")) === "true",
      `Tag "${tag}" was not selected.`
    );
  }

  await form
    .findElement(By.css("textarea"))
    .sendKeys(FEEDBACK_COMMENT);

  expect(
    (await form.findElement(By.css(".fb-counter")).getText()).trim() ===
      `${FEEDBACK_COMMENT.length}/1000`,
    "Character counter does not match the comment length."
  );

  const anonymous = await form.findElement(
    By.css(".fb-anon input[type='checkbox']")
  );

  await click(driver, anonymous);

  expect(
    await anonymous.isSelected(),
    "'Send anonymously' checkbox was not ticked."
  );

  await click(
    driver,
    await form.findElement(By.css("button[type='submit']"))
  );

  await waitForToast(driver, "Thank you");

  console.log("Feedback submitted.");
}


/* =========================================================
   STEP 5 - CITIZEN VERIFIES THE SUBMITTED FEEDBACK
========================================================= */

async function citizenVerifiesSubmission(driver) {
  // Counters move by exactly one
  await poll(
    async () => {
      const counts = await readTabCounts(driver);

      return (
        counts.pending === ctx.pendingBefore &&
        counts.submitted === ctx.submittedBefore + 1
      );
    },
    TIMEOUT,
    "tab counters to update after submitting"
  );

  console.log("Tab counters updated (To review -1, My feedback +1).");

  await click(
    driver,
    await driver.findElement(By.xpath(MY_FEEDBACK_TAB))
  );

  const card = await poll(
    async () => {
      const found = await driver.findElements(
        By.xpath(cardByComment(FEEDBACK_COMMENT))
      );
      return found[0];
    },
    TIMEOUT,
    "submitted feedback in 'My feedback'"
  );

  const text = await card.getText();

  expect(text.includes(ctx.vaccineType), "Card does not show the vaccine.");

  for (const tag of TAGS) {
    expect(text.includes(tag), `Card does not show the tag "${tag}".`);
  }

  expect(
    (await card.findElements(By.css(".fb-stars-static span.on"))).length ===
      RATING,
    `Card does not show ${RATING} stars.`
  );

  expect(
    (await card.findElement(By.css(".fb-status")).getText()).trim() === "Sent",
    "Submitted feedback should show status 'Sent'."
  );

  expect(
    text.includes("Sent anonymously"),
    "Card should be marked 'Sent anonymously'."
  );

  expect(
    (await card.findElements(By.css(".fb-reply"))).length === 0,
    "New feedback should not have a reply yet."
  );

  console.log("Citizen: submitted feedback verified in 'My feedback'.");
}


/* =========================================================
   STEP 6 - FEEDBACK ARRIVES AT THE CLINIC (ANONYMOUSLY)
========================================================= */

async function clinicReceivesFeedback(driver) {
  await loginAs(
    driver,
    CLINIC_ADMIN_EMAIL,
    CLINIC_ADMIN_PASSWORD,
    CLINIC_ADMIN_DASHBOARD,
    "Clinic Admin"
  );

  await openFeedbackFromSidebar(driver, CLINIC_FEEDBACK_HEADING);

  const card = await poll(
    async () => {
      const found = await driver.findElements(
        By.xpath(cardByComment(FEEDBACK_COMMENT))
      );
      return found[0];
    },
    TIMEOUT,
    "citizen feedback in the clinic admin list " +
      "(check the dose was logged at the clinic this admin manages)"
  );

  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    card
  );

  const author = (
    await card.findElement(By.css(".fb-card-head strong")).getText()
  ).trim();

  expect(
    author === "Anonymous",
    `Clinic should see "Anonymous", got "${author}".`
  );

  const text = await card.getText();

  expect(
    !text.includes(ctx.citizenName),
    "Citizen name leaked to the clinic on anonymous feedback."
  );

  expect(text.includes(ctx.vaccineType), "Clinic card does not show the vaccine.");

  for (const tag of TAGS) {
    expect(text.includes(tag), `Clinic card does not show the tag "${tag}".`);
  }

  expect(
    (await card.findElements(By.css(".fb-stars-static span.on"))).length ===
      RATING,
    `Clinic card does not show ${RATING} stars.`
  );

  expect(
    (await card.findElement(By.css(".fb-status")).getText()).trim() === "New",
    "Feedback should arrive with review status 'New'."
  );

  console.log("Clinic admin: feedback received, citizen identity hidden.");
}


/* =========================================================
   RUN
========================================================= */

async function runTest() {
  let driver;

  try {
    const options = new chrome.Options()
      .addArguments("--window-size=1440,1000");

    if (process.env.HEADLESS === "1") {
      options.addArguments("--headless=new");
    }

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    console.log("\n==============================");
    console.log("FEEDBACK SUBMISSION E2E TEST");
    console.log("==============================");

    await recordBaseline(driver);

    await logout(driver);
    await workerLogsDose(driver);

    await logout(driver);
    await citizenSeesPending(driver);
    await citizenSubmitsFeedback(driver);
    await citizenVerifiesSubmission(driver);

    await logout(driver);
    await clinicReceivesFeedback(driver);

    console.log("\n✅ TEST PASSED");
    console.log(
      "Dose logged → Citizen submits feedback → Clinic receives it."
    );

  } catch (error) {
    console.log("\n❌ TEST FAILED");
    console.log(error.message);

    process.exitCode = 1;

  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

runTest();