import { createLogoutHeaders } from "../../_lib/auth.js";

export async function onRequestPost(context) {
  return new Response(null, {
    status: 204,
    headers: createLogoutHeaders(context.request)
  });
}
