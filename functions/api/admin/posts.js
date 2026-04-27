import { requireUser } from "../../_lib/auth.js";
import { handleError, json, readJson } from "../../_lib/http.js";
import { createPost, getDb, validatePostInput } from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const currentUser = await requireUser(context, "admin");
    const input = validatePostInput(await readJson(context.request));
    const post = await createPost(getDb(context.env), {
      ...input,
      authorId: currentUser.id,
      status: input.status,
      approvedBy: input.status === "visible" ? currentUser.id : null,
      approvedAt: input.status === "visible" ? new Date().toISOString() : null
    });

    return json({ post }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
