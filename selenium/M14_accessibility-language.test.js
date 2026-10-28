
const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const TIMEOUT = 20000;

let driver;
let passed = 0;
let failed = 0;

// ==========================================
// HELPER: ASSERTION
// ==========================================
function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

// ==========================================
// HELPER: RUN TEST CASE
// ==========================================
async function testCase(id, description, callback) {
  try {
    await callback();
    passed++;
    console.log(`PASS ${id}: ${description}`);
  } catch (error) {
    failed++;
    console.error(`FAIL ${id}: ${description}`);
    console.error(error.message);
  }
}

// ==========================================
// HELPER: FIND VISIBLE ELEMENT
// ==========================================
async function visibleElement(locator) {
  const elements = await driver.findElements(locator);

  for (const element of elements) {
    if (await element.isDisplayed()) {
      return element;
    }
  }

  throw new Error(`Visible element not found: ${locator}`);
}

// ==========================================
// HELPER: WAIT FOR SPLASH SCREEN
// ==========================================
async function waitForSplashToDisappear() {
  await driver.wait(async () => {
    const loaders = await driver.findElements(
      By.css(".ix-loader__glow")
    );

    for (const loader of loaders) {
      if (await loader.isDisplayed()) {
        return false;
      }
    }

    return true;
  }, TIMEOUT);
}

// ==========================================
// HELPER: OPEN LOGIN PAGE
// ==========================================
async function openReadAloudControls() {
  await waitForSplashToDisappear();

  const loginButton = await visibleElement(
    By.xpath("//button[normalize-space()='Login']")
  );

  await loginButton.click();

  await driver.wait(
    until.elementLocated(
      By.css('section[aria-label="Read aloud controls"]')
    ),
    TIMEOUT
  );

  await visibleElement(
    By.css('section[aria-label="Read aloud controls"]')
  );
}

// ==========================================
// HELPER: GET SELECTED VALUE
// ==========================================
async function getElementValue(element) {
  return await driver.executeScript(
    "return arguments[0].value;",
    element
  );
}

