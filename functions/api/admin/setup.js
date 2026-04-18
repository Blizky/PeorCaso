import { createSessionHeaders } from "../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { hashPassword } from "../../_lib/password.js";
import { countUsers, createUser, getDb, validateUserInput } from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const db = getDb(context.env);

    if (await countUsers(db)) {
      throw new HttpError(409, "An account already exists. Use the login form.");
    }

    const input = validateUserInput(await readJson(context.request), {
      includeAccessLevel: false,
      requirePassword: true
    });
    const password = await hashPassword(input.password);
    const user = await createUser(db, {
      ...input,
      accessLevel: 1
    }, password.hash, password.salt);

    return json({
      user
    }, {
      status: 201,
      headers: await createSessionHeaders(context.request, context.env, user)
    });
  } catch (error) {
    return handleError(error);
  }
}
