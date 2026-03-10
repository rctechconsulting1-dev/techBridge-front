/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Post } from "@/types/google-business";

const _GOOGLE_API_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");

export async function createGoogleBusinessPost(
  locationId: string,
  postData: any,
  _clientId?: number,
) {
  try {
    const res = await fetch(`${_GOOGLE_API_URL}/google/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId, postData }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(
        (err as { error?: string }).error ||
          `Google post failed: ${res.status}`,
      );
    }
    return await res.json();
  } catch (error) {
    console.error("Error in createGoogleBusinessPost:", error);
    throw error;
  }
}

export function formatPostForAPI(post: Post) {
  if (!post.summary || post.summary.trim() === "") {
    throw new Error("Post summary is required");
  }

  const formattedPost: any = {
    languageCode: post.languageCode || "en-US",
    summary: post.summary.trim(),
    topicType: post.topicType || "STANDARD",
  };

  if (post.callToAction?.url && post.callToAction.url.trim() !== "") {
    formattedPost.callToAction = {
      actionType: post.callToAction.actionType || "LEARN_MORE",
      url: post.callToAction.url.trim(),
    };
  }

  if (post.media && post.media.length > 0) {
    formattedPost.media = post.media.map((mediaItem) => ({
      mediaFormat: mediaItem.mediaFormat || "PHOTO",
      sourceUrl: mediaItem.sourceUrl,
    }));
  }

  if (post.scheduleTime && post.scheduleTime.trim() !== "") {
    formattedPost.scheduleTime = new Date(post.scheduleTime).toISOString();
  }

  if (post.alertType && post.alertType !== "NOT_SPECIFIED") {
    formattedPost.alertType = post.alertType;
  }

  if (post.topicType === "EVENT" && post.event) {
    formattedPost.event = post.event;
  } else if (post.topicType === "OFFER" && post.offer) {
    formattedPost.offer = post.offer;
  } else if (post.topicType === "PRODUCT" && post.product) {
    formattedPost.product = post.product;
  }

  return formattedPost;
}
