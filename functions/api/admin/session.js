import { getCurrentUser } from "../../_lib/auth.js";
import { handleError, json } from "../../_lib/http.js";
import { countUsers, getDb } from "../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const db = getDb(context.env);
    const [user, totalUsers] = await Promise.all([
      getCurrentUser(context.request, context.env),
      countUsers(db)
    ]);

    return json({
      authenticated: Boolean(user),
      hasUsers: totalUsers > 0,
      user
    });
  } catch (error) {
    return handleError(error);
  }
}
