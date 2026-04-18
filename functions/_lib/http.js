export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

export function json(data, init) {
  const responseInit = init || {};
  const headers = new Headers(responseInit.headers || {});

  headers.set("content-type", "application/json; charset=utf-8");

  return new Response(JSON.stringify(data), {
    ...responseInit,
    headers
  });
}

export function noContent() {
  return new Response(null, { status: 204 });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (error) {
    throw new HttpError(400, "Invalid JSON request body.");
  }
}

export function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (match) {
    return match[1].trim();
  }

  return (request.headers.get("x-admin-token") || "").trim();
}

export function handleError(error) {
  if (error instanceof HttpError) {
    return json({
      error: error.message,
      details: error.details || null
    }, { status: error.status });
  }

  const message = String(error && error.message ? error.message : error);

  if (message.includes("UNIQUE constraint failed")) {
    return json({ error: "A record with one of those unique values already exists." }, { status: 409 });
  }

  if (message.includes("FOREIGN KEY constraint failed")) {
    return json({ error: "This item is still referenced by other content." }, { status: 409 });
  }

  console.error(error);

  return json({ error: "Internal server error." }, { status: 500 });
}
