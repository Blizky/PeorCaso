import { requireUser } from "../../_lib/auth.js";
import { HttpError, handleError, json, readJson } from "../../_lib/http.js";
import { slugify } from "../../../shared/markdown.js";

function getGitHubConfig(env) {
  const token = String(env.GITHUB_TOKEN || "").trim();
  const owner = String(env.GITHUB_OWNER || "").trim();
  const repo = String(env.GITHUB_REPO || "").trim();
  const branch = String(env.GITHUB_BRANCH || "main").trim();

  if (!token || !owner || !repo) {
    throw new HttpError(500, "Missing GitHub upload bindings.");
  }

  return { token, owner, repo, branch };
}

function buildGitHubPath(fileName) {
  const baseName = slugify(fileName.replace(/\.[^.]+$/, "")) || "image";
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const stamp = String(now.getTime());

  return "assets/uploads/" + year + "/" + month + "/" + stamp + "-" + baseName + ".jpg";
}

export async function onRequestPost(context) {
  try {
    await requireUser(context, "admin");

    const body = await readJson(context.request);
    const fileName = String(body.fileName || "").trim();
    const contentBase64 = String(body.contentBase64 || "").trim();

    if (!fileName || !contentBase64) {
      throw new HttpError(400, "Image upload payload is incomplete.");
    }

    const github = getGitHubConfig(context.env);
    const path = buildGitHubPath(fileName);
    const url = "https://api.github.com/repos/" + github.owner + "/" + github.repo + "/contents/" + path;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        accept: "application/vnd.github+json",
        authorization: "Bearer " + github.token,
        "content-type": "application/json",
        "user-agent": "PeorCaso-Admin"
      },
      body: JSON.stringify({
        message: "Upload optimized image " + path,
        branch: github.branch,
        content: contentBase64
      })
    });

    if (!response.ok) {
      throw new HttpError(response.status, "GitHub upload failed.", await response.text());
    }

    return json({
      image: {
        path,
        url: "https://raw.githubusercontent.com/" + github.owner + "/" + github.repo + "/" + github.branch + "/" + path
      }
    }, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
