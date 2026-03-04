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

    switch (type) {
      case RequestType.GET:
        if (path === Constants.PathK.ROOT) {
          const response = Constants.StatusLines.OK + Constants.LineEnds.END;
          return response;
        }

        else if (path.startsWith(Constants.PathK.ECHO)) {
          const content = path.split(Constants.PathK.ECHO + "/")[1];
          const requestLine = Constants.StatusLines.OK + Constants.LineEnds.CRLF;
          const headers = Constants.HeaderKeys.CONTENT_TYPE + Constants.ContentTypes.TEXT + Constants.LineEnds.CRLF;
          const body = Constants.HeaderKeys.CONTENT_LENGTH + content.length + Constants.LineEnds.END + content;
          return requestLine + headers + body;
        }

        else if (path === Constants.PathK.USER_AGENT) {
          const userAgentHeader = reqParts.find((part) => part.startsWith(Constants.HeaderKeys.USER_AGENT));
          const userAgentParts = userAgentHeader?.split(" ");
          const agent = userAgentParts?.slice(1).join(" ") || "Unknown";
          const requestLine = Constants.StatusLines.OK + Constants.LineEnds.CRLF;
          const headers = Constants.HeaderKeys.CONTENT_TYPE + Constants.ContentTypes.TEXT + Constants.LineEnds.CRLF;
          const body = Constants.HeaderKeys.CONTENT_LENGTH + agent.length + Constants.LineEnds.END + agent;
          return requestLine + headers + body;
        }

        else if (path.startsWith(Constants.PathK.FILES)) {
          const filePath = path.split(Constants.PathK.FILES + "/")[1];
          const fullFilePath = fPath.join(args ? args[1] : "", filePath);
          if (fs.existsSync(fullFilePath)) {

            const content = fs.readFileSync(fullFilePath);
            const requestLine = Constants.StatusLines.OK + Constants.LineEnds.CRLF;
            const headers = Constants.HeaderKeys.CONTENT_TYPE + Constants.ContentTypes.OCTET_STREAM + Constants.LineEnds.CRLF;
            const body = Constants.HeaderKeys.CONTENT_LENGTH + content.length + Constants.LineEnds.END + content;
            return requestLine + headers + body;
          }
          else {
            return Constants.StatusLines.NOT_FOUND + Constants.LineEnds.END;
          }
        }
        else {
          return Constants.StatusLines.NOT_FOUND + Constants.LineEnds.END;
        }
      case RequestType.POST: {
        if (path.startsWith(Constants.PathK.FILES)) {
          const body: string = reqParts[reqParts.length - 1];
          const filePath = path.split(Constants.PathK.FILES + "/")[1];
          const fullFilePath = fPath.join(args ? args[1] : "", filePath);
          fs.writeFileSync(fullFilePath, body);
          const response = Constants.StatusLines.CREATED + Constants.LineEnds.END;
          return response;
        }
        return "";
      }
      default:
        return Constants.StatusLines.NOT_FOUND + Constants.LineEnds.END;
    }
  }

  respond(socket: net.Socket, response: string) {
    socket.write(response);
    return;
  }
}
