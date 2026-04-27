import { getCurrentUser, requireUser } from "../../../_lib/auth.js";
import { handleError, json, readJson } from "../../../_lib/http.js";
import {
  createComment,
  getDb,
  listCommentsForPost,
  requireVisiblePost,
  validateCommentInput
} from "../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestGet(context) {
  try {
    const db = getDb(context.env);
    const currentUser = await getCurrentUser(context.request, context.env);
    const postId = parseId(context.params);

    await requireVisiblePost(db, postId);

    return json({
      comments: await listCommentsForPost(db, postId, currentUser ? currentUser.id : null)
    });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestPost(context) {
  try {
    const currentUser = await requireUser(context, "user");
    const db = getDb(context.env);
    const postId = parseId(context.params);
    const input = validateCommentInput(await readJson(context.request));
    const comment = await createComment(db, {
      postId,
      parentCommentId: input.parentCommentId,
      userId: currentUser.id,
      body: input.body
    });

    return json({
      comment,
      autoApproved: comment.status === "visible"
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
