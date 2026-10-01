const fs = require("fs");
const os = require("os");
const path = require("path");
const crypto = require("crypto");
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:5000/api";

const CITIZEN_EMAIL = process.env.CITIZEN_EMAIL || "alfisiyadi@gmail.com";
const CITIZEN_PASSWORD = process.env.CITIZEN_PASSWORD || "Alfi@1002";
const QR_SIGNING_SECRET = process.env.QR_SIGNING_SECRET || "GuFXCbjXtSkwKW7RcbptfNqd2xoOcWrtet";
const QR_SIGNING_KEY_ID = process.env.QR_SIGNING_KEY_ID || "1";

const TIMEOUT = 10000;
const AUDIENCE = "imunix:vaccination-certificate";
const ISSUER = "imunix";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

class Skip extends Error {}

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

const NAV_VERIFY =
  "//nav//button[normalize-space()='Verify']";

const VERIFY_HEADING =
  "//h1[normalize-space()='Verify a vaccination certificate']";

const TAB_ENTER_CODE =
  "//button[normalize-space()='Enter code']";

const TAB_UPLOAD =
  "//button[normalize-space()='Upload']";

const TAB_SCAN =
  "//button[normalize-space()='Scan QR']";

const SUBMIT_BUTTON =
  "//form//button[@type='submit']";

const RESULT_PANEL =
  "//*[@role='status']";

const RESULT_TITLE =
  "//*[@role='status']//h2";

const VERIFY_ANOTHER =
  "//button[normalize-space()='Verify another']";

const TRY_AGAIN =
  "//button[normalize-space()='Try again']";

const b64u = (value) =>
  Buffer.from(value).toString("base64url");

const randomTid = () =>
  crypto.randomBytes(32).toString("hex");


function signHs256(header, payload, secret) {
  const data =
    `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`;

  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}


function forgeSignedToken({ tid, iat, exp }) {
  return signHs256(
    {
      alg: "HS256",
      typ: "JWT",
      kid: QR_SIGNING_KEY_ID
    },
    {
      v: 1,
      tid,
      iat,
      exp,
      aud: AUDIENCE,
      iss: ISSUER
    },
    QR_SIGNING_SECRET
  );
}

async function apiLogin(email, password) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email,
      password
    })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      `API login failed for ${email}: ${res.status} ${
        data.message || ""
      }`
    );
  }

  return data;
}


const ctx = {
  citizen: null,
  cert: null,
  qrImagePath: null
};

async function loadRealCertificate() {
  if (ctx.cert) {
    return ctx.cert;
  }

  if (!CITIZEN_EMAIL || !CITIZEN_PASSWORD) {
    throw new Skip(
      "Set CITIZEN_EMAIL and CITIZEN_PASSWORD."
    );
  }

  const login = await apiLogin(
    CITIZEN_EMAIL,
    CITIZEN_PASSWORD
  );

  ctx.citizen = login;

  const auth = {
    Authorization: `Bearer ${login.token}`
  };


  const dosesRes = await fetch(
    `${API_URL}/doses/citizen/${login.user.id}?citizenType=user`,
    {
      headers: auth
    }
  );

  const dosesBody = await dosesRes.json();

  expect(
    dosesRes.ok,
    `Could not load doses: ${dosesBody.message}`
  );


  for (const dose of dosesBody.doses || []) {

    const certRes = await fetch(
      `${API_URL}/certificates/dose/${dose._id}`,
      {
        headers: auth
      }
    );

    if (!certRes.ok) {
      continue;
    }

    const { certificate } = await certRes.json();

    if (
      certificate &&
      new Date(certificate.expiryDate).getTime() >
        Date.now()
    ) {

      ctx.cert = certificate;

      const png = certificate.qrCode.replace(
        /^data:image\/png;base64,/,
        ""
      );

      ctx.qrImagePath = path.join(
        os.tmpdir(),
        `imuinx-qr-${Date.now()}.png`
      );

      fs.writeFileSync(
        ctx.qrImagePath,
        png,
        "base64"
      );

      return ctx.cert;
    }
  }

  throw new Skip(
    `${CITIZEN_EMAIL} has no non-expired certificate.`
  );
}


