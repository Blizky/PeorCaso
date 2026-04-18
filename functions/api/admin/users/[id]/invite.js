import { canManageUsers, requireUser } from "../../../../_lib/auth.js";
import { handleError, HttpError, json } from "../../../../_lib/http.js";
import { generateInviteToken, hashInviteToken, inviteExpiresAt } from "../../../../_lib/invite.js";
import { sendInviteEmail } from "../../../../_lib/mailer.js";
import {
  createUserInvite,
  getDb,
  getUserById,
  getUserPendingInvite
} from "../../../../_lib/store.js";

function parseId(params) {
  return Number(params.id);
}

export async function onRequestPost(context) {
  try {
    const currentUser = await requireUser(context, 1);

    if (!canManageUsers(currentUser)) {
      throw new HttpError(403, "Insufficient permissions.");
    }

    const db = getDb(context.env);
    const user = await getUserById(db, parseId(context.params));
    const pendingInvite = await getUserPendingInvite(db, user.id);
    const purpose = pendingInvite && pendingInvite.purpose === "invite"
      ? "invite"
      : "reset_password";
    const token = generateInviteToken();
    const expiresAt = inviteExpiresAt();

    await createUserInvite(db, {
      userId: user.id,
      tokenHash: await hashInviteToken(token),
      purpose,
      expiresAt,
      createdBy: currentUser.id
    });

    let delivery = {
      delivered: false,
      inviteUrl: new URL("/admin.html?invite=" + encodeURIComponent(token), context.request.url).toString()
    };
    let deliveryError = null;

    try {
      delivery = await sendInviteEmail(context.request, context.env, {
        email: user.email,
        name: user.name,
        purpose,
        token,
        expiresAt
      });
    } catch (error) {
      console.error(error);
      deliveryError = "The link was created, but the email could not be sent.";
    }

    return json({
      user,
      invite: {
        purpose,
        delivered: delivery.delivered,
        url: delivery.inviteUrl,
        expiresAt,
        error: deliveryError
      }
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
