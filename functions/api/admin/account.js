import { requireUser } from "../../_lib/auth.js";
import { handleError, json, readJson } from "../../_lib/http.js";
import { generateInviteToken, hashInviteToken, inviteExpiresAt } from "../../_lib/invite.js";
import { sendPendingEmailVerification } from "../../_lib/mailer.js";
import {
  getDb,
  getUserAuthById,
  requestEmailChange,
  updateUserProfile,
  validatePeorCasoEmail
} from "../../_lib/store.js";

export async function onRequestPut(context) {
  try {
    const currentUser = await requireUser(context, "admin");
    const body = await readJson(context.request);
    const name = String(body.name || "").trim();
    const nextEmail = validatePeorCasoEmail(body.email);
    const db = getDb(context.env);
    const authUser = await getUserAuthById(db, currentUser.id);
    let user = await updateUserProfile(db, currentUser.id, {
      name,
      email: authUser.email
    });
    let emailChange = null;

    if (nextEmail !== authUser.email) {
      const token = generateInviteToken();
      const expiresAt = inviteExpiresAt();

      user = await requestEmailChange(db, {
        userId: currentUser.id,
        pendingEmail: nextEmail,
        tokenHash: await hashInviteToken(token),
        expiresAt
      });

      let delivery = {
        delivered: false,
        verificationUrl: new URL("/api/admin/account/email/verify?token=" + encodeURIComponent(token), context.request.url).toString(),
        alertDelivered: false
      };

      try {
        delivery = await sendPendingEmailVerification(context.request, context.env, {
          name: user.name,
          currentEmail: authUser.email,
          pendingEmail: nextEmail,
          token,
          expiresAt
        });
      } catch (error) {
        console.error(error);
      }

      emailChange = {
        pending: true,
        email: nextEmail,
        expiresAt,
        delivered: delivery.delivered,
        verificationUrl: delivery.verificationUrl,
        alertDelivered: delivery.alertDelivered
      };
    }

    return json({ user, emailChange });
  } catch (error) {
    return handleError(error);
  }
}
