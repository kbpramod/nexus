import http from "k6/http";
import { check, sleep } from "k6";

export let options = {
  vus: 30,
  duration: "20s",
};

export default function () {
  const body = JSON.stringify({
    tokenIn: "SOL",
    tokenOut: "USDC",
    amount: 1,
    type: "limit",
    limitPrice: Math.round(95 + Math.random() * 10)
  });

  const params = {
    headers: { "Content-Type": "application/json" },
  };

  const res = http.post("http://localhost:3000/api/orders/execute", body, params);

  check(res, {
    "limit order accepted": (r) => r.status === 200,
  });

  sleep(0.1);
}
