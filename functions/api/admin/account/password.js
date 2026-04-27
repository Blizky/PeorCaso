import { requireUser } from "../../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../../_lib/http.js";
import { hashPassword, verifyPassword } from "../../../_lib/password.js";
import { getDb, getUserAuthById, updateUserPassword } from "../../../_lib/store.js";

export async function onRequestPut(context) {
  try {
    const currentUser = await requireUser(context, "admin");
    const body = await readJson(context.request);
    const currentPassword = String(body.currentPassword || "");
    const nextPassword = String(body.nextPassword || "");
    const db = getDb(context.env);
    const authUser = await getUserAuthById(db, currentUser.id);

    if (!await verifyPassword(currentPassword, authUser.password_hash, authUser.password_salt)) {
      throw new HttpError(401, "Current password is incorrect.");
    }

    const password = await hashPassword(nextPassword);
    await updateUserPassword(db, currentUser.id, password.hash, password.salt);

    return json({ ok: true });
  } catch (error) {
    return handleError(error);
  }
}
