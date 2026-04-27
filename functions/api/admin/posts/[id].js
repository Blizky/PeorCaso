import { requireUser } from "../../../_lib/auth.js";
import { handleError, json, noContent, readJson } from "../../../_lib/http.js";
import { deletePost, getDb, getPostAccessRecord, updatePost, validatePostInput } from "../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestPut(context) {
  try {
    const currentUser = await requireUser(context, "admin");
    const db = getDb(context.env);
    const postId = parseId(context.params);
    const existing = await getPostAccessRecord(db, postId);
    const input = validatePostInput(await readJson(context.request));
    const post = await updatePost(db, postId, {
      ...input,
      status: input.status,
      approvedBy: input.status === "visible" ? (existing.approvedBy || currentUser.id) : null,
      approvedAt: input.status === "visible" ? (existing.approvedAt || new Date().toISOString()) : null
    });

    return json({ post });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestDelete(context) {
  try {
    await requireUser(context, "admin");
    const db = getDb(context.env);
    const postId = parseId(context.params);
    await deletePost(db, postId);
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
