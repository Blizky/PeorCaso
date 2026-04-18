import { escapeHtml } from "../../shared/markdown.js";

function buildAdminInviteUrl(request, token) {
  const url = new URL("/admin.html", request.url);
  url.searchParams.set("invite", token);
  return url.toString();
}

function inviteSubject(purpose) {
  return purpose === "reset_password"
    ? "Reset your PeorCaso password"
    : "Activate your PeorCaso account";
}

function inviteBody(data) {
  const intro = data.purpose === "reset_password"
    ? "A password reset was requested for your PeorCaso account."
    : "A PeorCaso account has been created for you.";
  const action = data.purpose === "reset_password"
    ? "Use the link below to choose a new password."
    : "Use the link below to choose your password and activate the account.";

  return {
    text: [
      "Hello " + data.name + ",",
      "",
      intro,
      action,
      "",
      data.inviteUrl,
      "",
      "This link expires on " + data.expiresAt + "."
    ].join("\n"),
    html: [
      "<p>Hello " + escapeHtml(data.name) + ",</p>",
      "<p>" + escapeHtml(intro) + "</p>",
      "<p>" + escapeHtml(action) + "</p>",
      '<p><a href="' + escapeHtml(data.inviteUrl) + '">Open the PeorCaso admin</a></p>',
      "<p>This link expires on " + escapeHtml(data.expiresAt) + ".</p>"
    ].join("")
  };
}

export async function sendInviteEmail(request, env, data) {
  const inviteUrl = buildAdminInviteUrl(request, data.token);
  const configured = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);

  if (!configured) {
    return {
      delivered: false,
      inviteUrl
    };
  }

  const body = inviteBody({
    ...data,
    inviteUrl
  });
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [data.email],
      subject: inviteSubject(data.purpose),
      html: body.html,
      text: body.text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to send invite email: " + errorText);
  }

  return {
    delivered: true,
    inviteUrl
  };
}
