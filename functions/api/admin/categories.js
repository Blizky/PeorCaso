import { canManageCategories, requireUser } from "../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { createCategory, getDb, validateCategoryInput } from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const currentUser = await requireUser(context, 2);

    if (!canManageCategories(currentUser)) {
      throw new HttpError(403, "Insufficient permissions.");
    }

    const input = validateCategoryInput(await readJson(context.request));
    const category = await createCategory(getDb(context.env), input);

    return json({ category }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
