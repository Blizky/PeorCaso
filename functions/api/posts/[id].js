import { getCurrentUser } from "../../_lib/auth.js";
import { handleError, json } from "../../_lib/http.js";
import { getDb, getPostForViewer } from "../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestGet(context) {
  try {
    const currentUser = await getCurrentUser(context.request, context.env);
    const post = await getPostForViewer(getDb(context.env), parseId(context.params), currentUser);

    return json({ post });
  } catch (error) {
    return handleError(error);
  }
}
