const test = require("node:test");
const assert = require("node:assert");

const BASE_URL = "http://localhost:5000/api";

// Put a valid clinic-admin token here for testing.
const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjZhYjJhODIwNmQ5NWQ1MDUzZmIxMzIzZCIsInJvbGUiOiJjbGluaWNBZG1pbiIsImNsaW5pY0lkIjoiNmFiMmE4MjE2ZDk1ZDUwNTNmYjEzMjNlIiwiaWF0IjoxNzkxMzAwNzc2LCJleHAiOjE3OTEzODcxNzZ9.1GV0XdZ_9LPtmsajyY6vzr_D6Wgr-xMsOngRZWnciyU";

// Use one of the feedback IDs from your database.
const FEEDBACK_ID = "6ac3f1dafc93d2423614c529";


async function apiRequest(url, options = {}) {
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}


// Test 1
test("Clinic staff can get feedback from their own clinic", async () => {
  const result = await apiRequest("/clinic-feedback", {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  assert.strictEqual(result.status, 200);

  assert.ok(
    Array.isArray(result.data.feedback),
    "Feedback should be returned as an array"
  );

  assert.ok(
    result.data.feedback.length > 0,
    "At least one feedback should exist"
  );

  for (const feedback of result.data.feedback) {
    assert.ok(
      feedback.clinicId,
      "Feedback should contain clinicId"
    );
  }
});


// Test 2
test("Clinic feedback summary returns average rating", async () => {
  const result = await apiRequest("/clinic-feedback/summary", {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  assert.strictEqual(result.status, 200);

  assert.ok(
    result.data.summary,
    "Summary should be returned"
  );

  assert.ok(
    typeof result.data.summary.total === "number",
    "Total should be a number"
  );

  assert.ok(
    typeof result.data.summary.averageRating === "number",
    "Average rating should be a number"
  );

  assert.ok(
    result.data.summary.averageRating >= 0 &&
    result.data.summary.averageRating <= 5,
    "Average rating should be between 0 and 5"
  );
});


// Test 3
test("Clinic staff can respond to feedback", async () => {
  const result = await apiRequest(
    `/clinic-feedback/${FEEDBACK_ID}/respond`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        message: "Unit test response",
      }),
    }
  );

  assert.ok(
    result.status === 200 || result.status === 201,
    `Expected success status but got ${result.status}`
  );

  assert.ok(
    result.data.message,
    "Response API should return a message"
  );
});


// Test 4
test("Clinic staff can edit their existing response", async () => {
  const result = await apiRequest(
    `/clinic-feedback/${FEEDBACK_ID}/respond`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        message: "Updated unit test response",
      }),
    }
  );

  assert.strictEqual(result.status, 200);

  assert.strictEqual(
    result.data.message,
    "Response updated successfully"
  );
});