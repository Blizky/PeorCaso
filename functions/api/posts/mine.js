import { requireUser } from "../../_lib/auth.js";
import { handleError, json } from "../../_lib/http.js";
import { getDb, listOwnPosts } from "../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const currentUser = await requireUser(context, "user");

    return json({
      posts: await listOwnPosts(getDb(context.env), currentUser.id)
    });
  } catch (error) {
    return handleError(error);
  }
}
