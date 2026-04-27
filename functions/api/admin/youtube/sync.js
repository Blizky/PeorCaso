import { requireUser } from "../../../_lib/auth.js";
import { handleError, HttpError, json, readJson } from "../../../_lib/http.js";
import {
  createPost,
  getDb,
  getImportedPostIdByYoutubeVideoId,
  getPost,
  updatePost,
  upsertYoutubeVideoImport,
  validatePostInput
} from "../../../_lib/store.js";
import { slugify } from "../../../../shared/markdown.js";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getYouTubeConfig(env) {
  const apiKey = String(env.YOUTUBE_API_KEY || "").trim();
  const defaultPlaylistId = String(env.YOUTUBE_PLAYLIST_ID || "").trim();

  if (!apiKey) {
    throw new HttpError(500, "Missing YOUTUBE_API_KEY binding.");
  }

  return {
    apiKey,
    defaultPlaylistId
  };
}

function normalizePlaylistId(value, fallback) {
  const raw = String(value || fallback || "").trim();

  if (!raw) {
    throw new HttpError(400, "Playlist ID or URL is required.");
  }

  try {
    const parsed = new URL(raw);
    const fromQuery = String(parsed.searchParams.get("list") || "").trim();

    if (fromQuery) {
      return fromQuery;
    }
  } catch (error) {
    // Treat the raw value as a playlist ID when it is not a URL.
  }

  if (!/^[A-Za-z0-9_-]{10,}$/.test(raw)) {
    throw new HttpError(400, "Playlist ID looks invalid.");
  }

  return raw;
}

function pickThumbnail(thumbnails) {
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    ""
  );
}

function formatIsoDuration(value) {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i.exec(String(value || ""));

  if (!match) {
    return "";
  }

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0) + days * 24;
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);
  const parts = [];

  if (hours) {
    parts.push(String(hours));
  }

  if (hours) {
    parts.push(String(minutes).padStart(2, "0"));
  } else if (minutes) {
    parts.push(String(minutes));
  }

  parts.push(String(seconds).padStart(parts.length ? 2 : 1, "0"));

  return parts.join(":");
}

function buildVideoMarkdown(video, playlistId) {
  const title = String(video.snippet?.title || "").trim();
  const description = String(video.snippet?.description || "").trim();
  const watchUrl = "https://www.youtube.com/watch?v=" + video.id + "&list=" + playlistId;
  const duration = formatIsoDuration(video.contentDetails?.duration);
  const publishedAt = String(video.snippet?.publishedAt || "").trim();
  const intro = [
    "[Watch on YouTube](" + watchUrl + ")",
    duration ? "Duration: " + duration : "",
    publishedAt ? "Published: " + publishedAt.slice(0, 10) : ""
  ].filter(Boolean).join("  \n");

  return [
    "# " + title,
    intro,
    description || "Video imported from YouTube."
  ].filter(Boolean).join("\n\n");
}

async function fetchJson(url, errorMessage) {
  const response = await fetch(url);
  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch (error) {
    payload = null;
  }

  if (!response.ok) {
    throw new HttpError(response.status, errorMessage, payload || text);
  }

  return payload;
}

async function fetchPlaylistItems(apiKey, playlistId) {
  const items = [];
  let pageToken = "";

  while (true) {
    const url = new URL(YOUTUBE_API_BASE + "/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);

    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const payload = await fetchJson(url.toString(), "YouTube playlist fetch failed.");
    items.push(...(payload.items || []));

    if (!payload.nextPageToken) {
      break;
    }

    pageToken = payload.nextPageToken;
  }

  return items;
}

async function fetchVideos(apiKey, videoIds) {
  const items = [];

  for (let index = 0; index < videoIds.length; index += 50) {
    const chunk = videoIds.slice(index, index + 50);
    const url = new URL(YOUTUBE_API_BASE + "/videos");
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    const payload = await fetchJson(url.toString(), "YouTube video fetch failed.");
    items.push(...(payload.items || []));
  }

  return items;
}

function buildImportedPostInput(video, playlistId, categoryId, status) {
  const title = String(video.snippet?.title || "").trim();
  const publishedAt = String(video.snippet?.publishedAt || "").trim().slice(0, 10);
  const imageUrl = pickThumbnail(video.snippet?.thumbnails);
  const slugBase = slugify(title) || "video";

  return validatePostInput({
    categoryId,
    title,
    slug: slugBase + "-" + String(video.id).toLowerCase(),
    postDate: publishedAt,
    imageUrl,
    imageAlt: title,
    videoUrl: "https://www.youtube.com/watch?v=" + video.id + "&list=" + playlistId,
    likes: 0,
    contentMarkdown: buildVideoMarkdown(video, playlistId),
    status
  });
}

export async function onRequestPost(context) {
  try {
    const currentUser = await requireUser(context, "admin");
    const body = await readJson(context.request);
    const config = getYouTubeConfig(context.env);
    const playlistId = normalizePlaylistId(body.playlistId, config.defaultPlaylistId);
    const categoryId = Number(body.categoryId);
    const status = String(body.status || "visible").trim().toLowerCase();
    const db = getDb(context.env);
    const playlistItems = await fetchPlaylistItems(config.apiKey, playlistId);
    const videoIds = Array.from(new Set(
      playlistItems
        .map(function (item) {
          return item.contentDetails?.videoId || item.snippet?.resourceId?.videoId || "";
        })
        .filter(Boolean)
    ));

    if (!videoIds.length) {
      return json({
        summary: {
          created: 0,
          updated: 0,
          skipped: 0
        }
      });
    }

    const videos = await fetchVideos(config.apiKey, videoIds);
    const sortedVideos = videos
      .filter(function (video) {
        return video.status?.privacyStatus === "public";
      })
      .sort(function (left, right) {
        return String(right.snippet?.publishedAt || "").localeCompare(String(left.snippet?.publishedAt || ""));
      });
    const summary = {
      created: 0,
      updated: 0,
      skipped: videoIds.length - sortedVideos.length
    };

    for (const video of sortedVideos) {
      const input = buildImportedPostInput(video, playlistId, categoryId, status);
      const existingPostId = await getImportedPostIdByYoutubeVideoId(db, video.id);
      let post = null;

      if (existingPostId) {
        const existingPost = await getPost(db, existingPostId);
        post = await updatePost(db, existingPostId, {
          ...input,
          likes: existingPost.likes,
          approvedBy: input.status === "visible" ? (existingPost.approvedBy?.id || currentUser.id) : null,
          approvedAt: input.status === "visible" ? (existingPost.approvedAt || new Date().toISOString()) : null
        });
        summary.updated += 1;
      } else {
        post = await createPost(db, {
          ...input,
          authorId: currentUser.id,
          approvedBy: input.status === "visible" ? currentUser.id : null,
          approvedAt: input.status === "visible" ? new Date().toISOString() : null
        });
        summary.created += 1;
      }

      await upsertYoutubeVideoImport(db, {
        videoId: video.id,
        playlistId,
        postId: post.id
      });
    }

    return json({ summary });
  } catch (error) {
    return handleError(error);
  }
}
