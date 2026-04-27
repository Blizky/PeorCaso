import { canAccessAdmin, getCurrentUser } from "../../_lib/auth.js";
import { handleError, json } from "../../_lib/http.js";
import { countUsers, getDb } from "../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const db = getDb(context.env);
    const [user, totalUsers] = await Promise.all([
      getCurrentUser(context.request, context.env),
      countUsers(db)
    ]);

    const adminUser = canAccessAdmin(user) ? user : null;

    return json({
      authenticated: Boolean(adminUser),
      hasUsers: totalUsers > 0,
      user: adminUser
    });
  } catch (error) {
    return handleError(error);
  }
}
