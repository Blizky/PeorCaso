import { requireUser } from "../../../_lib/auth.js";
import { handleError, json } from "../../../_lib/http.js";
import { getDb, togglePostLike } from "../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestPost(context) {
  try {
    const currentUser = await requireUser(context, "user");
    const like = await togglePostLike(getDb(context.env), parseId(context.params), currentUser.id);

    return json({ like });
  } catch (error) {
    return handleError(error);
  }
}
