import { canManageUsers, requireUser } from "../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { hashPassword } from "../../_lib/password.js";
import { createUser, getDb, validateUserInput } from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const currentUser = await requireUser(context, 1);

    if (!canManageUsers(currentUser)) {
      throw new HttpError(403, "Insufficient permissions.");
    }

    const input = validateUserInput(await readJson(context.request), {
      includeAccessLevel: true,
      requirePassword: true
    });
    const password = await hashPassword(input.password);
    const user = await createUser(getDb(context.env), input, password.hash, password.salt);

    return json({ user }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
