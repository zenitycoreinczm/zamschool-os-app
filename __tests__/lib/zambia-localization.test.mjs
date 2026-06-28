import test from "node:test";
import assert from "node:assert/strict";

import {
  isValidZambianPhone,
  normalizeZambianPhone,
  formatKwacha,
  getECZGrade,
} from "../../lib/zambia-localization.ts";

test("isValidZambianPhone validates Airtel, MTN, and Zamtel numbers", () => {
  assert.equal(isValidZambianPhone("+260971234567"), true);
  assert.equal(isValidZambianPhone("0961234567"), true);
  assert.equal(isValidZambianPhone("0751234567"), true);
  assert.equal(isValidZambianPhone("123456"), false);
  assert.equal(isValidZambianPhone(null), false);
});

test("normalizeZambianPhone converts local numbers to +260 format", () => {
  assert.equal(normalizeZambianPhone("0971234567"), "+260971234567");
  assert.equal(normalizeZambianPhone("+260961234567"), "+260961234567");
  assert.equal(normalizeZambianPhone("invalid"), null);
});

test("formatKwacha formats currency to ZMW with 2 decimal places", () => {
  assert.equal(formatKwacha(1500), "ZMW 1,500.00");
  assert.equal(formatKwacha(250.5, { symbol: "K" }), "K250.50");
});

test("getECZGrade resolves exam marks to ECZ standards", () => {
  assert.equal(getECZGrade(80).grade, "One");
  assert.equal(getECZGrade(80).label, "Distinction");
  assert.equal(getECZGrade(52).grade, "Six");
  assert.equal(getECZGrade(52).label, "Credit");
  assert.equal(getECZGrade(20).grade, "Nine");
});
