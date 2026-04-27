import { requireUser } from "../../../_lib/auth.js";
import { handleError, json, noContent, readJson } from "../../../_lib/http.js";
import { deleteCategory, getDb, updateCategory, validateCategoryInput } from "../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestPut(context) {
  try {
    await requireUser(context, "admin");
    const category = await updateCategory(
      getDb(context.env),
      parseId(context.params),
      validateCategoryInput(await readJson(context.request))
    );

    return json({ category });
  } catch (error) {
    return handleError(error);
  }
}

export async function onRequestDelete(context) {
  try {
    await requireUser(context, "admin");
    await deleteCategory(getDb(context.env), parseId(context.params));
    return noContent();
  } catch (error) {
    return handleError(error);
  }
}
