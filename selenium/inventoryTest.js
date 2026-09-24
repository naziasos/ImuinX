const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = "http://localhost:5173";
const API_URL = "http://localhost:5000/api";

const TEST_EMAIL = "23201030@uap-bd.edu";
const TEST_PASSWORD ="nurjahan@123";

const TIMEOUT = 10000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function iso(daysFromToday) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);

  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return `${d.getFullYear()}-${mm}-${dd}`;
}

const FAR = iso(365);   // outside 30-day window
const NEAR = iso(10);   // inside 30-day window
const PAST = iso(-5);   // past date

const runId = new Date()
  .toISOString()
  .replace(/\D/g, "")
  .slice(4, 14);

let counter = 0;

const newBatch = (tag) =>
  `SEL-${runId}-${tag}-${++counter}`.toUpperCase();

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}


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


const hasLowStock = (flags) =>
  flags.some((f) => /low/i.test(f));

const hasNearExpiry = (flags) =>
  flags.some((f) => /expiring soon|near/i.test(f));


const NAV_LOGIN =
  "//nav//button[normalize-space()='Login']";

const DASH_HEADING =
  "//h1[normalize-space()='Clinic Admin Dashboard']";

const INVENTORY_NAV =
  "//button[contains(@class,'clinic-nav-item')][contains(normalize-space(),'Inventory')]";

const INV_HEADING =
  "//h1[normalize-space()='Vaccine Inventory']";

const LOADING =
  "//*[normalize-space()='Loading inventory...']";

const BTN_ADD =
  "//button[normalize-space()='Add Vaccine Batch']";

const BTN_UPDATE =
  "//button[normalize-space()='Update Stock']";

const BTN_CANCEL =
  "//button[normalize-space()='Cancel']";

const SUCCESS =
  "//div[contains(@class,'bg-emerald-50')][contains(.,'✓')]";

const ERROR =
  "//div[contains(@class,'bg-red-50')][contains(.,'⚠')]";

const rowXp = (batch) =>
  `//tbody/tr[td[2][normalize-space()='${batch}']]`;

async function loginAndOpenInventory(driver) {
  await driver.get(BASE_URL);

 
  const loginBtn = await driver.wait(
    until.elementLocated(By.xpath(NAV_LOGIN)),
    20000
  );

  await loginBtn.click();

  // Login form
  const emailField = await driver.wait(
    until.elementLocated(By.name("email")),
    TIMEOUT
  );

  await emailField.sendKeys(TEST_EMAIL);

  await driver
    .findElement(By.name("password"))
    .sendKeys(TEST_PASSWORD);

  await driver
    .findElement(By.css("button[type='submit']"))
    .click();

  // Check dashboard
  try {
    await driver.wait(
      until.elementLocated(By.xpath(DASH_HEADING)),
      15000
    );
  } catch (e) {
    let msg = "";

    try {
      msg = await driver
        .findElement(
          By.xpath("//form/following-sibling::p[1]")
        )
        .getText();
    } catch (_) {}

    throw new Error(
      `Login failed - app message: "${msg}". Check TEST_EMAIL / TEST_PASSWORD.`
    );
  }

  // Open Inventory
  const inventoryBtn = await driver.wait(
    until.elementLocated(By.xpath(INVENTORY_NAV)),
    TIMEOUT
  );

  await inventoryBtn.click();

  await waitInventoryLoaded(driver);
}

async function waitInventoryLoaded(driver) {
  await driver.wait(
    until.elementLocated(By.xpath(INV_HEADING)),
    15000
  );

  await poll(
    async () =>
      (await driver.findElements(By.xpath(LOADING))).length === 0,
    15000,
    "inventory to finish loading"
  );
}

async function summary(driver, label) {
  const xp =
    `//p[normalize-space()='${label}']/following-sibling::p[1]`;

  const found = await poll(
    async () => {
      const n = parseInt(
        await driver.findElement(By.xpath(xp)).getText(),
        10
      );

      return Number.isNaN(n) ? null : { n };
    },
    TIMEOUT,
    `summary card '${label}'`
  );

  return found.n;
}

async function waitSummary(driver, label, expected) {
  await poll(
    async () =>
      (await summary(driver, label)) === expected,
    TIMEOUT,
    `'${label}' card to become ${expected}`
  );
}


async function formTitle(driver) {
  const xp =
    "//h2[contains(.,'Add New Vaccine Batch') or contains(.,'Update Vaccine Stock')]";

  return (
    await driver.findElement(By.xpath(xp)).getText()
  ).trim();
}