// ==========================================
// MAIN TEST RUNNER
// ==========================================
async function runTests() {
  try {
    const options = new chrome.Options().addArguments(
      "--window-size=1440,1000"
    );

    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    await driver.get(BASE_URL);

    await driver.wait(
      until.elementLocated(By.css("nav")),
      TIMEOUT
    );

    // ==========================================
    // TC-S34: READ ALOUD, STOP AND SPEED
    // ==========================================
    await testCase(
      "TC-S34",
      "Read aloud play, stop and speed work",
      async () => {
        await openReadAloudControls();

        // Install a speech mock AFTER the controls are visible.
        // This avoids relying on the browser's actual audio voice.
        await driver.executeScript(`
          window.__speechCalls = [];

          window.SpeechSynthesisUtterance = function(text) {
            this.text = text;
            this.rate = 1;
            this.lang = "en-US";
            this.voice = null;
            this.onstart = null;
            this.onend = null;
            this.onerror = null;
          };

          const mockVoice = {
            name: "Test English Voice",
            lang: "en-US",
            default: true
          };

          const mockSpeechSynthesis = {
            speaking: false,
            pending: false,
            paused: false,

            getVoices: function() {
              return [mockVoice];
            },

            addEventListener: function() {},
            removeEventListener: function() {},

            cancel: function() {
              this.speaking = false;
              this.pending = false;
            },

            speak: function(utterance) {
              window.__speechCalls.push({
                text: utterance.text,
                rate: utterance.rate,
                lang: utterance.lang
              });

              this.speaking = true;

              if (typeof utterance.onstart === "function") {
                utterance.onstart();
              }
            }
          };

          Object.defineProperty(window, "speechSynthesis", {
            configurable: true,
            writable: true,
            value: mockSpeechSynthesis
          });
        `);

        // Read aloud button
        const readButton = await visibleElement(
          By.xpath(
            "//section[@aria-label='Read aloud controls']//button[normalize-space()='Read aloud']"
          )
        );

        expect(
          await readButton.isEnabled(),
          "Read aloud button is disabled."
        );

        await readButton.click();

        // Wait for speech call
        await driver.wait(async () => {
          return await driver.executeScript(`
            return Array.isArray(window.__speechCalls) &&
                   window.__speechCalls.length > 0;
          `);
        }, TIMEOUT, "Speech synthesis was not called.");

        const calls = await driver.executeScript(
          "return window.__speechCalls"
        );

        expect(
          calls.length > 0,
          "No speech call was recorded."
        );

        console.log("  Speech call recorded:", calls.length);

        // Change speech speed
        const speedSelect = await visibleElement(
          By.xpath(
            "//section[@aria-label='Read aloud controls']//select[option[@value='1.25']]"
          )
        );

        await speedSelect.sendKeys("1.25");

        const selectedSpeed = await getElementValue(speedSelect);

        expect(
          selectedSpeed === "1.25",
          `Expected speed 1.25, received ${selectedSpeed}`
        );

        // Verify saved speed
        const savedSpeed = await driver.executeScript(
          "return localStorage.getItem('imunix-tts-speed')"
        );

        expect(
          savedSpeed === "1.25",
          `Expected saved speed 1.25, received ${savedSpeed}`
        );

        // Stop speech
        const stopButton = await visibleElement(
          By.xpath(
            "//section[@aria-label='Read aloud controls']//button[normalize-space()='Stop']"
          )
        );

        expect(
          await stopButton.isEnabled(),
          "Stop button is disabled."
        );

        await stopButton.click();

        // Verify Stop calls cancel()
        await driver.wait(async () => {
          return await driver.executeScript(`
            return window.speechSynthesis.speaking === false;
          `);
        }, TIMEOUT, "Stop did not cancel speech.");

        console.log("  Selected speed:", selectedSpeed);
        console.log("  Saved speed:", savedSpeed);
      }
    );

    // ==========================================
    // TC-S35: UNSUPPORTED BROWSER MESSAGE
    // ==========================================
    await testCase(
      "TC-S35",
      "Unsupported speech browser shows a clear message",
      async () => {
        // Remove speech APIs before loading the next document.
        await driver.sendDevToolsCommand(
          "Page.addScriptToEvaluateOnNewDocument",
          {
            source: `
              try {
                delete window.speechSynthesis;
              } catch (error) {}

              try {
                delete window.SpeechSynthesisUtterance;
              } catch (error) {}
            `
          }
        );

        await driver.navigate().refresh();

        await driver.wait(
          until.elementLocated(By.css("nav")),
          TIMEOUT
        );

        const apiRemoved = await driver.executeScript(
          'return !("speechSynthesis" in window)'
        );

        expect(
          apiRemoved,
          "Chrome did not allow the speech API to be removed for this test."
        );

        await openReadAloudControls();

        const status = await driver.wait(
          until.elementLocated(By.css('[role="status"]')),
          TIMEOUT
        );

        await driver.wait(
          until.elementIsVisible(status),
          TIMEOUT
        );

        const message = await status.getText();

        expect(
          message.includes(
            "Text-to-Speech is not supported by this browser."
          ),
          `Unexpected message: ${message}`
        );

        const pageText = await driver
          .findElement(By.css("body"))
          .getText();

        expect(
          pageText.length > 0,
          "Page became blank."
        );

        console.log("  Unsupported-browser message:", message);
      }
    );

    // ==========================================
    // TC-S36: BANGLA LANGUAGE PERSISTENCE
    // ==========================================
    await testCase(
      "TC-S36",
      "Bangla language choice persists after refresh",
      async () => {
        await driver.executeScript(`
          localStorage.setItem("imunixLanguage", "en");
        `);

        await driver.navigate().refresh();

        await driver.wait(
          until.elementLocated(By.css("nav")),
          TIMEOUT
        );

        await waitForSplashToDisappear();

        const banglaButton = await visibleElement(
          By.xpath("//button[normalize-space()='বাংলা']")
        );

        await banglaButton.click();

        await driver.wait(async () => {
          const result = await driver.executeScript(`
            return {
              htmlLanguage: document.documentElement.lang,
              savedLanguage: localStorage.getItem("imunixLanguage")
            };
          `);

          return (
            result.htmlLanguage === "bn" &&
            result.savedLanguage === "bn"
          );
        }, TIMEOUT, "Bangla language selection was not saved.");

        // Refresh and verify persistence
        await driver.navigate().refresh();

        await driver.wait(
          until.elementLocated(By.css("nav")),
          TIMEOUT
        );

        await driver.wait(async () => {
          return await driver.executeScript(`
            return (
              document.documentElement.lang === "bn" &&
              localStorage.getItem("imunixLanguage") === "bn"
            );
          `);
        }, TIMEOUT, "Bangla language did not persist after refresh.");

        const result = await driver.executeScript(`
          return {
            htmlLanguage: document.documentElement.lang,
            savedLanguage: localStorage.getItem("imunixLanguage")
          };
        `);

        expect(
          result.htmlLanguage === "bn",
          `Expected HTML lang=bn, received ${result.htmlLanguage}`
        );

        expect(
          result.savedLanguage === "bn",
          `Expected saved language bn, received ${result.savedLanguage}`
        );

        console.log("  HTML language:", result.htmlLanguage);
        console.log("  Saved language:", result.savedLanguage);
      }
    );
  } catch (error) {
    failed++;
    console.error("M14 setup error:", error.message);
  } finally {
    if (driver) {
      await driver.quit();
    }

    console.log("\n========== M14 TEST SUMMARY ==========");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log("======================================");

    if (failed > 0) {
      process.exitCode = 1;
    }
  }
}

runTests();
