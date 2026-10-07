const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL =
  process.env.BASE_URL || "http://localhost:5173";

const CITIZEN_EMAIL =
  process.env.CITIZEN_EMAIL || "23201032@uap-bd.edu";

const CITIZEN_PASSWORD =
  process.env.CITIZEN_PASSWORD || "tanha123";

const CLINIC_ADMIN_EMAIL =
  process.env.CLINIC_ADMIN_EMAIL || "23201030@uap-bd.edu";

const CLINIC_ADMIN_PASSWORD =
  process.env.CLINIC_ADMIN_PASSWORD || "nurjahan@123";

const WORKER_EMAIL =
  process.env.WORKER_EMAIL || "23201046@uap-bd.edu";

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

const NAV_LOGIN =
  "//nav//button[normalize-space()='Login']";

const CITIZEN_DASHBOARD =
  "//h1[normalize-space()='Citizen Dashboard']";

const CLINIC_ADMIN_DASHBOARD =
  "//h1[normalize-space()='Clinic Admin Dashboard']";

const WORKER_DASHBOARD =
  "//h1[contains(normalize-space(),'Worker Dashboard')]";

const FEEDBACK_NAV =
  "//button[contains(@class,'clinic-nav-item')][contains(normalize-space(),'Feedback')]";

const CITIZEN_FEEDBACK_HEADING =
  "//h1[normalize-space()='Your feedback']";

const MY_FEEDBACK_TAB =
  "//button[@role='tab'][contains(normalize-space(),'My feedback')]";

const CLINIC_FEEDBACK_HEADING =
  "//h1[normalize-space()='Patient Feedback']";

const cardByComment = (comment) =>
  `//article[contains(@class,'fb-card')][.//p[contains(@class,'fb-comment')][normalize-space()='${comment}']]`;



const runId = new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(4, 14);

const RATING = 4;
const TAG = "Waiting Time";
const FEEDBACK_COMMENT = `Selenium feedback ${runId}`;
const REPLY_MESSAGE = `Selenium reply ${runId}`;

const ctx = {
  citizenName: "",
  clinicAdminName: "",
  vaccineType: "",
  clinicName: "",
};


async function click(driver, element) {
  await driver.executeScript(
    "arguments[0].scrollIntoView({block:'center'});",
    element
  );

  await element.click();
}

