import { handleError, HttpError, json } from "../../_lib/http.js";
import { hashInviteToken } from "../../_lib/invite.js";
import { getDb, getOpenInviteByTokenHash } from "../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const token = String(new URL(context.request.url).searchParams.get("token") || "").trim();

    if (!token) {
      throw new HttpError(400, "Token is required.");
    }

    const invite = await getOpenInviteByTokenHash(getDb(context.env), await hashInviteToken(token));

    if (!invite || !["activate_account", "reset_password"].includes(invite.purpose)) {
      throw new HttpError(404, "This link is invalid or expired.");
    }

    return json({
      token: {
        email: invite.email,
        name: invite.name,
        purpose: invite.purpose,
        expiresAt: invite.expiresAt
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
