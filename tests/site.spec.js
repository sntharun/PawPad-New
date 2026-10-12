import { test, expect } from "@playwright/test";

const pages = [
  { path: "/", titleContains: "Pawpad" },
  { path: "/index.html", titleContains: "Pawpad" },
  { path: "/about.html", titleContains: "Our Story" },
  { path: "/experience.html", titleContains: "Experience" },
  { path: "/blog.html", titleContains: "Blogs" },
  { path: "/grooming.html", titleContains: "Grooming" },
  { path: "/courses.html", titleContains: "Courses" },
  { path: "/studio-setup.html", titleContains: "Studio Setup" },
  { path: "/boarding.html", titleContains: "Boarding" },
  { path: "/myotherapy.html", titleContains: "Myotherapy" },
  { path: "/contact.html", titleContains: "Contact" },
  { path: "/policies.html", titleContains: "Policies" },
  { path: "/admin.html", titleContains: "Admin" },
  { path: "/course_forms/pawpad-foundations-page.html", titleContains: "Certification" },
  { path: "/course_forms/pawpad-essentials-dog-page.html", titleContains: "Essential" },
  { path: "/course_forms/pawpad-essentials-cat-page.html", titleContains: "Essential" },
  { path: "/course_forms/pawpad-practitioner-dog-page.html", titleContains: "Practitioner" },
  { path: "/course_forms/pawpad-practitioner-cat-page.html", titleContains: "Practitioner" },
  { path: "/course_forms/pawpad-studio-consulting-page.html", titleContains: "Consulting" },
  { path: "/course_forms/pawpad-application-pacgc.html", titleContains: "PACGC Application" },
  { path: "/course_forms/pawpad-application-pcgec.html", titleContains: "PCGEC Application" },
  { path: "/course_forms/pawpad-application-pcgpc.html", titleContains: "PCGPC Application" },
  { path: "/course_forms/pawpad-application-pfgec.html", titleContains: "PFGEC Application" },
  { path: "/course_forms/pawpad-application-pfgpc.html", titleContains: "PFGPC Application" },
  { path: "/course_forms/pawpad-application-consulting-gssc.html", titleContains: "Consulting" },
  { path: "/course_forms/success.html", titleContains: "Application" }
];

