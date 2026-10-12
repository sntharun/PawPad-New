import { test, expect } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

const samplePosts = JSON.parse(readFileSync("api/lib/sample-blog-posts.json", "utf8"));

test("local hosting shows starter blogs when the old API has no blog endpoint", async ({ page }) => {
  await page.route("https://api.pawpad.in/**", async (route) => {
    await route.fulfill({ status: 405, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify({ ok: false, error: "Use POST." }) });
  });
  await page.goto("/blog.html");
  await expect(page.locator(".blog-card")).toHaveCount(samplePosts.length);
  await page.getByRole("link", { name: new RegExp(samplePosts[0].title) }).click();
  await expect(page.getByRole("heading", { level: 1, name: samplePosts[0].title })).toBeVisible();
  expect(await page.locator(".blog-cover img").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
});

test("the published API list replaces local starter blogs", async ({ page }) => {
  await page.route("https://api.pawpad.in/**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const data = action === "list_blog_posts" ? { ok: true, posts: [] } : { ok: true, content: {}, version: "" };
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(data) });
  });
  await page.goto("/blog.html");
  await expect(page.locator(".blog-card")).toHaveCount(0);
  await expect(page.getByText("New stories are coming soon.")).toBeVisible();
});

test("an API 404 hides a local sample article", async ({ page }) => {
  await page.route("https://api.pawpad.in/**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const missing = action === "get_blog_post";
    await route.fulfill({ status: missing ? 404 : 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(missing ? { ok: false, error: "Not found" } : { ok: true, content: {}, version: "" }) });
  });
  await page.goto(`/blog.html?post=${samplePosts[0].slug}`);
  await expect(page.getByText("This article is not available.")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: samplePosts[0].title })).toHaveCount(0);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("sample articles use real images and render as published blog posts", async ({ page }) => {
  expect(samplePosts).toHaveLength(3);
  expect(new Set(samplePosts.map((item) => item.slug)).size).toBe(samplePosts.length);
  for (const item of samplePosts) {
    expect(item.summary).toBeTruthy();
    expect(item.seoTitle).toBeTruthy();
    expect(item.seoDescription).toBeTruthy();
    expect(item.keywords).toBeTruthy();
    expect(item.sections.some((section) => section.text)).toBe(true);
    for (const image of [{ imageUrl: item.coverUrl, imageAlt: item.coverAlt }, ...item.sections]) {
      if (!image.imageUrl) continue;
      expect(image.imageAlt).toBeTruthy();
      expect(existsSync(image.imageUrl)).toBe(true);
    }
  }
  const published = samplePosts.map((item, index) => ({
    ...item, id: index + 1, publishedAt: "2026-10-11T10:00:00.000Z", updatedAt: "2026-10-11T10:00:00.000Z"
  }));
  await page.route("https://api.pawpad.in/**", async (route) => {
    const url = new URL(route.request().url());
    const action = url.searchParams.get("action");
    const item = published.find((row) => row.slug === url.searchParams.get("slug"));
    const data = action === "get_content" ? { ok: true, content: {}, version: "" }
      : action === "list_blog_posts" ? { ok: true, posts: published }
      : action === "get_blog_post" && item ? { ok: true, post: item }
      : { ok: false, error: "Not found" };
    await route.fulfill({ status: data.ok ? 200 : 404, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(data) });
  });
  await page.goto("/blog.html");
  await expect(page.locator(".blog-card")).toHaveCount(3);
  for (const item of published) {
    await page.goto(`/blog.html?post=${item.slug}`);
    await expect(page.getByRole("heading", { level: 1, name: item.title })).toBeVisible();
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", item.seoDescription);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://pawpad.in/blog.html?post=${item.slug}`);
    await expect(page.locator(".blog-cover img")).toHaveAttribute("src", item.coverUrl);
    expect(await page.locator(".blog-cover img").evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true);
  }
});

const post = {
  id: 1, slug: "gentle-dog-grooming", title: "Gentle Dog Grooming", summary: "Calm grooming habits for dogs in Bengaluru.",
  coverUrl: "/assets/img/pawpad/landing-page-cover.png", coverAlt: "Dog being groomed calmly", coverCaption: "Gentle handling",
  seoTitle: "Gentle Dog Grooming in Bengaluru", seoDescription: "A practical guide to gentle dog grooming in Bengaluru.",
  author: "Pawpad", publishedAt: "2026-10-10T10:00:00.000Z", updatedAt: "2026-10-11T10:00:00.000Z",
  sections: [{ heading: "Start slowly", text: "Let the dog settle before grooming.", imageUrl: "", imageAlt: "", imageCaption: "" }]
};

