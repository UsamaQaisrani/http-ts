import * as Constants from "./constants";
import * as fs from "fs";
import * as fPath from "path";
import * as net from "net";

export enum RequestType {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

export class Server {
  constructor() { }

  parse(data: Buffer, args?: string[]): string {
    const reqParts = data.toString().split(Constants.LineEnds.CRLF);
    const reqLine = reqParts[0];
    const reqLineParts = reqLine.split(" ");
    const type = reqLineParts[0] as RequestType;
    const path = reqLineParts[1];
    const shouldCompress = reqParts.some((part) => part.startsWith(Constants.HeaderKeys.ACCEPT_ENCODING) && part.includes("gzip"));

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

    if (shouldCompress) {
      return this.compress(statusLine, headers, body);
    }
    else {
      headers[headers.length - 1] += Constants.LineEnds.END;
      return statusLine + headers.join(Constants.LineEnds.CRLF) + body;
    }
  }

  respond(socket: net.Socket, response: string) {
    socket.write(response);
    return;
  }

  compress(statusLine: string, headers: string[], body: string): string {
    headers.push(Constants.HeaderKeys.CONTENT_ENCODING + Constants.ContentTypes.GZIP)
    headers[headers.length - 1] += Constants.LineEnds.END;
    return statusLine + headers.join(Constants.LineEnds.CRLF) + body;
  }
}
