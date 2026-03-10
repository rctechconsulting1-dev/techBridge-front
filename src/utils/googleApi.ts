/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Post } from "@/types/googleBusiness";
import { getApiBaseUrl } from "@/lib/api";

export const getStoredGoogleTokens = () => {
  if (typeof window === "undefined") return null;

  return {
    access_token: localStorage.getItem("google_access_token"),
    refresh_token: localStorage.getItem("google_refresh_token"),
  };
};

export const makeGoogleApiRequest = async (
  endpoint: string,
  options: RequestInit = {},
) => {
  const tokens = getStoredGoogleTokens();

  if (!tokens || !tokens.access_token) {
    throw new Error("No Google access token available");
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Google API request failed: ${response.statusText}`);
  }

  return response.json();
};

// Example: Get user's Google profile
export const getGoogleUserProfile = async () => {
  return makeGoogleApiRequest("https://www.googleapis.com/oauth2/v2/userinfo");
};

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

// Legacy direct-call kept for reference (no longer used by the app)
export async function createGoogleBusinessPost_legacy(
  locationId: string,
  postData: any,
  clientId: number,
) {
  try {
    const clientIdInt = parseInt(clientId.toString());
    if (isNaN(clientIdInt)) {
      throw new Error("Invalid clientId format");
    }

    let accessToken = localStorage.getItem("google_access_token");

    if (!accessToken) {
      console.warn("No access token, creating mock post");
      return createMockResponse(locationId, postData, "NO_TOKEN");
    }

    if (isTokenExpired(accessToken)) {
      accessToken = await refreshGoogleToken();

      if (!accessToken) {
        console.warn("Failed to refresh token, creating mock post");
        return createMockResponse(locationId, postData, "TOKEN_REFRESH_FAILED");
      }
    }

    const gmb_response = await callGoogleMyBusinessAPI(
      locationId,
      postData,
      accessToken,
    );

    const savedPost = await fetch(`${getApiBaseUrl()}/gmb-posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location_id: locationId,
        gmb_post_id: gmb_response.name,
        post_data: postData,
        status: "published",
      }),
    }).then((r) => r.json());

    return {
      success: true,
      message: gmb_response._mockReason
        ? "Post saved to database (API not enabled)"
        : "Post created successfully on Google Business Profile",
      gmb_response,
      saved_post: savedPost,
    };
  } catch (error) {
    console.error("Error in createGoogleBusinessPost:", error);
    throw error;
  }
}

export async function callGoogleMyBusinessAPI(
  locationId: string,
  postData: any,
  accessToken: string,
) {
  try {
    const googleUrl = `https://mybusiness.googleapis.com/v4/accounts/${process.env.NEXT_PUBLIC_GOOGLE_MY_BUSINESS_ACCOUNT_ID}/locations/${locationId}/localPosts`;

    const response = await fetch(googleUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Google Business Profile API Error:", errorData);

      // Check for specific API not enabled error
      if (
        errorData?.error?.code === 403 &&
        errorData?.error?.message?.includes(
          "Google My Business API has not been used",
        )
      ) {
        console.warn("Google My Business API not enabled, using fallback mode");
        return createMockResponse(locationId, postData, "API_NOT_ENABLED");
      }

      // For other errors, still create a local record
      console.warn("Creating local record due to API error");
      return createMockResponse(locationId, postData, "API_ERROR");
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("API call failed:", error);
    return createMockResponse(locationId, postData, "NETWORK_ERROR");
  }
}

export function createMockResponse(
  locationId: string,
  postData: {
    summary: any;
    topicType: any;
    languageCode: any;
    callToAction: any;
    media: any;
    alertType: any;
  },
  reason = "FALLBACK",
) {
  return {
    name: `locations/${locationId}/localPosts/local_${Date.now()}`,
    createTime: new Date().toISOString(),
    updateTime: new Date().toISOString(),
    summary: postData.summary,
    topicType: postData.topicType,
    languageCode: postData.languageCode,
    state: "LIVE",
    callToAction: postData.callToAction,
    media: postData.media || [],
    alertType: postData.alertType || "NOT_SPECIFIED",
    _mockReason: reason, // Internal flag to track why this was mocked
  };
}

export function formatPostForAPI(post: Post) {
  // Validate required fields
  if (!post.summary || post.summary.trim() === "") {
    throw new Error("Post summary is required");
  }

  // Format the post data according to Google My Business API structure
  const formattedPost: any = {
    languageCode: post.languageCode || "en-US",
    summary: post.summary.trim(),
    topicType: post.topicType || "STANDARD",
  };

  // Add call to action if URL is provided
  if (post.callToAction?.url && post.callToAction.url.trim() !== "") {
    formattedPost.callToAction = {
      actionType: post.callToAction.actionType || "LEARN_MORE",
      url: post.callToAction.url.trim(),
    };
  }

  // Add media if present - Google My Business expects specific format
  if (post.media && post.media.length > 0) {
    formattedPost.media = post.media.map((mediaItem) => ({
      mediaFormat: mediaItem.mediaFormat || "PHOTO",
      sourceUrl: mediaItem.sourceUrl,
    }));
  }

  // Add scheduling if present
  if (post.scheduleTime && post.scheduleTime.trim() !== "") {
    formattedPost.scheduleTime = new Date(post.scheduleTime).toISOString();
  }

  // Add alert type if specified and not default
  if (post.alertType && post.alertType !== "NOT_SPECIFIED") {
    formattedPost.alertType = post.alertType;
  }

  // Add topic-specific data only if the data exists
  if (post.topicType === "EVENT" && post.event) {
    formattedPost.event = post.event;
  } else if (post.topicType === "OFFER" && post.offer) {
    formattedPost.offer = post.offer;
  } else if (post.topicType === "PRODUCT" && post.product) {
    formattedPost.product = post.product;
  }

  return formattedPost;
}

// Add helper function to check if token is expired
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch {
    return true;
  }
}

// Add helper function to refresh Google token
export async function refreshGoogleToken(): Promise<string | null> {
  try {
    const refreshToken = localStorage.getItem("google_refresh_token");
    if (!refreshToken) {
      console.error("No refresh token available");
      return null;
    }

    const response = await fetch("/api/auth/google/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error("Failed to refresh token:", response.status);
      return null;
    }

    const { accessToken } = await response.json();
    localStorage.setItem("google_access_token", accessToken);
    return accessToken;
  } catch (error) {
    console.error("Error refreshing token:", error);
    return null;
  }
}
