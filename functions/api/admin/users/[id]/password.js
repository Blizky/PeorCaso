import { canManageUsers, requireUser } from "../../../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../../../_lib/http.js";
import { hashPassword } from "../../../../_lib/password.js";
import { getDb, updateUserPassword } from "../../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestPut(context) {
  try {
    const currentUser = await requireUser(context, 1);

    if (!canManageUsers(currentUser)) {
      throw new HttpError(403, "Insufficient permissions.");
    }

    const body = await readJson(context.request);
    const password = await hashPassword(String(body.password || ""));

    await updateUserPassword(getDb(context.env), parseId(context.params), password.hash, password.salt);

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
