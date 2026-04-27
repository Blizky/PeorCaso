import { createSessionHeaders } from "../../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../../_lib/http.js";
import { hashInviteToken } from "../../../_lib/invite.js";
import { hashPassword } from "../../../_lib/password.js";
import {
  getDb,
  getOpenInviteByTokenHash,
  getUserById,
  markInviteUsed,
  setUserActive,
  updateUserPassword
} from "../../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    const token = String(body.token || "").trim();
    const password = String(body.password || "");
    const db = getDb(context.env);
    const invite = await getOpenInviteByTokenHash(db, await hashInviteToken(token));

    if (!invite || !["activate_account", "reset_password"].includes(invite.purpose)) {
      throw new HttpError(404, "This link is invalid or expired.");
    }

    const nextPassword = await hashPassword(password);

    await updateUserPassword(db, invite.userId, nextPassword.hash, nextPassword.salt);

    if (invite.purpose === "activate_account") {
      await setUserActive(db, invite.userId, true);
    }

    await markInviteUsed(db, invite.id);

    const user = await getUserById(db, invite.userId);

    return json({
      user
    }, {
      headers: await createSessionHeaders(context.request, context.env, user)
    });
  } catch (error) {
    return handleError(error);
  }
}
