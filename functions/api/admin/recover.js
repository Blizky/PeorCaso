import { canAccessAdmin } from "../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { generateInviteToken, hashInviteToken, inviteExpiresAt } from "../../_lib/invite.js";
import { sendInviteEmail } from "../../_lib/mailer.js";
import {
  createUserInvite,
  getDb,
  getUserAuthByEmail,
  parseUserFlags,
  sanitizeUser,
  validatePeorCasoEmail
} from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    const email = validatePeorCasoEmail(body.email);
    const db = getDb(context.env);
    const user = await getUserAuthByEmail(db, email);

    if (!user || !user.isActive) {
      throw new HttpError(404, "Account not found.");
    }

    if (!canAccessAdmin(sanitizeUser(user))) {
      throw new HttpError(403, "This account cannot access the admin workspace.");
    }

    if (parseUserFlags(user.flag).includes("is_suspended")) {
      throw new HttpError(403, "This account is suspended.");
    }

    if (!context.env.RESEND_API_KEY || !context.env.RESEND_FROM_EMAIL) {
      throw new HttpError(500, "Password reset email is not configured.");
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

    let delivery = null;

    try {
      delivery = await sendInviteEmail(context.request, context.env, {
        email,
        name: user.name,
        purpose: "reset_password",
        token,
        expiresAt
      });
    } catch (error) {
      console.error(error);
      throw new HttpError(
        502,
        "Password reset email failed. Check RESEND_API_KEY and make sure RESEND_FROM_EMAIL is a verified Resend sender."
      );
    }

    if (!delivery.delivered) {
      throw new HttpError(500, "Password reset email could not be sent.");
    }

    return json({
      ok: true,
      email,
      delivered: true
    });
  } catch (error) {
    return handleError(error);
  }
}
