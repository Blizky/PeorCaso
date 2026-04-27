import { requireUser } from "../../_lib/auth.js";
import { handleError, json, readJson } from "../../_lib/http.js";
import { createCategory, getDb, validateCategoryInput } from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    await requireUser(context, "admin");
    const input = validateCategoryInput(await readJson(context.request));
    const category = await createCategory(getDb(context.env), input);

    return json({ category }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
