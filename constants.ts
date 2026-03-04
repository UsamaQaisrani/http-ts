export const LineEnds = {
  CRLF: "\r\n",
  END: "\r\n\r\n",
}

export const PathK = {
  ROOT: "/",
  ECHO: "/echo",
  USER_AGENT: "/user-agent",
  FILES: "/files"
}

export const StatusLines = {
  OK: "HTTP/1.1 200 OK",
  NOT_FOUND: "HTTP/1.1 404 Not Found",
  CREATED: "HTTP/1.1 201 Created",
}

export const HeaderKeys = {
  CONTENT_TYPE: "Content-Type:",
  CONTENT_LENGTH: "Content-Length:",
  USER_AGENT: "User-Agent:",
}

export const ContentTypes = {
  TEXT: "text/plain",
  OCTET_STREAM: "application/octet-stream",
}
