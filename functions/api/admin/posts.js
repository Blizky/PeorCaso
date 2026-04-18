import { canApprovePosts, requireUser } from "../../_lib/auth.js";
import { handleError, json, readJson } from "../../_lib/http.js";
import { createPost, getDb, validatePostInput } from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const currentUser = await requireUser(context, 3);
    const input = validatePostInput(await readJson(context.request));
    const isApproved = canApprovePosts(currentUser) && input.status === "published";
    const post = await createPost(getDb(context.env), {
      ...input,
      authorId: currentUser.id,
      status: isApproved ? "published" : "pending",
      approvedBy: isApproved ? currentUser.id : null,
      approvedAt: isApproved ? new Date().toISOString() : null
    });

    return json({ post }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
