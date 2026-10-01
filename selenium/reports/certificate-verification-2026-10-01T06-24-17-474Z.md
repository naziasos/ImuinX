# Certificate verification E2E (Selenium) - results

Run: 2026-10-01T06:24:17.474Z | Frontend: http://localhost:5173 | API: http://localhost:5000/api
Citizen credentials: provided | Signing secret: provided

**Passed 6 / 6** (failed 0, skipped 0)

| ID | Category | Test case | Result | Notes |
|---|---|---|---|---|
| SV-01 | Page Basics | Verify page opens from navbar without login and shows the 3 input modes | PASS |  |
| SV-03 | Valid Certificate | VALID: genuine certificate code shows VALID | PASS |  |
| SV-07 | Invalid / Tampered | TAMPERED: changed signature character gives INVALID | PASS |  |
| SV-11 | Expired | EXPIRED: properly signed expired token gives INVALID | PASS |  |
| SV-13 | Image Upload Edge Case | Upload image without QR code shows No QR code found | PASS |  |
| SV-15 | Network Failure | Server unreachable gives COULD NOT CHECK and Try again works | PASS |  |
