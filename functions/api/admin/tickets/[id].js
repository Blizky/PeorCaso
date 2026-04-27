import { canModerateComments, requireUser } from "../../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../../_lib/http.js";
import { getDb, updateTicket } from "../../../_lib/store.js";

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
    const ticket = await updateTicket(getDb(context.env), parseId(context.params), {
      status: body.status,
      assignedTo: body.assignedTo
    });

    return json({ ticket });
  } catch (error) {
    return handleError(error);
  }
}
