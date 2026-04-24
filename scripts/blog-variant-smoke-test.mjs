import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_API_URL = process.env.SMOKE_API_URL || "http://localhost:5000/api";
const DEFAULT_PUBLIC_URL = process.env.SMOKE_PUBLIC_URL || "http://localhost:3000";
const PUBLIC_WAIT_TIMEOUT_MS = 15_000;
const PUBLIC_WAIT_INTERVAL_MS = 1_000;

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const websiteId = Number(required("SMOKE_WEBSITE_ID"));
const tenantId = Number(required("SMOKE_TENANT_ID"));

if (!Number.isFinite(websiteId) || websiteId <= 0) {
  throw new Error("SMOKE_WEBSITE_ID must be a positive number");
}

if (!Number.isFinite(tenantId) || tenantId <= 0) {
  throw new Error("SMOKE_TENANT_ID must be a positive number");
}

const runId = `${Date.now()}`;
const slugBase = `smoke-blog-${runId}`;
const parentSlug = `${slugBase}`;
const postOneSlug = `${slugBase}-post-one`;
const postTwoSlug = `${slugBase}-post-two`;
const parentTitle = `Smoke Blog ${runId.slice(-6)}`;
const postOneTitle = `Smoke Blog Post One ${runId.slice(-6)}`;
const postTwoTitle = `Smoke Blog Post Two ${runId.slice(-6)}`;
const createdPages = [];
let activeToken = null;
const VARIANT_EXPECTATIONS = [
  {
    value: "editorial_grid",
    marker: "Publish useful content without looking generic",
  },
  {
    value: "featured_stack",
    marker: "Featured Post",
  },
  {
    value: "compact_rows",
    marker: "Fresh content built for search and trust",
  },
];

