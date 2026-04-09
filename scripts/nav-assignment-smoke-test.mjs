import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DEFAULT_API_URL = process.env.SMOKE_API_URL || "http://localhost:5000/api";
const DEFAULT_PUBLIC_URL = process.env.SMOKE_PUBLIC_URL || "http://localhost:3002";
const PUBLIC_WAIT_TIMEOUT_MS = 15_000;
const PUBLIC_WAIT_WITHOUT_REVALIDATION_TIMEOUT_MS = 75_000;
const PUBLIC_WAIT_INTERVAL_MS = 1_000;

const args = new Set(process.argv.slice(2));

if (args.has("--help")) {
  console.log(`Usage: npm run smoke:nav

Required environment:
  SMOKE_WEBSITE_ID=<website id>
  SMOKE_TENANT_ID=<tenant id>

Authentication:
  Either set SMOKE_AUTH_TOKEN=<bearer token>
  or set both SMOKE_EMAIL=<email> and SMOKE_PASSWORD=<password>

Optional environment:
  SMOKE_API_URL=http://localhost:5000/api
  SMOKE_PUBLIC_URL=http://localhost:3002
  SMOKE_KEEP_PAGES=1

What it does:
  1. Authenticates against the backend
  2. Creates temporary direct/header, dropdown parent, dropdown child, and footer pages
  3. Verifies navigation_assignments from the pages API
  4. Verifies public-site HTML contains the expected labels and hrefs
  5. Deletes the temporary pages unless SMOKE_KEEP_PAGES=1
`);
  process.exit(0);
}

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const websiteId = Number(required("SMOKE_WEBSITE_ID"));
const tenantId = Number(required("SMOKE_TENANT_ID"));
const keepPages = process.env.SMOKE_KEEP_PAGES === "1";

if (!Number.isFinite(websiteId) || websiteId <= 0) {
  throw new Error("SMOKE_WEBSITE_ID must be a positive number");
}

if (!Number.isFinite(tenantId) || tenantId <= 0) {
  throw new Error("SMOKE_TENANT_ID must be a positive number");
}

const runId = `${Date.now()}`;
const slugBase = `smoke-nav-${runId}`;
const labelBase = `Smoke Nav ${runId.slice(-6)}`;

const createdPages = [];

