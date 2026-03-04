import * as Constants from "./constants";
import * as fs from "fs";
import * as fPath from "path";
import * as net from "net";
import * as zlib from "zlib";

export enum RequestType {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

export class Server {
  constructor() { }

  parse(data: Buffer, args?: string[]): { response: string | Buffer; connectionClose: boolean } {
    const reqParts = data.toString().split(Constants.LineEnds.CRLF);
    const reqLine = reqParts[0];
    const reqLineParts = reqLine.split(" ");
    const type = reqLineParts[0] as RequestType;
    const path = reqLineParts[1];
    const acceptEncoding = reqParts.find((p) => p.startsWith(Constants.HeaderKeys.ACCEPT_ENCODING));
    const encodings = acceptEncoding?.split(":")[1]?.split(",") ?? [];
    const shouldCompress = encodings.find((v) => v.trim() === "gzip");
    const connectionHeader = reqParts.find((p) => p.toLowerCase().startsWith("connection:"));
    const connectionClose = connectionHeader?.split(":")[1]?.trim().toLowerCase() === "close";

    let statusLine: string = "";
    let headers: string[] = [];
    let body: string = "";

    switch (type) {
      case RequestType.GET: {
        if (path === Constants.PathK.ROOT) {
          statusLine = Constants.StatusLines.OK + Constants.LineEnds.END;
        }

        else if (path.startsWith(Constants.PathK.ECHO)) {
          const content = path.split(Constants.PathK.ECHO + "/")[1];
          statusLine = Constants.StatusLines.OK + Constants.LineEnds.CRLF;
          headers.push(Constants.HeaderKeys.CONTENT_TYPE + Constants.ContentTypes.TEXT);
          headers.push(Constants.HeaderKeys.CONTENT_LENGTH + content.length);
          body = content;
        }

        else if (path === Constants.PathK.USER_AGENT) {
          const userAgentHeader = reqParts.find((part) => part.startsWith(Constants.HeaderKeys.USER_AGENT));
          const userAgentParts = userAgentHeader?.split(" ");
          const agent = userAgentParts?.slice(1).join(" ") || "Unknown";

          statusLine = Constants.StatusLines.OK + Constants.LineEnds.CRLF;
          headers.push(Constants.HeaderKeys.CONTENT_TYPE + Constants.ContentTypes.TEXT);
          headers.push(Constants.HeaderKeys.CONTENT_LENGTH + agent.length);
          body = agent;
        }

        else if (path.startsWith(Constants.PathK.FILES)) {
          const filePath = path.split(Constants.PathK.FILES + "/")[1];
          const fullFilePath = fPath.join(args ? args[1] : "", filePath);
          if (fs.existsSync(fullFilePath)) {
            const content = fs.readFileSync(fullFilePath);
            statusLine = Constants.StatusLines.OK + Constants.LineEnds.CRLF;
            headers.push(Constants.HeaderKeys.CONTENT_TYPE + Constants.ContentTypes.OCTET_STREAM);
            headers.push(Constants.HeaderKeys.CONTENT_LENGTH + content.length);
            body = content.toString();
          }
          else {
            statusLine = Constants.StatusLines.NOT_FOUND + Constants.LineEnds.END;
          }
        }
        else {
          statusLine = Constants.StatusLines.NOT_FOUND + Constants.LineEnds.END;
        }
        break
      }
      case RequestType.POST: {
        if (path.startsWith(Constants.PathK.FILES)) {
          const body: string = reqParts[reqParts.length - 1];
          const filePath = path.split(Constants.PathK.FILES + "/")[1];
          const fullFilePath = fPath.join(args ? args[1] : "", filePath);
          fs.writeFileSync(fullFilePath, body);
          statusLine = Constants.StatusLines.CREATED + Constants.LineEnds.END;
        }
        break
      }
      default:
        statusLine = Constants.StatusLines.NOT_FOUND + Constants.LineEnds.END;
    }

    if (connectionClose) {
      if (path === Constants.PathK.ROOT && headers.length === 0) {
        statusLine = Constants.StatusLines.OK + Constants.LineEnds.CRLF;
      }
      headers.push(Constants.HeaderKeys.CONNECTION + " close");
    }

    if (shouldCompress) {
      return { response: this.compress(statusLine, headers, body), connectionClose };
    }
    else {
      headers[headers.length - 1] += Constants.LineEnds.END;
      return { response: statusLine + headers.join(Constants.LineEnds.CRLF) + body, connectionClose };
    }
  }

  respond(socket: net.Socket, response: string | Buffer, connectionClose?: boolean) {
    socket.write(response, () => {
      if (connectionClose) socket.end();
    });
    return;
  }

  compress(statusLine: string, headers: string[], body: string): Buffer {
    const compressedBody = zlib.gzipSync(Buffer.from(body, "utf8"));
    const contentLengthIdx = headers.findIndex((h) => h.startsWith(Constants.HeaderKeys.CONTENT_LENGTH));
    if (contentLengthIdx >= 0) {
      headers[contentLengthIdx] = Constants.HeaderKeys.CONTENT_LENGTH + compressedBody.length;
    }
    headers.push(Constants.HeaderKeys.CONTENT_ENCODING + Constants.ContentTypes.GZIP);
    const headerBlock = statusLine + headers.join(Constants.LineEnds.CRLF) + Constants.LineEnds.END;
    return Buffer.concat([Buffer.from(headerBlock, "utf8"), compressedBody]);
  }
}
