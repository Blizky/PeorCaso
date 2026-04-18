import { createSessionHeaders } from "../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { verifyPassword } from "../../_lib/password.js";
import { getDb, getUserAuthByEmail, sanitizeUser } from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const db = getDb(context.env);
    const user = await getUserAuthByEmail(db, email);

    if (!user || !user.isActive) {
      throw new HttpError(401, "Invalid email or password.");
    }

    const isValid = await verifyPassword(password, user.password_hash, user.password_salt);

    if (!isValid) {
      throw new HttpError(401, "Invalid email or password.");
    }

    return json({
      user: sanitizeUser(user)
    }, {
      headers: await createSessionHeaders(context.request, context.env, user)
    });
  } catch (error) {
    return handleError(error);
  }
}