const loadEnvValue = (name) => {
  if (process.env[name]) {
    return process.env[name];
  }

  const candidates = [".env.local", ".env", ".env.production"];

  for (const candidate of candidates) {
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
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value;
    }
  }

  return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const request = async (path, { method = "GET", token, body, publicRequest = false } = {}) => {
  const baseUrl = publicRequest ? DEFAULT_PUBLIC_URL : DEFAULT_API_URL;
  const response = await fetch(`${baseUrl}${path}`, {
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
    throw new Error(`${method} ${path} failed with ${response.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
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

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const assertAssignment = (page, placement, style, parentPageId = null) => {
  const assignment = Array.isArray(page.navigation_assignments)
    ? page.navigation_assignments.find((item) => item.placement === placement && item.style === style)
    : null;

  assert(assignment, `Missing ${placement}/${style} navigation assignment for page ${page.slug}`);

  if (style === "dropdown_child") {
    assert(
      assignment.parent_page_id === parentPageId,
      `Expected dropdown child ${page.slug} to reference parent page ${parentPageId}, received ${assignment.parent_page_id}`,
    );
  }
};

const verifyHtmlContains = (html, expected, description) => {
  assert(html.includes(expected), `Expected ${description} to contain ${expected}`);
};

const triggerWebsiteRevalidation = async (websiteId) => {
  const secret = loadEnvValue("CMS_REVALIDATION_SECRET");
  if (!secret) {
    return false;
  }

  const body = JSON.stringify({ websiteId: String(websiteId) });
  const signature =
    "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
  const response = await fetch(`${DEFAULT_PUBLIC_URL}/api/revalidate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-revalidation-secret": secret,
      "x-revalidation-signature": signature,
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to revalidate website ${websiteId}: ${response.status} ${text}`);
  }

  return true;
};

const waitForPublicHtml = async (
  path,
  expectedValues,
  description,
  timeoutMs = PUBLIC_WAIT_TIMEOUT_MS,
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const html = await request(path, { publicRequest: true });
    if (expectedValues.every((value) => html.includes(value))) {
      return html;
    }

    await sleep(PUBLIC_WAIT_INTERVAL_MS);
  }

  const html = await request(path, { publicRequest: true });
  const missing = expectedValues.filter((value) => !html.includes(value));
  throw new Error(`Expected ${description} to contain ${missing.join(", ")}`);
};

const run = async () => {
  const token = await getAuthToken();

  console.log(`Authenticated for tenant ${tenantId}; testing website ${websiteId}.`);

  const direct = await createPage(token, {
    website_id: websiteId,
    title: `${labelBase} Direct`,
    slug: `${slugBase}-direct`,
    page_type: "main-page",
    template_type: "standard",
    parent_id: null,
    is_main_nav: true,
    is_enabled: true,
    is_published: true,
    nav_placement: "header",
    nav_style: "direct",
    nav_order: 110,
    nav_label: `${labelBase} Direct`,
    is_external_link: false,
    content: "Smoke test direct page",
    navigation_assignments: [
      {
        placement: "header",
        style: "direct",
        parent_page_id: null,
        sort_order: 110,
        label: `${labelBase} Direct`,
        is_active: true,
      },
    ],
  });

  const dropdownParent = await createPage(token, {
    website_id: websiteId,
    title: `${labelBase} Group`,
    slug: `${slugBase}-group`,
    page_type: "main-page",
    template_type: "standard",
    parent_id: null,
    is_main_nav: true,
    is_enabled: true,
    is_published: true,
    nav_placement: "header",
    nav_style: "dropdown_parent",
    nav_order: 120,
    nav_label: `${labelBase} Group`,
    is_external_link: false,
    content: "Smoke test dropdown parent page",
    navigation_assignments: [
      {
        placement: "header",
        style: "dropdown_parent",
        parent_page_id: null,
        sort_order: 120,
        label: `${labelBase} Group`,
        is_active: true,
      },
    ],
  });

  const dropdownChild = await createPage(token, {
    website_id: websiteId,
    title: `${labelBase} Child`,
    slug: `${slugBase}-child`,
    page_type: "main-page",
    template_type: "standard",
    parent_id: null,
    is_main_nav: false,
    is_enabled: true,
    is_published: true,
    nav_placement: "header",
    nav_style: "dropdown_child",
    nav_parent_id: dropdownParent.id,
    nav_order: 121,
    nav_label: `${labelBase} Child`,
    is_external_link: false,
    content: "Smoke test dropdown child page",
    navigation_assignments: [
      {
        placement: "header",
        style: "dropdown_child",
        parent_page_id: dropdownParent.id,
        sort_order: 121,
        label: `${labelBase} Child`,
        is_active: true,
      },
    ],
  });

  const footer = await createPage(token, {
    website_id: websiteId,
    title: `${labelBase} Footer`,
    slug: `${slugBase}-footer`,
    page_type: "main-page",
    template_type: "standard",
    parent_id: null,
    is_main_nav: false,
    is_enabled: true,
    is_published: true,
    nav_placement: "footer",
    nav_style: "direct",
    nav_order: 130,
    nav_label: `${labelBase} Footer`,
    is_external_link: false,
    content: "Smoke test footer page",
    navigation_assignments: [
      {
        placement: "footer",
        style: "direct",
        parent_page_id: null,
        sort_order: 130,
        label: `${labelBase} Footer`,
        is_active: true,
      },
    ],
  });

  const pages = await request(`/pages?website_id=${websiteId}`, { token });
  const bySlug = new Map(Array.isArray(pages) ? pages.map((page) => [page.slug, page]) : []);

  assert(bySlug.has(direct.slug), `Created direct page ${direct.slug} was not returned from the pages API.`);
  assert(bySlug.has(dropdownParent.slug), `Created dropdown parent page ${dropdownParent.slug} was not returned from the pages API.`);
  assert(bySlug.has(dropdownChild.slug), `Created dropdown child page ${dropdownChild.slug} was not returned from the pages API.`);
  assert(bySlug.has(footer.slug), `Created footer page ${footer.slug} was not returned from the pages API.`);

  assertAssignment(bySlug.get(direct.slug), "header", "direct");
  assertAssignment(bySlug.get(dropdownParent.slug), "header", "dropdown_parent");
  assertAssignment(bySlug.get(dropdownChild.slug), "header", "dropdown_child", dropdownParent.id);
  assertAssignment(bySlug.get(footer.slug), "footer", "direct");

  const revalidated = await triggerWebsiteRevalidation(websiteId);
  const publicWaitTimeoutMs = revalidated
    ? PUBLIC_WAIT_TIMEOUT_MS
    : PUBLIC_WAIT_WITHOUT_REVALIDATION_TIMEOUT_MS;

  const publicHomeHtml = await waitForPublicHtml(
    `/sites/${websiteId}`,
    [
      `${labelBase} Direct`,
      `${labelBase} Group`,
      `${labelBase} Child`,
      `${labelBase} Footer`,
    ],
    "public homepage HTML",
    publicWaitTimeoutMs,
  );
  verifyHtmlContains(publicHomeHtml, `/sites/${websiteId}/${direct.slug}`, "public homepage HTML");
  verifyHtmlContains(publicHomeHtml, `/sites/${websiteId}/${dropdownParent.slug}`, "public homepage HTML");
  verifyHtmlContains(publicHomeHtml, `/sites/${websiteId}/${dropdownChild.slug}`, "public homepage HTML");
  verifyHtmlContains(publicHomeHtml, `/sites/${websiteId}/${footer.slug}`, "public homepage HTML");

  const childPageHtml = await waitForPublicHtml(
    `/sites/${websiteId}/${dropdownChild.slug}`,
    [`${labelBase} Group`, `${labelBase} Child`],
    "dropdown child route HTML",
    publicWaitTimeoutMs,
  );
  verifyHtmlContains(childPageHtml, `${labelBase} Group`, "dropdown child route HTML");
  verifyHtmlContains(childPageHtml, `${labelBase} Child`, "dropdown child route HTML");

  console.log("Smoke test passed: page-managed navigation assignments render through the pages API and public site routes.");
};

try {
  await run();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (!keepPages) {
    const token = process.env.SMOKE_AUTH_TOKEN;
    const email = process.env.SMOKE_EMAIL;
    const password = process.env.SMOKE_PASSWORD;

    try {
      const cleanupToken = token || (email && password ? await getAuthToken() : null);

      if (cleanupToken) {
        for (const page of createdPages.toReversed()) {
          if (page?.id) {
            try {
              await deletePage(cleanupToken, page.id);
            } catch (cleanupError) {
              console.error(`Cleanup failed for page ${page.id}: ${cleanupError instanceof Error ? cleanupError.message : cleanupError}`);
            }
          }
        }
      }
    } catch (cleanupSetupError) {
      console.error(`Cleanup setup failed: ${cleanupSetupError instanceof Error ? cleanupSetupError.message : cleanupSetupError}`);
    }
  }
}