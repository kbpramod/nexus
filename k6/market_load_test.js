import http from "k6/http";
import { check } from "k6";

const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || "30s";

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ["rate<0.01"], // <1% failures
    checks: ["rate>0.99"],          // >99% successful checks
    http_req_duration: ["p(95)<1000"], // p95 under 1 second
  },
};

export default function () {
  const payload = JSON.stringify({
    symbol: "BTCUSDT",
    side: "BUY",
    type: "MARKET",
    quantity: 0.0001,
  });

  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(
    "http://localhost:8080/api/v1/order",
    payload,
    params
  );

  check(res, {
    "status is 202": (r) => r.status === 202,
  });
}