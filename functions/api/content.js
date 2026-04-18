import { handleError, json } from "../_lib/http.js";
import { getDb, listCategories, listPublishedPosts } from "../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const db = getDb(context.env);
    const [categories, posts] = await Promise.all([
      listCategories(db),
      listPublishedPosts(db)
    ]);

    return json({ categories, posts });
  } catch (error) {
    return handleError(error);
  }
}
