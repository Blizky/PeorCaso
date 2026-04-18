import { requireUser } from "../../_lib/auth.js";
import { handleError, json, readJson } from "../../_lib/http.js";
import { getDb, updateUserProfile, validateUserInput } from "../../_lib/store.js";

export async function onRequestPut(context) {
  try {
    const currentUser = await requireUser(context, 3);
    const input = validateUserInput(await readJson(context.request), {
      includeAccessLevel: false,
      requirePassword: false
    });
    const user = await updateUserProfile(getDb(context.env), currentUser.id, input);

    return json({ user });
  } catch (error) {
    return handleError(error);
  }
}