const loadEnvValue = (name) => {
  if (process.env[name]) {
    return process.env[name];
  }

  for (const candidate of [".env.local", ".env", ".env.production"]) {
    const filePath = path.resolve(process.cwd(), candidate);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex <= 0) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      if (key !== name) {
        continue;
      }

      let value = trimmed.slice(separatorIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      return value;
    }
  }

  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (requestPath, { method = "GET", token, body, publicRequest = false } = {}) => {
  const baseUrl = publicRequest ? DEFAULT_PUBLIC_URL : DEFAULT_API_URL;
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method,
    headers: {
      ...(publicRequest ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(publicRequest ? {} : { "x-tenant-id": String(tenantId) }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    throw new Error(`${method} ${requestPath} failed with ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }

  return data;
};

const getAuthToken = async () => {
  if (process.env.SMOKE_AUTH_TOKEN) {
    return process.env.SMOKE_AUTH_TOKEN;
  }

  const email = process.env.SMOKE_EMAIL;
  const password = process.env.SMOKE_PASSWORD;

  if (!email || !password) {
    throw new Error("Set SMOKE_AUTH_TOKEN or both SMOKE_EMAIL and SMOKE_PASSWORD.");
  }

  const response = await request("/auth/signin", {
    method: "POST",
    body: { email, password },
  });

  if (!response?.token) {
    throw new Error("Sign-in succeeded without returning a token.");
  }

  return response.token;
};

const createPage = async (token, payload) => {
  const page = await request("/pages", {
    method: "POST",
    token,
    body: payload,
  });
  createdPages.push(page);
  return page;
};

const deletePage = async (token, id) => {
  await request(`/pages/${id}`, {
    method: "DELETE",
    token,
  });
};

const updatePage = async (token, id, payload) => {
  return request(`/pages/${id}`, {
    method: "PUT",
    token,
    body: payload,
  });
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const triggerWebsiteRevalidation = async (currentWebsiteId) => {
  const secret = loadEnvValue("CMS_REVALIDATION_SECRET");
  if (!secret) {
    return false;
  }

  const body = JSON.stringify({ websiteId: String(currentWebsiteId) });
  const signature = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const response = await fetch(`${DEFAULT_PUBLIC_URL}/api/revalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-revalidation-secret": secret,
      "x-revalidation-signature": signature,
    },
    body,
  });

  return response.ok;
};

const waitForPublicPage = async (slug, expectedText) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < PUBLIC_WAIT_TIMEOUT_MS) {
    try {
      const html = await request(`/sites/${websiteId}/${slug}`, { publicRequest: true });
      if (typeof html === "string" && html.includes(expectedText)) {
        return html;
      }
    } catch {
      // retry until timeout
    }

    await sleep(PUBLIC_WAIT_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for public page /sites/${websiteId}/${slug} to contain ${expectedText}`);
};

const findPageBySlug = async (token, slug) => {
  const pages = await request(`/pages?website_id=${websiteId}`, { token });
  return Array.isArray(pages) ? pages.find((page) => page.slug === slug) : null;
};

const assertChildBlogPosts = async (token, parentId) => {
  const pages = await request(`/pages?website_id=${websiteId}`, { token });
  const childPosts = Array.isArray(pages)
    ? pages.filter((page) => page.page_type === "blog-post" && page.parent_id === parentId)
    : [];

  assert(
    childPosts.some((page) => page.slug === postOneSlug && page.title === postOneTitle),
    `Expected child blog post ${postOneSlug} to exist under parent ${parentId}`,
  );
  assert(
    childPosts.some((page) => page.slug === postTwoSlug && page.title === postTwoTitle),
    `Expected child blog post ${postTwoSlug} to exist under parent ${parentId}`,
  );
};

const assertVariantState = async ({ token, slug, variant, marker }) => {
  const fetchedParent = await findPageBySlug(token, slug);
  assert(fetchedParent, `Blog parent ${slug} was not returned by the pages API.`);
  assert(
    fetchedParent.presentation?.sectionVariants?.blogList === variant,
    `Expected blog parent presentation.sectionVariants.blogList to equal ${variant}, received ${JSON.stringify(fetchedParent.presentation)}`,
  );

  await triggerWebsiteRevalidation(websiteId);
  const html = await waitForPublicPage(slug, marker);
  assert(typeof html === "string" && html.includes(marker), `Expected public blog list page to render marker ${marker}`);
};

try {
  activeToken = await getAuthToken();
  console.log(`Authenticated for tenant ${tenantId}; testing website ${websiteId}.`);

  const blogParent = await createPage(activeToken, {
    website_id: websiteId,
    title: parentTitle,
    slug: parentSlug,
    page_type: "blog-category",
    template_type: "blog-list",
    is_enabled: true,
    is_published: true,
    nav_placement: "hidden",
    nav_style: "direct",
    presentation: {
      sectionVariants: {
        blogList: VARIANT_EXPECTATIONS[0].value,
      },
    },
  });

  await createPage(activeToken, {
    website_id: websiteId,
    title: postOneTitle,
    slug: postOneSlug,
    page_type: "blog-post",
    template_type: "blog-post",
    parent_id: blogParent.id,
    is_enabled: true,
    is_published: true,
    nav_placement: "hidden",
    nav_style: "direct",
    content: "# Smoke Blog Post One\n\nThis is the featured smoke article.",
  });

  await createPage(activeToken, {
    website_id: websiteId,
    title: postTwoTitle,
    slug: postTwoSlug,
    page_type: "blog-post",
    template_type: "blog-post",
    parent_id: blogParent.id,
    is_enabled: true,
    is_published: true,
    nav_placement: "hidden",
    nav_style: "direct",
    content: "# Smoke Blog Post Two\n\nThis is the secondary smoke article.",
  });

  await assertChildBlogPosts(activeToken, blogParent.id);

  await assertVariantState({
    token: activeToken,
    slug: parentSlug,
    variant: VARIANT_EXPECTATIONS[0].value,
    marker: VARIANT_EXPECTATIONS[0].marker,
  });

  for (const variant of VARIANT_EXPECTATIONS.slice(1)) {
    await updatePage(activeToken, blogParent.id, {
      title: blogParent.title,
      slug: parentSlug,
      content: blogParent.content || null,
      website_id: websiteId,
      page_type: "blog-category",
      template_type: "blog-list",
      parent_id: null,
      is_main_nav: false,
      is_enabled: true,
      is_required: false,
      nav_placement: "hidden",
      nav_style: "direct",
      nav_parent_id: null,
      nav_order: 0,
      nav_label: blogParent.title,
      is_external_link: false,
      navigation_assignments: [],
      is_published: true,
      sort_order: 0,
      meta_description: null,
      meta_keywords: null,
      presentation: {
        sectionVariants: {
          blogList: variant.value,
        },
      },
    });

    await assertVariantState({
      token: activeToken,
      slug: parentSlug,
      variant: variant.value,
      marker: variant.marker,
    });
  }

  console.log("Smoke test passed: blog parent variants persist through the pages API, update after creation, and render all supported public blog list layouts.");
} finally {
  const cleanupToken = activeToken;
  if (cleanupToken) {
    for (const page of [...createdPages].reverse()) {
      try {
        await deletePage(cleanupToken, page.id);
      } catch (error) {
        console.error(`Cleanup failed for page ${page.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}