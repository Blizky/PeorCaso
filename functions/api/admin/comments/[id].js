import { canModerateComments, requireUser } from "../../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../../_lib/http.js";
import { getDb, updateCommentStatus } from "../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestPut(context) {
  try {
    const currentUser = await requireUser(context, 2);

    if (!canModerateComments(currentUser)) {
      throw new HttpError(403, "Insufficient permissions.");
    }

    const body = await readJson(context.request);
    const comment = await updateCommentStatus(getDb(context.env), parseId(context.params), body.status);

    return json({ comment });
  } catch (error) {
    return handleError(error);
  }
}