test("published post renders with canonical and structured data", async ({ page }) => {
  await page.route("https://api.pawpad.in/**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const data = action === "get_content" ? { ok: true, content: {}, version: "" }
      : action === "list_blog_posts" ? { ok: true, posts: [post] }
      : action === "get_blog_post" ? { ok: true, post }
      : { ok: true };
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" }, body: JSON.stringify(data) });
  });
  await page.goto("/blog.html");
  await expect(page.getByRole("link", { name: /Gentle Dog Grooming/ })).toBeVisible();
  await page.getByRole("link", { name: /Gentle Dog Grooming/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Gentle Dog Grooming" })).toBeVisible();
  await expect(page).toHaveTitle("Gentle Dog Grooming in Bengaluru | Pawpad");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://pawpad.in/blog.html?post=gentle-dog-grooming");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", post.seoDescription);
  const json = JSON.parse(await page.locator("#blog-post-jsonld").textContent());
  expect(json["@type"]).toBe("BlogPosting");
  expect(json.headline).toBe(post.title);
});

test("unknown article is not indexed in rendered page", async ({ page }) => {
  await page.route("https://api.pawpad.in/**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const missing = action === "get_blog_post";
    await route.fulfill({ status: missing ? 404 : 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(missing ? { ok: false, error: "Not found" } : { ok: true, content: {}, version: "" }) });
  });
  await page.goto("/blog.html?post=does-not-exist");
  await expect(page.getByText("This article is not available.")).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
});

