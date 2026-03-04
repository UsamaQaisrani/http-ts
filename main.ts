import * as net from "net";
import * as process from "process";
import { Server } from "./server";

const args = process.argv.slice(2);
const server = net.createServer((socket) => {
  socket.on("close", () => {
    closeSocket(socket);
  });

  socket.on("data", (data) => {
    respondToRequest(data, socket);
  });
});

server.listen(4221, "localhost");

function closeSocket(socket: net.Socket) {
  socket.end();
}

function respondToRequest(data: Buffer, socket: net.Socket) {
  const server = new Server();
  const { response, connectionClose } = server.parse(data, args);
  server.respond(socket, response, connectionClose);
}
