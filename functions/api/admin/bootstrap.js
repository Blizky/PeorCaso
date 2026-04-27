import { requireUser } from "../../_lib/auth.js";
import { handleError, json } from "../../_lib/http.js";
import { getDb, listCategories, listPostsForUser } from "../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const currentUser = await requireUser(context, "admin");
    const db = getDb(context.env);
    const [categories, posts] = await Promise.all([
      listCategories(db),
      listPostsForUser(db, currentUser)
    ]);

    return json({
      currentUser,
      categories,
      posts,
      youtubeDefaults: {
        playlistId: String(context.env.YOUTUBE_PLAYLIST_ID || "").trim()
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