async function setInput(driver, name, value) {
  const el = await driver.findElement(By.name(name));

  await driver.executeScript(
    `
      const el = arguments[0];
      const val = String(arguments[1]);

      const setter =
        Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          'value'
        ).set;

      setter.call(el, val);

      el.dispatchEvent(
        new Event('input', { bubbles: true })
      );
    `,
    el,
    value
  );
}
async function fillForm(
  driver,
  { type, batch, qty, expiry }
) {
  if (type !== undefined) {
    await driver
      .findElement(
        By.css(
          `select[name='vaccineType'] option[value='${type}']`
        )
      )
      .click();
  }

  if (batch !== undefined) {
    await setInput(driver, "batchNumber", batch);
  }

  if (qty !== undefined) {
    await setInput(driver, "quantity", qty);
  }

  if (expiry !== undefined) {
    await setInput(driver, "expiryDate", expiry);
  }
}


async function addBatch(
  driver,
  type,
  batch,
  qty,
  expiry
) {
  await fillForm(driver, {
    type,
    batch,
    qty,
    expiry,
  });

  await driver
    .findElement(By.xpath(BTN_ADD))
    .click();
}

async function readRow(driver, batch) {
  const row = await driver.findElement(
    By.xpath(rowXp(batch))
  );

  const tds = await row.findElements(By.css("td"));

  if (tds.length < 5) {
    return null;
  }

  const flags = [];

  for (
    const s of await tds[4].findElements(By.css("span"))
  ) {
    const t = (await s.getText()).trim();

    if (t) {
      flags.push(t);
    }
  }

  return {
    vaccine: (
      await tds[0].getText()
    ).trim(),

    quantity: parseInt(
      (await tds[2].getText()).trim(),
      10
    ),

    flags,
  };
}

const rowData = (driver, batch) =>
  poll(
    () => readRow(driver, batch),
    TIMEOUT,
    `table row for batch ${batch}`
  );

const hasRow = async (driver, batch) =>
  (await driver.findElements(
    By.xpath(rowXp(batch))
  )).length > 0;

async function waitQuantity(
  driver,
  batch,
  qty
) {
  await poll(
    async () =>
      (await readRow(driver, batch)).quantity === qty,
    TIMEOUT,
    `batch ${batch} quantity to be ${qty}`
  );
}


async function waitFlags(
  driver,
  batch,
  predicate,
  timeout = 5000
) {
  const end = Date.now() + timeout;

  let flags = [];

  while (Date.now() < end) {
    try {
      flags = (
        await readRow(driver, batch)
      ).flags;

      if (predicate(flags)) {
        return flags;
      }
    } catch (_) {}

    await sleep(250);
  }

  return flags;
}


async function clickEdit(driver, batch) {
  await poll(
    async () => {
      const row = await driver.findElement(
        By.xpath(rowXp(batch))
      );

      await row
        .findElement(
          By.xpath(
            ".//button[normalize-space()='Edit Stock']"
          )
        )
        .click();

      return true;
    },
    TIMEOUT,
    `'Edit Stock' button for ${batch}`
  );

  await driver.wait(
    until.elementLocated(By.xpath(BTN_UPDATE)),
    TIMEOUT
  );
}

async function saveUpdate(
  driver,
  { qty, expiry }
) {
  await fillForm(driver, {
    qty,
    expiry,
  });

  await driver
    .findElement(By.xpath(BTN_UPDATE))
    .click();
}


async function updateStock(
  driver,
  batch,
  opts
) {
  await clickEdit(driver, batch);

  await saveUpdate(driver, opts);
}


async function cancelEditIfOpen(driver) {
  const btns = await driver.findElements(
    By.xpath(BTN_CANCEL)
  );

  if (btns.length) {
    await btns[0].click();

    await driver.wait(
      until.elementLocated(By.xpath(BTN_ADD)),
      TIMEOUT
    );
  }
}


async function messageText(driver, xpath) {
  return poll(
    async () => {
      const el = await driver.findElement(
        By.xpath(xpath)
      );

      return (await el.isDisplayed())
        ? (await el.getText())
            .replace(/[✓⚠]/g, "")
            .trim()
        : null;
    },
    TIMEOUT,
    "alert message"
  );
}

const successMessage = (d) =>
  messageText(d, SUCCESS);

const errorMessage = (d) =>
  messageText(d, ERROR);


