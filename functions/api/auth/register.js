import { handleError, HttpError, json, readJson } from "../../_lib/http.js";
import { generateInviteToken, hashInviteToken, inviteExpiresAt } from "../../_lib/invite.js";
import { sendAccountActivationEmail } from "../../_lib/mailer.js";
import { hashTemporaryPassword } from "../../_lib/password.js";
import {
  createUser,
  createUserInvite,
  getDb,
  getUserAuthByEmail,
  updateUserProfile,
  validatePeorCasoEmail
} from "../../_lib/store.js";

export async function onRequestPost(context) {
  try {
    const body = await readJson(context.request);
    const email = validatePeorCasoEmail(body.email);
    const name = String(body.name || "").trim();
    const db = getDb(context.env);
    let user = await getUserAuthByEmail(db, email);

    if (!name) {
      throw new HttpError(400, "Name is required.");
    }

    if (user && user.isActive) {
      throw new HttpError(409, "An account with that email already exists.", {
        code: "ACCOUNT_EXISTS"
      });
    }

    if (!user) {
      const temporaryPassword = await hashTemporaryPassword();

      user = await createUser(db, {
        email,
        name,
        role: "user",
        isActive: false
      }, temporaryPassword.hash, temporaryPassword.salt);
    } else if (user.name !== name) {
      user = await updateUserProfile(db, user.id, { name });
    }

    const token = generateInviteToken();
    const expiresAt = inviteExpiresAt();

    await createUserInvite(db, {
      userId: user.id,
      tokenHash: await hashInviteToken(token),
      purpose: "activate_account",
      expiresAt,
      createdBy: null
    });

    let delivery = {
      delivered: false,
      activationUrl: new URL("/user.html?token=" + encodeURIComponent(token), context.request.url).toString()
    };

    try {
      delivery = await sendAccountActivationEmail(context.request, context.env, {
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
      activationUrl: delivery.activationUrl
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
