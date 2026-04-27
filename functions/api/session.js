import { getCurrentUser } from "../_lib/auth.js";
import { handleError, json } from "../_lib/http.js";

export async function onRequestGet(context) {
  try {
    const user = await getCurrentUser(context.request, context.env);

    return json({
      authenticated: Boolean(user),
      user
    });
  } catch (error) {
    return handleError(error);
  }
}
