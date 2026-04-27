import { getCurrentUser } from "../../../_lib/auth.js";
import { handleError, json, readJson } from "../../../_lib/http.js";
import { createOrGetReportTicket, getDb } from "../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestPost(context) {
  try {
    const currentUser = await getCurrentUser(context.request, context.env);
    const body = await readJson(context.request);
    const result = await createOrGetReportTicket(getDb(context.env), {
      type: "report_post",
      postId: parseId(context.params),
      userId: currentUser ? currentUser.id : null,
      guestName: body.guestName,
      guestEmail: body.guestEmail,
      subject: String(body.subject || "Post report").trim(),
      message: String(body.message || "").trim()
    });

    return json({
      created: result.created,
      hiddenLocally: true,
      ticket: result.ticket
    }, { status: result.created ? 201 : 200 });
  } catch (error) {
    return handleError(error);
  }
}
