import { handleError, HttpError, json } from "../../../../_lib/http.js";
import { hashInviteToken } from "../../../../_lib/invite.js";
import { clearPendingEmailChange, completeEmailChange, getDb, getUserByPendingEmailToken } from "../../../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const token = String(new URL(context.request.url).searchParams.get("token") || "").trim();

    if (!token) {
      throw new HttpError(400, "Verification token is required.");
    }

    const db = getDb(context.env);
    const user = await getUserByPendingEmailToken(db, await hashInviteToken(token));

    if (!user) {
      throw new HttpError(404, "This email verification link is invalid or expired.");
    }

    if (user.pending_email_expires_at <= new Date().toISOString()) {
      await clearPendingEmailChange(db, user.id);
      throw new HttpError(404, "This email verification link is invalid or expired.");
    }

    const updatedUser = await completeEmailChange(db, user.id);

    return json({
      verified: true,
      user: updatedUser
    });
  } catch (error) {
    return handleError(error);
  }
}
