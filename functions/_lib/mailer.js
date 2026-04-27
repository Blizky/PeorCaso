import { escapeHtml } from "../../shared/markdown.js";

function buildUrl(request, pathname, params) {
  const url = new URL(pathname, request.url);

  Object.entries(params || {}).forEach(function ([key, value]) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
}

async function sendEmail(env, message) {
  const configured = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);

  if (!configured) {
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: "Bearer " + env.RESEND_API_KEY,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.RESEND_FROM_EMAIL,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      text: message.text
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("Failed to send email: " + errorText);
  }

  return true;
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
  const inviteUrl = buildUrl(request, "/admin.html", { invite: data.token });
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

  await sendEmail(env, {
    to: data.email,
    subject: inviteSubject(data.purpose),
    html: body.html,
    text: body.text
  });

  return {
    delivered: true,
    inviteUrl
  };
}

export async function sendPendingEmailVerification(request, env, data) {
  const verificationUrl = buildUrl(request, "/api/admin/account/email/verify", { token: data.token });
  const configured = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);

  if (!configured) {
    return {
      delivered: false,
      verificationUrl,
      alertDelivered: false
    };
  }

  await sendEmail(env, {
    to: data.pendingEmail,
    subject: "Verify your new PeorCaso email",
    text: [
      "Hello " + data.name + ",",
      "",
      "A request was made to move your PeorCaso account to this email address.",
      "Verify the new address by opening the link below:",
      "",
      verificationUrl,
      "",
      "This link expires on " + data.expiresAt + "."
    ].join("\n"),
    html: [
      "<p>Hello " + escapeHtml(data.name) + ",</p>",
      "<p>A request was made to move your PeorCaso account to this email address.</p>",
      '<p><a href="' + escapeHtml(verificationUrl) + '">Verify the new email</a></p>',
      "<p>This link expires on " + escapeHtml(data.expiresAt) + ".</p>"
    ].join("")
  });

  let alertDelivered = false;

  if (data.currentEmail && data.currentEmail !== data.pendingEmail) {
    try {
      alertDelivered = await sendEmail(env, {
        to: data.currentEmail,
        subject: "PeorCaso email change requested",
        text: [
          "Hello " + data.name + ",",
          "",
          "A request was made to change your PeorCaso login email from this address to " + data.pendingEmail + ".",
          "If this was you, no action is needed until the new address is verified.",
          "If this was not you, change your password immediately."
        ].join("\n"),
        html: [
          "<p>Hello " + escapeHtml(data.name) + ",</p>",
          "<p>A request was made to change your PeorCaso login email from this address to " + escapeHtml(data.pendingEmail) + ".</p>",
          "<p>If this was you, no action is needed until the new address is verified.</p>",
          "<p>If this was not you, change your password immediately.</p>"
        ].join("")
      });
    } catch (error) {
      console.error(error);
    }
  }

  return {
    delivered: true,
    verificationUrl,
    alertDelivered
  };
}

export async function sendAccountActivationEmail(request, env, data) {
  const activationUrl = buildUrl(request, "/user.html", { token: data.token });
  const configured = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);

  if (!configured) {
    return {
      delivered: false,
      activationUrl
    };
  }

  await sendEmail(env, {
    to: data.email,
    subject: "Cuenta PeorCaso.",
    text: [
      "Bienvenido o bienvenida a PeorCaso.com visita el siguente enlace para activar tu cuenta.",
      "",
      activationUrl
    ].join("\n"),
    html: [
      "<p>Bienvenido o bienvenida a PeorCaso.com visita el siguente enlace para activar tu cuenta.</p>",
      '<p><a href="' + escapeHtml(activationUrl) + '">Activar cuenta</a></p>'
    ].join("")
  });

  return {
    delivered: true,
    activationUrl
  };
}

export async function sendAccountRecoveryEmail(request, env, data) {
  const recoveryUrl = buildUrl(request, "/user.html", { token: data.token });
  const configured = Boolean(env.RESEND_API_KEY && env.RESEND_FROM_EMAIL);

  if (!configured) {
    return {
      delivered: false,
      recoveryUrl
    };
  }

  await sendEmail(env, {
    to: data.email,
    subject: "Recupera tu cuenta PeorCaso",
    text: [
      "Recibimos una solicitud para recuperar tu cuenta en PeorCaso.com.",
      "Visita el siguiente enlace para crear una nueva contraseña.",
      "",
      recoveryUrl
    ].join("\n"),
    html: [
      "<p>Recibimos una solicitud para recuperar tu cuenta en PeorCaso.com.</p>",
      "<p>Visita el siguiente enlace para crear una nueva contraseña.</p>",
      '<p><a href="' + escapeHtml(recoveryUrl) + '">Recuperar cuenta</a></p>'
    ].join("")
  });

  return {
    delivered: true,
    recoveryUrl
  };
}
