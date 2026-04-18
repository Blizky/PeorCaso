import { handleError, HttpError, json } from "../../_lib/http.js";
import { hashInviteToken, inviteActionLabel } from "../../_lib/invite.js";
import { getDb, getOpenInviteByTokenHash } from "../../_lib/store.js";

export async function onRequestGet(context) {
  try {
    const token = String(new URL(context.request.url).searchParams.get("token") || "").trim();

    if (!token) {
      throw new HttpError(400, "Invite token is required.");
    }

    const invite = await getOpenInviteByTokenHash(getDb(context.env), await hashInviteToken(token));

    if (!invite) {
      throw new HttpError(404, "This invite link is invalid or expired.");
    }

    return json({
      invite: {
        email: invite.email,
        name: invite.name,
        accessLevel: invite.accessLevel,
        purpose: invite.purpose,
        purposeLabel: inviteActionLabel(invite.purpose),
        expiresAt: invite.expiresAt
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
