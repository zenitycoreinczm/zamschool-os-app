/**
 * Optional k6 smoke script.
 * Usage: k6 run -e BASE_URL=http://127.0.0.1:3000 scripts/load-test/k6/smoke.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 5,
  duration: "15s",
  thresholds: {
    http_req_duration: ["p(95)<800"],
    http_req_failed: ["rate<0.02"],
  },
};

const baseUrl = __ENV.BASE_URL || "http://127.0.0.1:3000";

export default function smokeScenario() {
  const health = http.get(`${baseUrl}/api/health`);
  check(health, { "health status 200": (r) => r.status === 200 });

  const login = http.get(`${baseUrl}/login`);
  check(login, { "login status 200": (r) => r.status === 200 });

  sleep(0.5);
}