test("owner sees blog editor and invoice register with protected billing setup", async ({ page }) => {
  const sales = [];
  await page.route("https://api.pawpad.in/**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const body = JSON.parse(route.request().postData() || "{}");
    let data = { ok: true };
    if (action === "get_content") data = { ok: true, content: {}, version: "" };
    if (action === "login") data = { ok: true, token: "a".repeat(64), user: { email: "owner@pawpad.in", role: "owner" } };
    if (action === "me") data = { ok: true, user: { email: "owner@pawpad.in", role: "owner" } };
    if (action === "list_applications") data = { ok: true, applications: [] };
    if (action === "list_invoice_sales") data = { ok: true, sales };
    if (action === "list_invoice_sources") data = { ok: true, sources: [] };
    if (action === "get_invoice_settings") data = { ok: true, settings: { legalName: "", address: "", stateCode: "", gstStatus: "unknown", gstin: "", invoicePrefix: "PP", serviceCodes: {}, approvedAt: "" } };
    if (action === "save_invoice_sale") {
      const sale = { ...body, id: 1, status: "draft", issuedNo: null, corrections: [], emailStatus: "pending" };
      sales.splice(0, sales.length, sale);
      data = { ok: true, sale };
    }
    if (action === "list_blog_admin") data = { ok: true, posts: [] };
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Pawpad-Token" }, body: JSON.stringify(data) });
  });
  await page.goto("/admin.html");
  await page.locator('input[type="email"]').first().fill("owner@pawpad.in");
  await page.locator('input[type="password"]').first().fill("test-password");
  await page.locator('button[type="submit"]').first().click();
  await page.locator('nav button:has-text("Invoices")').click();
  await expect(page.getByRole("heading", { name: "Invoice Register" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Billing settings" })).toBeVisible();
  await page.getByLabel("Customer name").fill("Asha Rao");
  await page.getByLabel("Email for invoice delivery").fill("asha@example.com");
  await page.getByLabel("Description").fill("Gentle grooming service");
  await page.getByLabel("Final unit price ₹ (inclusive of tax)").fill("1500");
  await page.getByRole("button", { name: "Save draft sale" }).click();
  await expect(page.getByText("Draft sale saved.")).toBeVisible();
  await page.getByRole("button", { name: "Billing settings" }).click();
  await expect(page.getByRole("heading", { name: "Accountant-approved billing setup" })).toBeVisible();
  await page.locator('nav button:has-text("Blog Posts")').click();
  await expect(page.getByRole("heading", { name: "Articles" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate from article text" })).toBeVisible();
});

test("owner drafts an amount reduction and records a verified refund separately", async ({ page }) => {
  const snapshot = { number: "PP/2026-27/0001", calculation: { total: "1500.00", items: [{ description: "Grooming", gross: "1500.00", tax: "0.00", rate: 0, serviceCode: "9986" }] }, payments: [{ amount: 1500, mode: "upi" }] };
  const sale = { id: 8, status: "issued", customerName: "Asha Rao", customerEmail: "asha@example.com", customerAddress: "Bengaluru", customerStateCode: "29", customerStateName: "Karnataka", deliveryAddress: "", customerGstin: "", items: [{ service: "grooming", description: "Grooming", quantity: 1, unitPrice: 1500 }], links: [], notes: "", issuedNo: snapshot.number, issuedAt: "2026-10-11T10:00:00.000Z", emailStatus: "sent", snapshot, adjustments: [], corrections: [] };
  const actions = [];
  await page.route("https://api.pawpad.in/**", async (route) => {
    const action = new URL(route.request().url()).searchParams.get("action");
    const body = JSON.parse(route.request().postData() || "{}");
    actions.push({ action, body });
    let data = { ok: true };
    if (action === "get_content") data = { ok: true, content: {}, version: "" };
    if (action === "login") data = { ok: true, token: "a".repeat(64), user: { email: "owner@pawpad.in", role: "owner" } };
    if (action === "me") data = { ok: true, user: { email: "owner@pawpad.in", role: "owner" } };
    if (action === "list_applications") data = { ok: true, applications: [] };
    if (action === "list_invoice_sales") data = { ok: true, sales: [sale], total: 1 };
    if (action === "list_invoice_sources") data = { ok: true, sources: [] };
    if (action === "get_invoice_settings") data = { ok: true, settings: { legalName: "", address: "", stateCode: "", gstStatus: "unknown", gstin: "", invoicePrefix: "PP", serviceCodes: {}, approvedAt: "", adjustmentsApprovedAt: "" } };
    if (action === "save_invoice_adjustment") {
      const note = { ...body, id: 4, status: "draft", number: null, snapshot: null, refunds: [], collections: [] };
      sale.adjustments = [note]; data = { ok: true, adjustment: note, sale };
    }
    if (action === "preview_invoice_adjustment") data = { ok: true, calculation: { net: "300.00", cgst: "0.00", sgst: "0.00", igst: "0.00", total: "300.00" } };
    if (action === "issue_invoice_adjustment") {
      const note = { ...sale.adjustments[0], status: "issued", number: "CN/2026-27/0001", emailStatus: "sent", snapshot: { calculation: { total: "300.00" } } };
      sale.adjustments = [note]; data = { ok: true, adjustment: note, sale };
    }
    if (action === "record_invoice_refund") {
      sale.adjustments[0].refunds = [{ amount: 300, refundedOn: body.refundedOn, mode: body.mode, reference: body.reference }];
      data = { ok: true, adjustment: sale.adjustments[0], sale };
    }
    await route.fulfill({ status: 200, contentType: "application/json", headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Pawpad-Token" }, body: JSON.stringify(data) });
  });
  await page.goto("/admin.html");
  await page.locator('input[type="email"]').first().fill("owner@pawpad.in");
  await page.locator('input[type="password"]').first().fill("test-password");
  await page.locator('button[type="submit"]').first().click();
  await page.locator('nav button:has-text("Invoices")').click();
  await page.getByRole("button", { name: /Asha Rao.*PP\/2026-27\/0001/ }).click();
  await page.getByRole("button", { name: "+ Draft credit or debit note" }).click();
  await page.getByLabel("Why is the amount changing?").fill("Partial service refund");
  await page.getByLabel("Accountant review reference for this note").fill("CA-APPROVAL-17");
  await page.getByLabel(/Original line 1: Grooming/).fill("300");
  await expect(page.getByRole("button", { name: "Issue numbered note" })).toHaveCount(0);
  await page.getByRole("button", { name: "Save draft note" }).click();
  await expect(page.getByRole("button", { name: "Issue numbered note" })).toBeDisabled();
  await page.getByLabel(/I reviewed the saved draft/).check();
  await page.getByLabel(/I verified the accountant review reference/).check();
  await expect(page.getByRole("button", { name: "Issue numbered note" })).toBeDisabled();
  await page.getByRole("button", { name: "Preview note totals" }).click();
  await expect(page.getByText(/Preview: value ₹300.00/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Issue numbered note" })).toBeEnabled();
  await page.getByRole("button", { name: "Issue numbered note" }).click();
  await expect(page.getByText("Net after issued notes ₹1200.00", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Record completed refund" }).click();
  await page.getByLabel("Amount paid back ₹").fill("300");
  await page.getByLabel("Refund transaction reference").fill("REF-1001");
  await expect(page.getByRole("button", { name: "Record refund", exact: true })).toBeDisabled();
  await page.getByLabel(/I verified that this refund was paid/).check();
  await page.getByRole("button", { name: "Record refund", exact: true }).click();
  await expect(page.getByText(/Refunds recorded: ₹300.00/)).toBeVisible();
  expect(actions.find((row) => row.action === "issue_invoice_adjustment")?.body).toMatchObject({ id: 4, detailsConfirmed: true, accountantReviewConfirmed: true });
  expect(actions.find((row) => row.action === "record_invoice_refund")?.body).toMatchObject({ id: 4, amount: "300", reference: "REF-1001", payoutConfirmed: true });
});