test.describe("Pawpad Complete Site Integrity & Render Tests", () => {
  for (const p of pages) {
    test(`Page renders without errors: ${p.path}`, async ({ page }) => {
      const pageErrors = [];
      page.on("pageerror", (err) => pageErrors.push(err.message));

      const response = await page.goto(p.path, { waitUntil: "domcontentloaded" });
      expect(response?.status()).toBeLessThan(400);

      const title = await page.title();
      expect(title).toContain(p.titleContains);

      // Scroll to bottom so all lazy-loaded elements trigger
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(150);

      // Verify all non-empty images loaded properly
      const imageStatus = await page.evaluate(async () => {
        const images = Array.from(document.querySelectorAll("img"));
        const broken = [];
        for (const img of images) {
          if (!img.src || img.src.startsWith("data:")) continue;
          if (!img.complete || img.naturalWidth === 0) {
            // Verify via fetch to distinguish lazy-load timing from broken URLs
            try {
              const res = await fetch(img.src);
              if (!res.ok) broken.push(img.src);
            } catch {
              broken.push(img.src);
            }
          }
        }
        return broken;
      });

      expect(imageStatus).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});

test.describe("Interactive Features & User Flows", () => {
  test("TopNav contains all 9 main navigation links and opens Studio Setup", async ({ page }) => {
    await page.goto("/index.html");
    const navLinks = page.locator(".nav-links.desktop-only .nav-link");
    // Pages wait briefly for published content before drawing, so wait for the links.
    await expect(navLinks).toHaveText(["Home", "About", "Grooming", "Courses", "Studio Setup", "Boarding", "Myotherapy", "Blogs", "Contact"]);
    await expect(page.locator('.nav-links.desktop-only a[href="blog.html"]')).toBeVisible();
    await expect(page.locator('.nav-links.desktop-only a[href="experience.html"]')).toHaveCount(0);
    await expect(page.locator('.site-footer .footer-grid ul a')).toHaveText(["About", "Grooming", "Courses", "Studio Setup", "Boarding", "Myotherapy", "Blogs", "Contact"]);

    const studioSetupLink = page.locator('.nav-links.desktop-only a[href="studio-setup.html"]');
    await expect(studioSetupLink).toBeVisible();
    await studioSetupLink.click();
    await expect(page).toHaveURL(/studio-setup\.html/);
    await expect(page.locator("h1")).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.locator(".mobile-links .m-link span:first-child")).toHaveText(["Home", "About", "Grooming", "Courses", "Studio Setup", "Boarding", "Myotherapy", "Blogs", "Contact"]);
  });

  test("Cart Drawer opens and supports adding consulting package to cart", async ({ page }) => {
    await page.goto("/studio-setup.html");
    
    // Add to cart from the packages section
    const addToCartBtn = page.locator(".ss-pkg-add-cart").first();
    if (await addToCartBtn.count() > 0) {
      await addToCartBtn.click();
      const cartDrawer = page.locator(".cart-drawer");
      await expect(cartDrawer).toBeVisible();
      await expect(page.locator(".cart-drawer-item")).toHaveCount(1);
    } else {
      // Open cart directly via TopNav cart button
      const cartBtn = page.locator(".nav-cart-btn").first();
      await cartBtn.click();
      const cartDrawer = page.locator(".cart-drawer");
      await expect(cartDrawer).toBeVisible();
    }
  });

  test("Course Forms contain Studio Setup in Navigation and Footer Explore", async ({ page }) => {
    await page.goto("/course_forms/pawpad-foundations-page.html");
    
    // Check top nav link to studio setup
    const studioNav = page.locator('nav.nav-links a[href="../studio-setup.html"]');
    await expect(studioNav).toBeAttached();

    // Check footer explore link
    const studioFooter = page.locator('.site-footer a[href="../studio-setup.html"]');
    await expect(studioFooter).toBeAttached();
    await expect(page.locator('nav.nav-links a[href="../blog.html"]')).toBeAttached();
    await expect(page.locator('.site-footer a[href="../blog.html"]')).toBeAttached();
    await expect(page.locator('nav.nav-links a')).toHaveText(["About", "Grooming", "Courses", "Studio Setup", "Boarding", "Myotherapy", "Blogs", "Contact"]);
    await expect(page.locator('.site-footer .footer-grid ul a')).toHaveText(["About", "Grooming", "Courses", "Studio Setup", "Boarding", "Myotherapy", "Blogs", "Contact"]);
  });

  test("Studio Setup booking application flow navigates cleanly", async ({ page }) => {
    await page.goto("/studio-setup.html");
    const bookConsultBtn = page.locator('a[href="course_forms/pawpad-application-consulting-gssc.html"]').first();
    await expect(bookConsultBtn).toBeVisible();
    await bookConsultBtn.click();
    await expect(page).toHaveURL(/pawpad-application-consulting-gssc\.html/);
    await expect(page.locator("h1")).toContainText("Grooming Studio Setup");
    
    // Check back link returns to studio-setup.html
    const backLink = page.locator(".back-link");
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/studio-setup\.html/);
  });

  test("Policies page anchor navigation scrolls smoothly without errors", async ({ page }) => {
    await page.goto("/policies.html");
    const termsPill = page.locator('.nav-pill[href="#terms"]');
    await expect(termsPill).toBeVisible();
    await termsPill.click();
    await expect(page).toHaveURL(/#terms/);
    const termsHeading = page.locator("#terms");
    await expect(termsHeading).toBeVisible();
  });

  test("Admin signs in through the Pawpad server and emails candidates from courses@", async ({ page }) => {
    // A stand-in for api.pawpad.in, so this test runs without the real server.
    const app = {
      id: "PCGEC - 001",
      courseKey: "pcgec",
      courseName: "Pawpad Canine Grooming Essentials Certificate (PCGEC)",
      courseFee: "₹30,000",
      createdAt: new Date().toISOString(),
      status: "pending_review",
      interviewDate: "",
      applicant: { name: "Priya Sharma", email: "priya.test@example.com", phone: "+91 98765 43210", city: "Bengaluru" },
      responses: { why: "Passionate about dog grooming", experience: "Beginner", handling: "Calm and force-free" },
      acknowledgments: {},
      staffNotes: [],
      communications: []
    };
    const emails = [];
    await page.route("https://api.pawpad.in/**", async (route) => {
      const action = new URL(route.request().url()).searchParams.get("action");
      const raw = route.request().postData();
      const body = raw ? JSON.parse(raw) : {};
      let data = { ok: true };
      if (action === "get_content") data = { ok: true, content: {}, version: "" };
      if (action === "login") {
        data = body.password === "correct-password"
          ? { ok: true, token: "a".repeat(64), user: { email: body.email, role: "owner" } }
          : { ok: false, error: "Invalid email or password." };
      }
      if (action === "me") data = { ok: true, user: { email: "owner@pawpad.in", role: "owner" } };
      if (action === "list_applications") data = { ok: true, applications: [app] };
      if (action === "list_admins") data = { ok: true, admins: [{ email: "owner@pawpad.in", role: "owner" }] };
      if (action === "list_uploads") data = { ok: true, files: [], usage: { usedBytes: 0, quotaBytes: 157286400 } };
      if (action === "update_application") {
        if (body.status) app.status = body.status;
        if (body.interviewDate !== undefined) app.interviewDate = body.interviewDate;
        if (body.email) emails.push(body.email);
        data = { ok: true, application: { ...app }, email: body.email ? { sent: true, error: "" } : null };
      }
      await route.fulfill({
        status: data.ok ? 200 : 401,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type, X-Pawpad-Token" },
        body: JSON.stringify(data)
      });
    });

    await page.goto("/admin.html");

    // The old browser-only password no longer works
    await page.locator('input[type="email"]').first().fill("owner@pawpad.in");
    await page.locator('input[type="password"]').first().fill("2017");
    await page.locator('button[type="submit"]').first().click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();

    await page.locator('input[type="password"]').first().fill("correct-password");
    await page.locator('button[type="submit"]').first().click();

    // Navigate to Course Applications tab
    const appsNav = page.locator('nav button:has-text("Course Applications")');
    await appsNav.click();

    const inspectBtn = page.locator('button:has-text("Inspect & Approve")').first();
    await expect(inspectBtn).toBeVisible();
    await inspectBtn.click();
    await expect(page.locator(".modal-card")).toBeVisible();

    await page.locator('input[type="datetime-local"]').fill("2026-10-15T14:30");
    await page.locator('button:has-text("Schedule & Send Invite")').click();
    await expect(page.locator('strong:has-text("Interview Scheduled & Candidate Email Dispatched")')).toBeVisible();
    await expect(page.getByText(/sent to priya.test@example.com from courses@pawpad.in/).first()).toBeVisible();

    await page.locator('button:has-text("✓ Approve & Send Confirmation")').click();
    await expect(page.locator('strong:has-text("Application Approved & Confirmation Email Dispatched")')).toBeVisible();
    await expect(page.locator(".modal-card .badge-approved")).toBeVisible();

    expect(emails.map((e) => e.type)).toEqual(["interview_scheduled", "application_approved"]);
  });
});