const getField = (driver, name) =>
  driver
    .findElement(By.name(name))
    .getAttribute("value");

const isDisabled = async (driver, name) =>
  !(await driver
    .findElement(By.name(name))
    .isEnabled());

async function apiItem(driver, batch) {
  const token = await driver.executeScript(
    "return localStorage.getItem('token');"
  );

  const res = await fetch(
    `${API_URL}/vaccine-inventory/my-clinic`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  expect(
    res.ok,
    `API my-clinic failed with status ${res.status}`
  );

  const data = await res.json();

  const item = data.inventory.find(
    (i) => i.batchNumber === batch
  );

  expect(
    item,
    `Batch ${batch} not returned by API`
  );

  return item;
}

const cases = [];

const tc = (id, title, fn, defect) =>
  cases.push({
    id,
    title,
    fn,
    defect,
  });

tc(
  "TC-01",
  "Login and open inventory page",
  async (d) => {
    expect(
      (await formTitle(d)) ===
        "Add New Vaccine Batch",
      "Form title should be 'Add New Vaccine Batch'"
    );

    for (
      const label of [
        "Total Batches",
        "Total Stock",
        "Expiring Soon",
      ]
    ) {
      expect(
        (await summary(d, label)) >= 0,
        `Summary card '${label}' missing`
      );
    }
  }
);


tc(
  "TC-02",
  "Add batch appears in inventory table",
  async (d) => {
    const batch = newBatch("ADD");

    const batchesBefore =
      await summary(d, "Total Batches");

    const stockBefore =
      await summary(d, "Total Stock");

    await addBatch(
      d,
      "BCG",
      batch,
      100,
      FAR
    );

    expect(
      (
        await successMessage(d)
      )
        .toLowerCase()
        .includes("created successfully"),
      "No 'created successfully' message"
    );

    const row = await rowData(d, batch);

    expect(
      row.vaccine === "BCG",
      `Vaccine should be BCG, got ${row.vaccine}`
    );

    expect(
      row.quantity === 100,
      `Quantity should be 100, got ${row.quantity}`
    );

    expect(
      row.flags.includes("Active"),
      `Healthy batch should be 'Active', got [${row.flags}]`
    );

    expect(
      !hasLowStock(row.flags),
      "Healthy batch must not show low-stock flag"
    );

    expect(
      !hasNearExpiry(row.flags),
      "Healthy batch must not show near-expiry flag"
    );

    await waitSummary(
      d,
      "Total Batches",
      batchesBefore + 1
    );

    await waitSummary(
      d,
      "Total Stock",
      stockBefore + 100
    );
  }
);

tc(
  "TC-03",
  "Update quantity",
  async (d) => {
    const batch = newBatch("QTY");

    await addBatch(
      d,
      "OPV",
      batch,
      100,
      FAR
    );

    await waitQuantity(
      d,
      batch,
      100
    );

    const stockBefore =
      await summary(d, "Total Stock");

    await clickEdit(d, batch);

    expect(
      (await formTitle(d)) ===
        "Update Vaccine Stock",
      "Form should switch to 'Update Vaccine Stock'"
    );

    expect(
      (await getField(d, "quantity")) ===
        "100",
      "Edit form should be pre-filled with quantity 100"
    );

    expect(
      (await getField(d, "expiryDate")) ===
        FAR,
      "Edit form should be pre-filled with current expiry"
    );

    expect(
      (await isDisabled(d, "vaccineType")) &&
        (await isDisabled(d, "batchNumber")),
      "Vaccine type and batch number must be read-only while editing"
    );

    await saveUpdate(d, {
      qty: 60,
    });

    expect(
      (
        await successMessage(d)
      )
        .toLowerCase()
        .includes("updated successfully"),
      "No 'updated successfully' message"
    );

    await waitQuantity(
      d,
      batch,
      60
    );

    await waitSummary(
      d,
      "Total Stock",
      stockBefore - 40
    );

    expect(
      (await formTitle(d)) ===
        "Add New Vaccine Batch",
      "Form should return to 'add' mode after saving"
    );
  }
);


tc(
  "TC-04",
  "Near-expiry flag appears",
  async (d) => {
    const batch = newBatch("EXP");

    const expiringBefore =
      await summary(d, "Expiring Soon");

    await addBatch(
      d,
      "MR",
      batch,
      50,
      NEAR
    );

    await waitQuantity(
      d,
      batch,
      50
    );

    // Backend check
    const api = await apiItem(
      d,
      batch
    );

    expect(
      api.nearExpiry === true,
      "API: nearExpiry should be true"
    );

    expect(
      api.lowStock === false,
      "API: lowStock should be false"
    );

    expect(
      api.daysUntilExpiry >= 0 &&
        api.daysUntilExpiry <= 30,
      `API: daysUntilExpiry=${api.daysUntilExpiry}`
    );

    // UI check
    const flags = await waitFlags(
      d,
      batch,
      hasNearExpiry
    );

    expect(
      hasNearExpiry(flags),
      `'Expiring Soon' flag not shown in UI. Flags seen: [${flags}]`
    );

    expect(
      !hasLowStock(flags),
      `Unexpected low-stock flag. Flags seen: [${flags}]`
    );

    await waitSummary(
      d,
      "Expiring Soon",
      expiringBefore + 1
    );
  }
);


tc(
  "TC-05",
  "Low-stock flag appears",
  async (d) => {
    const batch = newBatch("LOW");

    await addBatch(
      d,
      "PCV",
      batch,
      5,
      FAR
    );

    await waitQuantity(
      d,
      batch,
      5
    );

    // Backend check
    const api = await apiItem(
      d,
      batch
    );

    expect(
      api.lowStock === true,
      "API: lowStock should be true"
    );

    expect(
      api.nearExpiry === false,
      "API: nearExpiry should be false"
    );

    // UI check
    const flags = await waitFlags(
      d,
      batch,
      hasLowStock
    );

    expect(
      hasLowStock(flags),
      `Low-stock flag not shown in UI. Flags seen: [${flags}]`
    );

    expect(
      !hasNearExpiry(flags),
      `Unexpected near-expiry flag. Flags seen: [${flags}]`
    );
  },
  "BUG-01"
);


tc(
  "TC-06",
  "Full flow: add -> view -> update qty -> flags appear/clear",
  async (d) => {
    const batch = newBatch("E2E");

    const problems = [];

    // Step 1 - Add healthy batch
    await addBatch(
      d,
      "Pentavalent",
      batch,
      100,
      FAR
    );

    expect(
      (
        await successMessage(d)
      )
        .toLowerCase()
        .includes("created successfully"),
      "Step 1: no 'created successfully' message"
    );

    let row = await rowData(
      d,
      batch
    );

    expect(
      row.quantity === 100,
      `Step 1: quantity should be 100, got ${row.quantity}`
    );

    if (
      row.flags.length !== 1 ||
      row.flags[0] !== "Active"
    ) {
      problems.push(
        `Step 1: new healthy batch should only show 'Active', got [${row.flags}]`
      );
    }

    // Step 2 - Reduce quantity to 5
    await updateStock(
      d,
      batch,
      {
        qty: 5,
      }
    );

    expect(
      (
        await successMessage(d)
      )
        .toLowerCase()
        .includes("updated successfully"),
      "Step 2: no 'updated successfully' message"
    );

    await waitQuantity(
      d,
      batch,
      5
    );

    if (
      (await apiItem(d, batch))
        .lowStock !== true
    ) {
      problems.push(
        "Step 2: API did not report lowStock=true for quantity 5"
      );
    }

    let flags = await waitFlags(
      d,
      batch,
      hasLowStock
    );

    if (!hasLowStock(flags)) {
      problems.push(
        `Step 2: low-stock flag missing in UI after quantity -> 5. Flags: [${flags}]`
      );
    }

    // Step 3 - Expiry inside 30 days
    const expiringBefore =
      await summary(
        d,
        "Expiring Soon"
      );

    await updateStock(
      d,
      batch,
      {
        expiry: NEAR,
      }
    );

    await waitSummary(
      d,
      "Expiring Soon",
      expiringBefore + 1
    );

    if (
      (await apiItem(d, batch))
        .nearExpiry !== true
    ) {
      problems.push(
        "Step 3: API did not report nearExpiry=true"
      );
    }

    flags = await waitFlags(
      d,
      batch,
      hasNearExpiry
    );

    if (!hasNearExpiry(flags)) {
      problems.push(
        `Step 3: 'Expiring Soon' flag missing in UI. Flags: [${flags}]`
      );
    }

    if (!hasLowStock(flags)) {
      problems.push(
        `Step 3: low-stock flag should still be present. Flags: [${flags}]`
      );
    }

    // Step 4 - Restock to 50
    await updateStock(
      d,
      batch,
      {
        qty: 50,
      }
    );

    await waitQuantity(
      d,
      batch,
      50
    );

    if (
      (await apiItem(d, batch))
        .lowStock !== false
    ) {
      problems.push(
        "Step 4: API still reports lowStock=true after restock to 50"
      );
    }

    flags = (
      await rowData(d, batch)
    ).flags;

    if (hasLowStock(flags)) {
      problems.push(
        `Step 4: low-stock flag did not clear after restock. Flags: [${flags}]`
      );
    }

    if (!hasNearExpiry(flags)) {
      problems.push(
        `Step 4: near-expiry flag disappeared unexpectedly. Flags: [${flags}]`
      );
    }

    expect(
      problems.length === 0,
      `Full-flow deviations:\n- ${problems.join(
        "\n- "
      )}`
    );
  },
  "BUG-01"
);

for (
  const [
    id,
    qty,
    expectLow,
  ] of [
    ["TC-07a", 0, true],
    ["TC-07b", 10, true],
    ["TC-07c", 11, false],
  ]
) {
  tc(
    id,
    `Low-stock boundary, quantity ${qty} -> ${
      expectLow
        ? "flagged"
        : "not flagged"
    }`,
    async (d) => {
      const batch = newBatch(
        `B${qty}`
      );

      await addBatch(
        d,
        "COVID-19",
        batch,
        qty,
        FAR
      );

      await waitQuantity(
        d,
        batch,
        qty
      );

      expect(
        (await apiItem(d, batch))
          .lowStock === expectLow,
        `API: lowStock should be ${expectLow} for quantity ${qty}`
      );

      const flags = (
        await rowData(d, batch)
      ).flags;

      expect(
        hasLowStock(flags) ===
          expectLow,
        `quantity=${qty}: expected low-stock flag=${expectLow}, UI flags: [${flags}]`
      );
    },
    expectLow ? "BUG-01" : undefined
  );
}

tc(
  "TC-08",
  "Duplicate batch number rejected",
  async (d) => {
    const batch = newBatch("DUP");

    await addBatch(
      d,
      "BCG",
      batch,
      20,
      FAR
    );

    await waitQuantity(
      d,
      batch,
      20
    );

    const batchesBefore =
      await summary(
        d,
        "Total Batches"
      );

    // Try duplicate
    await addBatch(
      d,
      "BCG",
      batch,
      30,
      FAR
    );

    expect(
      (
        await errorMessage(d)
      )
        .toLowerCase()
        .includes("already exists"),
      "Expected 'Batch number already exists' error"
    );

    expect(
      (await summary(
        d,
        "Total Batches"
      )) === batchesBefore,
      "Total Batches must not change"
    );

    expect(
      (await rowData(d, batch))
        .quantity === 20,
      "Original batch must be unchanged"
    );
  }
);

tc(
  "TC-09",
  "Past expiry date rejected",
  async (d) => {
    const batch = newBatch("PAST");

    const batchesBefore =
      await summary(
        d,
        "Total Batches"
      );

    await addBatch(
      d,
      "BCG",
      batch,
      20,
      PAST
    );

    expect(
      (
        await errorMessage(d)
      )
        .toLowerCase()
        .includes("past"),
      "Expected 'Expiry date cannot be in the past' error"
    );

    expect(
      !(await hasRow(d, batch)),
      "Batch with past expiry must not be created"
    );

    expect(
      (await summary(
        d,
        "Total Batches"
      )) === batchesBefore,
      "Total Batches must not change"
    );
  }
);


async function inventoryFlowTest() {
  const options =
    new chrome.Options().addArguments(
      "--window-size=1440,1000"
    );

  if (process.env.HEADLESS === "1") {
    options.addArguments(
      "--headless=new"
    );
  }

  // Open Chrome
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
      "   INVENTORY SELENIUM FUNCTIONAL TEST"
    );
    console.log(
      "========================================"
    );
    console.log("");

    console.log(
      "Opening application..."
    );

    // Login and inventory
    await loginAndOpenInventory(
      driver
    );

    console.log(
      "Login successful."
    );

    console.log(
      "Inventory page opened."
    );

    console.log("");
    console.log(
      "Running test cases..."
    );
    console.log("");

    // Run all test cases
    for (const c of cases) {
      try {
        await cancelEditIfOpen(
          driver
        );

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

    // Final result
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
      "Inventory test could not run!"
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

inventoryFlowTest();