async function getLoggedInUser(driver) {
  const raw = await driver.executeScript(
    "return localStorage.getItem('user');"
  );

  return raw ? JSON.parse(raw) : null;
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

function countOn(driver, scope) {
  return scope.findElements(By.css(".fb-stars-static span.on"));
}

async function logDoseAsWorker(driver, citizenName) {
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

  await searchBox.sendKeys(citizenName);

  await sleep(1000);

  const citizenOption = await driver.wait(
    until.elementLocated(
      By.xpath(
        `//button[contains(@class,'logdose-dropdown-item')][contains(.,'${citizenName}')]`
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

  console.log("Dose logged - pending feedback created for citizen.");
}

async function ensurePendingFeedback(driver) {
  const pending = await driver.findElements(By.css(".fb-visit"));

  if (pending.length > 0) {
    console.log(`Pending feedback items found: ${pending.length}`);
    return;
  }

  console.log("No pending feedback found - creating one via a dose.");

  await logout(driver);
  await logDoseAsWorker(driver, ctx.citizenName);
  await logout(driver);

  await loginAs(
    driver,
    CITIZEN_EMAIL,
    CITIZEN_PASSWORD,
    CITIZEN_DASHBOARD,
    "Citizen"
  );

  await openFeedbackFromSidebar(driver, CITIZEN_FEEDBACK_HEADING);

  const created = await driver.findElements(By.css(".fb-visit"));

  expect(
    created.length > 0,
    "Dose was logged but no pending feedback appeared for the citizen."
  );
}



async function citizenSubmitsFeedback(driver) {
  const firstVisit = await driver.findElement(By.css(".fb-visit"));

  await click(driver, firstVisit);

  const form = await driver.wait(
    until.elementLocated(By.css(".fb-form")),
    TIMEOUT
  );

  // Visit details shown in the form: Vaccine, For, Clinic, Date
  const summary = await form.findElements(By.css(".fb-summary strong"));

  ctx.vaccineType = (await summary[0].getText()).trim();
  ctx.clinicName = (await summary[2].getText()).trim();

  console.log("Reviewing visit:", ctx.vaccineType, "@", ctx.clinicName);

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

  await click(
    driver,
    await form.findElement(
      By.css(`button[aria-label='${RATING} stars']`)
    )
  );


  const tagChip = await form.findElement(
    By.xpath(`.//div[contains(@class,'fb-chips')]//button[contains(normalize-space(),'${TAG}')]`)
  );

  await click(driver, tagChip);

  expect(
    (await tagChip.getAttribute("aria-pressed")) === "true",
    `Tag "${TAG}" was not selected.`
  );


  await form
    .findElement(By.css("textarea"))
    .sendKeys(FEEDBACK_COMMENT);

  await click(
    driver,
    await form.findElement(By.css("button[type='submit']"))
  );

  const toast = await driver.wait(
    until.elementLocated(By.css(".fb-toast")),
    TIMEOUT
  );

  expect(
    (await toast.getText()).includes("Thank you"),
    "Success toast was not shown after submitting feedback."
  );

  console.log("Feedback submitted.");

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

  expect(
    text.includes(ctx.vaccineType),
    "Submitted feedback card does not show the vaccine."
  );

  expect(
    text.includes(TAG),
    "Submitted feedback card does not show the selected tag."
  );

  expect(
    (await countOn(driver, card)).length === RATING,
    `Submitted feedback card does not show ${RATING} stars.`
  );

  expect(
    (await card.findElement(By.css(".fb-status")).getText()).trim() === "Sent",
    "Submitted feedback should show status 'Sent'."
  );

  expect(
    (await card.findElements(By.css(".fb-reply"))).length === 0,
    "Newly submitted feedback should not have a reply yet."
  );

  console.log("Citizen: feedback visible under 'My feedback'.");
}


async function clinicAdminViewsFeedback(driver) {
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

  const text = await card.getText();

  expect(
    text.includes(ctx.citizenName),
    `Clinic admin does not see the citizen name "${ctx.citizenName}".`
  );

  expect(
    text.includes(ctx.vaccineType),
    "Clinic admin card does not show the vaccine."
  );

  expect(
    text.includes(TAG),
    "Clinic admin card does not show the selected tag."
  );

  expect(
    (await countOn(driver, card)).length === RATING,
    `Clinic admin card does not show ${RATING} stars.`
  );

  expect(
    (await card.findElement(By.css(".fb-status")).getText()).trim() === "New",
    "Newly submitted feedback should have review status 'New'."
  );

  expect(
    (await card.findElements(By.css(".fb-reply"))).length === 0,
    "Feedback should have no replies before the clinic admin responds."
  );

  console.log("Clinic admin: feedback visible with correct details.");
}


async function clinicAdminResponds(driver) {
  const card = await driver.findElement(
    By.xpath(cardByComment(FEEDBACK_COMMENT))
  );

  // Empty reply must be blocked
  await click(
    driver,
    await card.findElement(By.css(".cf-reply-box button"))
  );

  const emptyError = await poll(
    async () => {
      const found = await card.findElements(
        By.css(".cf-reply-box .fb-alert")
      );
      return found[0];
    },
    TIMEOUT,
    "empty-reply validation message"
  );

  expect(
    (await emptyError.getText()).includes("write a reply"),
    "Empty-reply validation message was not shown."
  );

  console.log("Empty-reply validation verified.");

  await card
    .findElement(By.css(".cf-reply-box textarea"))
    .sendKeys(REPLY_MESSAGE);

  await click(
    driver,
    await card.findElement(By.css(".cf-reply-box button"))
  );

  const updatedCard = await poll(
    async () => {
      const found = await driver.findElements(
        By.xpath(
          `${cardByComment(FEEDBACK_COMMENT)}[.//div[contains(@class,'fb-reply')]//p[normalize-space()='${REPLY_MESSAGE}']]`
        )
      );
      return found[0];
    },
    TIMEOUT,
    "reply to appear on the feedback card"
  );

  const status = (
    await updatedCard.findElement(By.css(".fb-status")).getText()
  ).trim();

  expect(
    status === "Responded",
    `Review status should be 'Responded' after replying, got '${status}'.`
  );

  if (ctx.clinicAdminName) {
    const responder = (
      await updatedCard
        .findElement(By.css(".fb-reply .fb-reply-head strong"))
        .getText()
    ).trim();

    expect(
      responder === ctx.clinicAdminName,
      `Reply should be shown from "${ctx.clinicAdminName}", got "${responder}".`
    );
  }

  const draft = await updatedCard
    .findElement(By.css(".cf-reply-box textarea"))
    .getAttribute("value");

  expect(draft === "", "Reply box was not cleared after sending.");

  console.log("Clinic admin: reply sent and status is 'Responded'.");
}



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
    console.log("FEEDBACK REVIEW E2E TEST");
    console.log("==============================");

    
    await loginAs(
      driver,
      CITIZEN_EMAIL,
      CITIZEN_PASSWORD,
      CITIZEN_DASHBOARD,
      "Citizen"
    );

    const citizen = await getLoggedInUser(driver);
    ctx.citizenName = citizen?.name || "";

    expect(ctx.citizenName, "Could not read the citizen's name after login.");

    await openFeedbackFromSidebar(driver, CITIZEN_FEEDBACK_HEADING);
    await ensurePendingFeedback(driver);
    await citizenSubmitsFeedback(driver);

   
    await logout(driver);

    await loginAs(
      driver,
      CLINIC_ADMIN_EMAIL,
      CLINIC_ADMIN_PASSWORD,
      CLINIC_ADMIN_DASHBOARD,
      "Clinic Admin"
    );

    const admin = await getLoggedInUser(driver);
    ctx.clinicAdminName = admin?.name || "";

    await clinicAdminViewsFeedback(driver);
    await clinicAdminResponds(driver);

    console.log("\n✅ TEST PASSED");
    console.log(
      "Citizen submits → Clinic Admin views → Clinic Admin responds."
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