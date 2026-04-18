import { canManageUsers, requireUser } from "../../_lib/auth.js";
import { handleError, json } from "../../_lib/http.js";
import { getDb, listCategories, listPostsForUser, listUsers } from "../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const currentUser = await requireUser(context, 3);
    const db = getDb(context.env);
    const [categories, posts, users] = await Promise.all([
      listCategories(db),
      listPostsForUser(db, currentUser),
      canManageUsers(currentUser) ? listUsers(db) : Promise.resolve([])
    ]);

    return json({
      currentUser,
      categories,
      posts,
      users
    });
  } catch (error) {
    return handleError(error);
  }
}
