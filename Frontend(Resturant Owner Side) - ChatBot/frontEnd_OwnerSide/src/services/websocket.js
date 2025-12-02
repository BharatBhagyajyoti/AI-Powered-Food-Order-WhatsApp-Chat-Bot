import SockJS from "sockjs-client";
import { over } from "stompjs";

let stompClient = null;

export const connectWebSocket = (onMessageReceived) => {
  const socket = new SockJS("http://localhost:8080/ws");
  stompClient = over(socket);
  stompClient.connect({}, () => {
    console.log("Connected to WebSocket");

    // Subscribe to order updates
    stompClient.subscribe("/topic/orders", (message) => {
      const order = JSON.parse(message.body);
      onMessageReceived(order);
    });
  });
};

export const disconnectWebSocket = () => {
  if (stompClient !== null) stompClient.disconnect();
  console.log("Disconnected");
};
