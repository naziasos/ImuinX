/**
 * Shared helpers for the ImuniX Selenium end-to-end tests (test plan IDs TC-Sxx).
 *
 * Environment variables (all optional unless a test needs them):
 *   BASE_URL / API_URL            default http://localhost:5173 and http://localhost:5000/api
 *   HEADLESS=1                    run Chrome without a window
 *   Account logins live in config.js (environment variables override them).
 */
const { Builder, By, Key, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_URL = process.env.API_URL || "http://localhost:5000/api";
const TIMEOUT = 10000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const runId = new Date().toISOString().replace(/\D/g, "").slice(4, 14);
let counter = 0;
const uniqueEmail = (tag) => `selenium.${runId}.${tag}.${++counter}@test.com`;
const uniquePhone = () => `017${String(Date.now()).slice(-8)}`;

class Skip extends Error {}
const skip = (why) => { throw new Skip(why); };

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const config = require("./config");
function env(...names) {
  const out = names.map((n) => process.env[n] || config[n]);
  if (out.some((v) => !v)) skip(`fill in ${names.join(" and ")} in selenium/config.js`);
  return out;
}

async function buildDriver() {
  const options = new chrome.Options();
  if (process.env.HEADLESS === "1") options.addArguments("--headless=new");
  options.addArguments("--window-size=1400,1000", "--disable-gpu", "--no-sandbox");
  return new Builder().forBrowser("chrome").setChromeOptions(options).build();
}

async function poll(fn, what, timeout = TIMEOUT) {
  const end = Date.now() + timeout;
  let lastError;
  while (Date.now() < end) {
    try {
      const result = await fn();
      if (result) return result;
    } catch (e) { lastError = e; }
    await sleep(200);
  }
  throw new Error(`Timed out waiting for ${what}${lastError ? ` (${lastError.message})` : ""}`);
}

const bodyText = async (d) => (await d.findElement(By.css("body")).getText()).trim();
const waitForText = (d, text) =>
  poll(async () => (await bodyText(d)).toLowerCase().includes(text.toLowerCase()), `text "${text}"`);

// The app shows a start-up splash (.ix-loader) that blocks clicks; wait until it is gone.
async function waitForLoader(d) {
  await poll(async () => (await d.findElements(By.css(".ix-loader"))).length === 0, "start-up loader to finish", 30000);
}

// First *visible* element for an xpath (menus often exist twice: desktop + mobile).
async function findVisible(d, xpath) {
  await waitForLoader(d);
  return poll(async () => {
    for (const el of await d.findElements(By.xpath(xpath))) {
      if (await el.isDisplayed()) return el;
    }
    return null;
  }, `element ${xpath}`);
}

async function clickText(d, text) {
  const el = await findVisible(d,
    `//*[self::button or self::a][normalize-space()='${text}' or .//span[normalize-space()='${text}'] or contains(normalize-space(), '${text}')]`);
  await d.executeScript("arguments[0].scrollIntoView({block:'center'})", el);
  await el.click();
}

// React controlled inputs: select all + delete, then type.
async function typeInto(d, css, value) {
  const el = await d.wait(until.elementLocated(By.css(css)), TIMEOUT);
  const mod = process.platform === "darwin" ? Key.COMMAND : Key.CONTROL;
  await el.sendKeys(Key.chord(mod, "a"), Key.BACK_SPACE);
  await el.sendKeys(value);
}

const getToken = (d) => d.executeScript("return localStorage.getItem('token');");
const getUser = async (d) => JSON.parse((await d.executeScript("return localStorage.getItem('user');")) || "null");

async function openLogin(d) {
  await d.get(BASE_URL);
  const login = await findVisible(d, "//nav//button[normalize-space()='Login']");
  await login.click();
  await d.wait(until.elementLocated(By.css("#login-email")), TIMEOUT);
}

async function login(d, email, password) {
  await openLogin(d);
  await typeInto(d, "#login-email", email);
  await typeInto(d, "#login-password", password);
  await clickText(d, "Sign in");
  await poll(() => getToken(d), "login token in localStorage");
}

async function logout(d) {
  const btn = await findVisible(d, "//button[normalize-space()='Log out' or normalize-space()='Logout']");
  await btn.click();
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) { /* no body */ }
  return { status: res.status, json };
}

// Runs each case with a fresh browser and prints a PASS / FAIL / SKIP report.
async function runSuite(title, cases) {
  const only = process.env.ONLY;
  const results = [];
  console.log(`\n=== ${title} ===`);
  for (const [id, name, fn] of cases) {
    if (only && only !== id) continue;
    let driver;
    try {
      driver = await buildDriver();
      await fn(driver);
      results.push([id, "PASS"]);
      console.log(`PASS  ${id}  ${name}`);
    } catch (e) {
      if (e instanceof Skip) {
        results.push([id, "SKIP"]);
        console.log(`SKIP  ${id}  ${name}  -> ${e.message}`);
      } else {
        results.push([id, "FAIL"]);
        console.log(`FAIL  ${id}  ${name}\n      ${e.message}`);
        try { await require("fs").promises.writeFile(`${id}-failure.png`, await driver.takeScreenshot(), "base64"); } catch (_) {}
      }
    } finally {
      if (driver && process.env.KEEP_OPEN !== "1") await driver.quit();
    }
  }
  const n = (s) => results.filter((r) => r[1] === s).length;
  console.log(`\nResult: ${n("PASS")} passed, ${n("FAIL")} failed, ${n("SKIP")} skipped`);
  process.exitCode = n("FAIL") ? 1 : 0;
}

module.exports = { By, until, BASE_URL, API_URL, TIMEOUT, sleep, uniqueEmail, uniquePhone, runId, expect, env, skip,
  buildDriver, poll, waitForLoader, bodyText, waitForText, findVisible, clickText, typeInto, getToken, getUser, openLogin, login, logout, api, runSuite };