function needSecret() {
  if (!QR_SIGNING_SECRET) {
    throw new Skip(
      "Set QR_SIGNING_SECRET."
    );
  }
}


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
    `,
    element,
    value
  );
}

async function openVerifyPage(driver) {

  await driver.get(BASE_URL);

  await driver.executeScript(
    "localStorage.clear(); sessionStorage.clear();"
  );

  await driver.navigate().refresh();


  const link = await poll(
    async () => {

      const found =
        await driver.findElements(
          By.xpath(NAV_VERIFY)
        );

      for (const el of found) {

        if (await el.isDisplayed()) {
          return el;
        }
      }

      return null;
    },
    15000,
    "'Verify' item in navigation bar"
  );


  await link.click();

  await driver.wait(
    until.elementLocated(
      By.xpath(VERIFY_HEADING)
    ),
    TIMEOUT
  );
}


async function ensureFormVisible(driver) {

  const another =
    await driver.findElements(
      By.xpath(VERIFY_ANOTHER)
    );

  if (another.length) {
    await another[0].click();
  }


  const tryAgain =
    await driver.findElements(
      By.xpath(TRY_AGAIN)
    );

  if (tryAgain.length) {
    await tryAgain[0].click();
  }
}


async function openEnterCodeTab(driver) {

  await ensureFormVisible(driver);

  const tab =
    await driver.wait(
      until.elementLocated(
        By.xpath(TAB_ENTER_CODE)
      ),
      TIMEOUT
    );

  await tab.click();

  await driver.wait(
    until.elementLocated(
      By.id("cert-code")
    ),
    TIMEOUT
  );
}


async function resultTitle(
  driver,
  timeout = TIMEOUT
) {

  const title =
    await driver.wait(
      until.elementLocated(
        By.xpath(RESULT_TITLE)
      ),
      timeout
    );

  return (await title.getText()).trim();
}


async function verifyTyped(
  driver,
  code
) {

  await openEnterCodeTab(driver);

  const box =
    await driver.findElement(
      By.id("cert-code")
    );

  await setReactValue(
    driver,
    box,
    code
  );


  const submit =
    await driver.findElement(
      By.xpath(SUBMIT_BUTTON)
    );

  await driver.wait(
    until.elementIsEnabled(submit),
    TIMEOUT
  );

  await submit.click();

  return resultTitle(driver);
}


async function uploadImage(
  driver,
  filePath
) {

  await ensureFormVisible(driver);

  await (
    await driver.wait(
      until.elementLocated(
        By.xpath(TAB_UPLOAD)
      ),
      TIMEOUT
    )
  ).click();


  const input =
    await driver.wait(
      until.elementLocated(
        By.id("cert-image")
      ),
      TIMEOUT
    );


  await driver.executeScript(
    `
    arguments[0].classList.remove('sr-only');
    arguments[0].style.display='block';
    `,
    input
  );


  await input.sendKeys(filePath);
}


const cases = [];

const tc = (id, title, fn) =>
  cases.push({
    id,
    title,
    fn
  });


tc(
  "SV-01",
  "Verify page opens from navbar without login and shows the 3 input modes",
  async (driver) => {

    await openVerifyPage(driver);


    for (
      const xp of [
        TAB_SCAN,
        TAB_UPLOAD,
        TAB_ENTER_CODE
      ]
    ) {

      expect(
        (await driver.findElements(
          By.xpath(xp)
        )).length > 0,
        `Missing tab: ${xp}`
      );
    }


    const token =
      await driver.executeScript(
        "return localStorage.getItem('token');"
      );

    expect(
      !token,
      "Verify page must work without being logged in."
    );
  }
);



tc(
  "SV-03",
  "VALID: genuine certificate code shows VALID",
  async (driver) => {

    const cert =
      await loadRealCertificate();


    await openVerifyPage(driver);


    const title =
      await verifyTyped(
        driver,
        cert.token
      );


    expect(
      title === "VALID",
      `Expected VALID, got '${title}'.`
    );


    const panel =
      await driver
        .findElement(
          By.xpath(RESULT_PANEL)
        )
        .getText();


    expect(
      /genuine and current/i.test(panel),
      "Missing the 'genuine and current' message."
    );


    const forbidden = [
      ctx.citizen.user.name,
      ctx.citizen.user.email
    ].filter(Boolean);


    for (const word of forbidden) {

      expect(
        !panel
          .toLowerCase()
          .includes(
            String(word).toLowerCase()
          ),
        `Result page leaks personal data: '${word}'.`
      );
    }
  }
);


tc(
  "SV-07",
  "TAMPERED: changed signature character gives INVALID",
  async (driver) => {

    const cert =
      await loadRealCertificate();


    const [h, p, s] =
      cert.token.split(".");


    const mid =
      Math.floor(s.length / 2);


    const flipped =
      s[mid] === "A"
        ? "B"
        : "A";


    const tampered =
      `${h}.${p}.${s.slice(
        0,
        mid
      )}${flipped}${s.slice(mid + 1)}`;


    const title =
      await verifyTyped(
        driver,
        tampered
      );


    expect(
      title === "INVALID",
      `Expected INVALID for tampered signature, got '${title}'.`
    );


    const panel =
      await driver
        .findElement(
          By.xpath(RESULT_PANEL)
        )
        .getText();


    expect(
      /tampered|expired|revoked/i.test(
        panel
      ),
      "Invalid result should explain the possible reason."
    );
  }
);


/* =========================================================
   CATEGORY 4
   EXPIRED
========================================================= */

tc(
  "SV-11",
  "EXPIRED: properly signed expired token gives INVALID",
  async (driver) => {

    needSecret();


    const now =
      Math.floor(
        Date.now() / 1000
      );


    const expired =
      forgeSignedToken({
        tid: randomTid(),

        iat:
          now -
          2 * 86400,

        exp:
          now -
          86400
      });


    const title =
      await verifyTyped(
        driver,
        expired
      );


    expect(
      title === "INVALID",
      `Expected INVALID for expired token, got '${title}'.`
    );
  }
);


/* =========================================================
   CATEGORY 5
   IMAGE UPLOAD EDGE CASE
========================================================= */

tc(
  "SV-13",
  "Upload image without QR code shows No QR code found",
  async (driver) => {

    const blank =
      path.join(
        os.tmpdir(),
        `imuinx-blank-${Date.now()}.png`
      );


    fs.writeFileSync(
      blank,

      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==",

      "base64"
    );


    await openVerifyPage(driver);


    await uploadImage(
      driver,
      blank
    );


    const message =
      await poll(
        async () => {

          const found =
            await driver.findElements(
              By.css("[role='alert']")
            );


          return found.length
            ? (
                await found[0].getText()
              ).trim()
            : "";
        },

        15000,

        "'No QR code found' message"
      );


    expect(
      /No QR code found/i.test(
        message
      ),
      `Unexpected message: '${message}'.`
    );


    expect(
      (
        await driver.findElements(
          By.xpath(RESULT_PANEL)
        )
      ).length === 0,

      "No result should be shown for an image without QR."
    );
  }
);


/* =========================================================
   CATEGORY 6
   NETWORK FAILURE
========================================================= */

tc(
  "SV-15",
  "Server unreachable gives COULD NOT CHECK and Try again works",
  async (driver) => {

    await openEnterCodeTab(
      driver
    );


    const box =
      await driver.findElement(
        By.id("cert-code")
      );


    await setReactValue(
      driver,
      box,
      "invalid-token"
    );


    /*
     * Turn browser network offline.
     */
    try {

      await driver.setNetworkConditions({
        offline: true,
        latency: 0,
        download_throughput: 0,
        upload_throughput: 0
      });

    } catch (e) {

      throw new Skip(
        `This browser/driver cannot simulate offline mode (${e.message}).`
      );
    }


    try {

      await driver
        .findElement(
          By.xpath(SUBMIT_BUTTON)
        )
        .click();


      const title =
        await resultTitle(
          driver,
          15000
        );


      expect(
        title === "COULD NOT CHECK",
        `Expected COULD NOT CHECK when offline, got '${title}'.`
      );


      const panel =
        await driver
          .findElement(
            By.xpath(RESULT_PANEL)
          )
          .getText();


      expect(
        /not a result for the certificate/i.test(
          panel
        ),
        "Offline message should not treat the error as INVALID."
      );


    } finally {

      /*
       * Restore internet connection.
       */
      await driver.deleteNetworkConditions();
    }


    /*
     * Try again after connection is restored.
     */
    await driver
      .findElement(
        By.xpath(TRY_AGAIN)
      )
      .click();


    const retried =
      await resultTitle(
        driver,
        15000
      );


    expect(
      retried === "INVALID",
      `After Try again online, expected INVALID, got '${retried}'.`
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
      )

      .addArguments(
        "--use-fake-ui-for-media-stream"
      )

      .addArguments(
        "--use-fake-device-for-media-stream"
      );


  if (
    process.env.HEADLESS === "1"
  ) {

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

  const startedAt =
    new Date();


  const shotsDir =
    path.join(
      __dirname,
      "screenshots"
    );


  const reportsDir =
    path.join(
      __dirname,
      "reports"
    );


  fs.mkdirSync(
    shotsDir,
    {
      recursive: true
    }
  );


  fs.mkdirSync(
    reportsDir,
    {
      recursive: true
    }
  );


  console.log(
    "\n========================================"
  );

  console.log(
    " CERTIFICATE VERIFICATION E2E (Selenium)"
  );

  console.log(
    "========================================"
  );


  console.log(
    `Citizen creds : ${
      CITIZEN_EMAIL
        ? "provided"
        : "NOT provided"
    }`
  );


  console.log(
    `Signing secret: ${
      QR_SIGNING_SECRET
        ? "provided"
        : "NOT provided"
    }\n`
  );


  try {

    await openVerifyPage(
      driver
    );


    for (const c of cases) {

      try {

        await c.fn(
          driver
        );


        results.push({
          ...c,
          status: "PASS",
          note: ""
        });


        console.log(
          `PASSED  ${c.id} - ${c.title}`
        );


      } catch (error) {

        const isSkip =
          error instanceof Skip;


        results.push({
          ...c,

          status:
            isSkip
              ? "SKIP"
              : "FAIL",

          note:
            error.message
        });


        console.log(
          `${
            isSkip
              ? "SKIPPED"
              : "FAILED "
          } ${c.id} - ${c.title}`
        );


        console.log(
          `        ${error.message}`
        );


        if (!isSkip) {

          try {

            const png =
              await driver.takeScreenshot();


            fs.writeFileSync(
              path.join(
                shotsDir,
                `verify-${c.id}.png`
              ),

              png,

              "base64"
            );

          } catch {
            /*
             * Screenshot is best effort.
             */
          }
        }
      }
    }


  } finally {

    const count =
      (status) =>
        results.filter(
          (r) =>
            r.status === status
        ).length;


    console.log(
      "\n========================================"
    );


    console.log(
      ` Total ${results.length} | Passed ${count(
        "PASS"
      )} | Failed ${count(
        "FAIL"
      )} | Skipped ${count(
        "SKIP"
      )}`
    );


    console.log(
      "========================================\n"
    );


    /*
     * Generate Markdown report.
     */

    const stamp =
      startedAt
        .toISOString()
        .replace(
          /[:.]/g,
          "-"
        );


    const lines = [
      "# Certificate verification E2E (Selenium) - results",

      "",

      `Run: ${startedAt.toISOString()} | Frontend: ${BASE_URL} | API: ${API_URL}`,

      `Citizen credentials: ${
        CITIZEN_EMAIL
          ? "provided"
          : "not provided"
      } | Signing secret: ${
        QR_SIGNING_SECRET
          ? "provided"
          : "not provided"
      }`,

      "",

      `**Passed ${count(
        "PASS"
      )} / ${
        results.length
      }** (failed ${count(
        "FAIL"
      )}, skipped ${count(
        "SKIP"
      )})`,

      "",

      "| ID | Category | Test case | Result | Notes |",

      "|---|---|---|---|---|",

      `| SV-01 | Page Basics | ${results[0]?.title || ""} | ${results[0]?.status || ""} | ${(
        results[0]?.note || ""
      )
        .replace(/\|/g, "/")
        .replace(/\n/g, " ")} |`,

      `| SV-03 | Valid Certificate | ${results[1]?.title || ""} | ${results[1]?.status || ""} | ${(
        results[1]?.note || ""
      )
        .replace(/\|/g, "/")
        .replace(/\n/g, " ")} |`,

      `| SV-07 | Invalid / Tampered | ${results[2]?.title || ""} | ${results[2]?.status || ""} | ${(
        results[2]?.note || ""
      )
        .replace(/\|/g, "/")
        .replace(/\n/g, " ")} |`,

      `| SV-11 | Expired | ${results[3]?.title || ""} | ${results[3]?.status || ""} | ${(
        results[3]?.note || ""
      )
        .replace(/\|/g, "/")
        .replace(/\n/g, " ")} |`,

      `| SV-13 | Image Upload Edge Case | ${results[4]?.title || ""} | ${results[4]?.status || ""} | ${(
        results[4]?.note || ""
      )
        .replace(/\|/g, "/")
        .replace(/\n/g, " ")} |`,

      `| SV-15 | Network Failure | ${results[5]?.title || ""} | ${results[5]?.status || ""} | ${(
        results[5]?.note || ""
      )
        .replace(/\|/g, "/")
        .replace(/\n/g, " ")} |`,

      ""
    ];


    fs.writeFileSync(
      path.join(
        reportsDir,
        `certificate-verification-${stamp}.md`
      ),

      lines.join("\n")
    );


    if (
      count("FAIL")
    ) {

      process.exitCode = 1;
    }


    if (
      process.env.KEEP_OPEN !== "1"
    ) {

      await driver.quit();
    }
  }
}


/* =========================================================
   START
========================================================= */

main().catch(
  (error) => {

    console.error(
      "Certificate verification Selenium test could not run:",
      error.message || error
    );

    process.exitCode = 1;
  }
);