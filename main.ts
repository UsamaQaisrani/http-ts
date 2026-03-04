import * as net from "net";
import { Constants } from "./constants";

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
  const reqParts = data.toString().split(Constants.CRLF);
  const reqLine = reqParts[0];
  const reqLineParts = reqLine.split(" ");
  const method = reqLineParts[0];
  const path = reqLineParts[1];
  if (path === "/") {
    socket.write("HTTP/1.1 200 OK\r\n\r\n");
  }
  else if (path.includes("/echo")) {
    const content = path.split("/echo/")[1];
    const requestLine = "HTTP/1.1 200 OK" + Constants.CRLF;
    const headers = "Content-Type: text/plain" + Constants.CRLF;
    const body = "Content-Length:" + content.length + Constants.CRLF + Constants.CRLF + content;
    socket.write(requestLine + headers + body);
  }
  else if (path.includes("/user-agent")) {
    const userAgentHeader = reqParts.find((part) => part.startsWith("User-Agent:"));
    const userAgentParts = userAgentHeader?.split(" ");
    const agent = userAgentParts?.slice(1).join(" ") || "Unknown";

    const requestLine = "HTTP/1.1 200 OK" + Constants.CRLF;
    const headers = "Content-Type: text/plain" + Constants.CRLF;
    const body = "Content-Length:" + agent.length + Constants.CRLF + Constants.CRLF + agent;
    socket.write(requestLine + headers + body); 
  }
  else {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
  }
}
