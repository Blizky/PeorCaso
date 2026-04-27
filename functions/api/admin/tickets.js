import { canModerateComments, requireUser } from "../../_lib/auth.js";
import { handleError, HttpError, json } from "../../_lib/http.js";
import { getDb, listTickets } from "../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const currentUser = await requireUser(context, 2);

    if (!canModerateComments(currentUser)) {
      throw new HttpError(403, "Insufficient permissions.");
    }

    return json({
      tickets: await listTickets(getDb(context.env))
    });
  } catch (error) {
    return handleError(error);
  }
}
