import { canManageUsers, requireUser } from "../../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../../_lib/http.js";
import { getDb, updateUserProfile, validateUserInput } from "../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestPut(context) {
  try {
    const currentUser = await requireUser(context, 1);

    if (!canManageUsers(currentUser)) {
      throw new HttpError(403, "Insufficient permissions.");
    }

    const input = validateUserInput(await readJson(context.request), {
      includeAccessLevel: true,
      requirePassword: false
    });
    const user = await updateUserProfile(getDb(context.env), parseId(context.params), input);

    return json({ user });
  } catch (error) {
    return handleError(error);
  }
}
