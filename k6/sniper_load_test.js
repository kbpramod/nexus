import http from "k6/http";
import { check } from "k6";

export let options = {
  vus: 20,
  duration: "10s",
};

export default function () {
  const body = JSON.stringify({
    tokenIn: "NEW",
    tokenOut: "USDC",
    amount: 1,
    type: "sniper"
  });

  const res = http.post("http://localhost:3000/api/orders/execute", body, {
    headers: { "Content-Type": "application/json" },
  });

  check(res, {
    "sniper accepted": (r) => r.status === 200,
  });
}
