import { handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { generateInviteToken, hashInviteToken, inviteExpiresAt } from "../../_lib/invite.js";
import { sendAccountRecoveryEmail } from "../../_lib/mailer.js";
import {
  createUserInvite,
  getDb,
  getUserAuthByEmail,
  parseUserFlags,
  validatePeorCasoEmail
} from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    const email = validatePeorCasoEmail(body.email);
    const db = getDb(context.env);
    const user = await getUserAuthByEmail(db, email);

    if (!user || !user.isActive) {
      throw new HttpError(404, "Account not found.", {
        code: "ACCOUNT_NOT_FOUND"
      });
    }

    if (parseUserFlags(user.flag).includes("is_suspended")) {
      throw new HttpError(403, "This account is suspended.", {
        code: "ACCOUNT_SUSPENDED"
      });
    }

    const token = generateInviteToken();
    const expiresAt = inviteExpiresAt();

    await createUserInvite(db, {
      userId: user.id,
      tokenHash: await hashInviteToken(token),
      purpose: "reset_password",
      expiresAt,
      createdBy: null
    });

    let delivery = {
      delivered: false,
      recoveryUrl: new URL("/user.html?token=" + encodeURIComponent(token), context.request.url).toString()
    };

    try {
      delivery = await sendAccountRecoveryEmail(context.request, context.env, {
        email,
        token
      });
    } catch (error) {
      console.error(error);
    }

    return json({
      ok: true,
      email,
      delivered: delivery.delivered,
      recoveryUrl: delivery.recoveryUrl
    });
  } catch (error) {
    return handleError(error);
  }
}
