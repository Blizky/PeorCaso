import { canApprovePosts, requireUser } from "../../../_lib/auth.js";
import { handleError, HttpError, json, noContent, readJson } from "../../../_lib/http.js";
import { deletePost, getDb, getPostAccessRecord, updatePost, validatePostInput } from "../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

function canEditPost(user, existing) {
  if (user.accessLevel <= 2) {
    return true;
  }

  return existing.authorId === user.id && existing.status === "pending";
}

export async function onRequestPut(context) {
  try {
    const currentUser = await requireUser(context, 3);
    const db = getDb(context.env);
    const postId = parseId(context.params);
    const existing = await getPostAccessRecord(db, postId);

    if (!canEditPost(currentUser, existing)) {
      throw new HttpError(403, "You cannot edit this post.");
    }

    const input = validatePostInput(await readJson(context.request));
    const shouldPublish = canApprovePosts(currentUser) && input.status === "published";
    const post = await updatePost(db, postId, {
      ...input,
      status: shouldPublish ? "published" : "pending",
      approvedBy: shouldPublish ? (existing.approvedBy || currentUser.id) : null,
      approvedAt: shouldPublish ? (existing.approvedAt || new Date().toISOString()) : null
    });

    return json({ post });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestDelete(context) {
  try {
    const currentUser = await requireUser(context, 3);
    const db = getDb(context.env);
    const postId = parseId(context.params);
    const existing = await getPostAccessRecord(db, postId);

    if (!canEditPost(currentUser, existing)) {
      throw new HttpError(403, "You cannot delete this post.");
    }

    await deletePost(db, postId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
