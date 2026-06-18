import ws from "k6/ws";
import { check } from "k6";

export let options = {
  vus: 20,
  duration: "20s",
};

export default function () {
  ws.connect("ws://localhost:3000/ws/test-order", function (socket) {

    socket.on("open", () => {
      console.log("Connected");
    });

    socket.on("message", (msg) => {
      console.log("WS message:", msg);
    });

    socket.on("close", () => {
      console.log("WS closed");
    });

    socket.setTimeout(() => {
      socket.close();
    }, 5000);
  });
}
