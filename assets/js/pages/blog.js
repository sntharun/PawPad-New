const { useState: useStateBlog, useEffect: useEffectBlog } = React;
const BLOG_URL = "https://pawpad.in/blog.html";
const BLOG_DEFAULT_TITLE = "Blog — Conscious Pet Care Insights | Pawpad Bengaluru";
const BLOG_DEFAULT_DESCRIPTION = "Practical stories and guidance from Pawpad on gentle pet grooming, animal wellbeing, and thoughtful care in Bengaluru.";

function blogSetMeta(selector, attribute, value) {
  const node = document.head.querySelector(selector);
  if (node) node.setAttribute(attribute, value);
}

function blogApplySeo(post, missing, requestedSlug = "") {
  const title = post ? (post.seoTitle || post.title) + " | Pawpad" : BLOG_DEFAULT_TITLE;
  const description = post ? (post.seoDescription || post.summary) : BLOG_DEFAULT_DESCRIPTION;
  const url = post ? `${BLOG_URL}?post=${encodeURIComponent(post.slug)}` : requestedSlug ? `${BLOG_URL}?post=${encodeURIComponent(requestedSlug)}` : BLOG_URL;
  const image = post && post.coverUrl ? new URL(post.coverUrl, location.href).href : "https://pawpad.in/assets/img/pawpad/landing-page-cover.png";
  document.title = title;
  blogSetMeta('meta[name="description"]', "content", description);
  blogSetMeta('meta[property="og:type"]', "content", post ? "article" : "website");
  blogSetMeta('meta[property="og:title"]', "content", title);
  blogSetMeta('meta[property="og:description"]', "content", description);
  blogSetMeta('meta[property="og:url"]', "content", url);
  blogSetMeta('meta[property="og:image"]', "content", image);
  blogSetMeta('meta[name="twitter:title"]', "content", title);
  blogSetMeta('meta[name="twitter:description"]', "content", description);
  blogSetMeta('meta[name="twitter:image"]', "content", image);
  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = url;
  let robots = document.head.querySelector('meta[name="robots"]');
  if (missing) {
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, nofollow";
  } else if (robots) {
    robots.remove();
  }
  const oldJson = document.head.querySelector('#blog-post-jsonld');
  if (oldJson) oldJson.remove();
  if (post) {
    const script = document.createElement("script");
    script.id = "blog-post-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org", "@type": "BlogPosting", headline: post.title,
      description, image, mainEntityOfPage: url,
      datePublished: post.publishedAt, dateModified: post.updatedAt,
      author: { "@type": "Person", name: post.author || "Pawpad" },
      publisher: { "@type": "Organization", name: "Pawpad", url: "https://pawpad.in/" }
    });
    document.head.appendChild(script);
  }
}

function blogDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

// The static local server cannot run PHP/MySQL migrations. Preview the same
// starter articles that the API seeds, but never use them on the public site.
async function blogLocalSamples() {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)) return [];
  try {
    const response = await fetch("api/lib/sample-blog-posts.json", { cache: "no-cache" });
    if (!response.ok) return [];
    const samples = await response.json();
    if (!Array.isArray(samples)) return [];
    return samples.map((sample, index) => ({
      ...sample,
      id: `local-sample-${index + 1}`,
      publishedAt: "",
      updatedAt: ""
    }));
  } catch (_) {
    return [];
  }
}

function BlogPage() {
  const slug = new URLSearchParams(location.search).get("post") || "";
  const [loading, setLoading] = useStateBlog(true);
  const [error, setError] = useStateBlog("");
  const [posts, setPosts] = useStateBlog([]);
  const [post, setPost] = useStateBlog(null);

  useEffectBlog(() => {
    let live = true;
    setLoading(true);
    setError("");
    const load = async () => {
      const samples = await blogLocalSamples();
      if (!live) return;
      const sample = slug ? samples.find((item) => item.slug === slug) : null;
      if (sample) {
        setPost(sample);
        blogApplySeo(sample, false);
        setLoading(false);
      } else if (!slug && samples.length) {
        setPosts(samples);
        blogApplySeo(null, false);
        setLoading(false);
      }
      const result = await (slug ? window.PawpadApi.getBlogPost(slug) : window.PawpadApi.getBlogPosts());
      if (!live) return;
      if (result.ok) {
        if (slug) {
          setPost(result.data.post);
          blogApplySeo(result.data.post, false);
        } else {
          setPosts(result.data.posts || []);
          blogApplySeo(null, false);
        }
      } else {
        // A valid 404 means an unpublished or unknown post; never reveal a
        // local sample over that answer. A 405 is the older API without blogs.
        if (result.status === 404 || (!sample && (slug || samples.length === 0))) {
          setPost(null);
          setError(result.status === 404 ? "This article is not available." : "The blog could not load. Please try again shortly.");
          blogApplySeo(null, result.status === 404, slug);
        }
      }
      setLoading(false);
    };
    load();
    return () => { live = false; };
  }, [slug]);

  const e = React.createElement;
  if (slug) {
    return e("div", { className: "page-enter" }, e("article", { className: "blog-article" }, e("div", { className: "container blog-article-inner" },
      e("a", { className: "blog-back", href: "blog.html" }, "← All stories"),
      loading ? e("p", { role: "status" }, "Loading article…") : error ? e("p", { role: "alert", className: "blog-empty" }, error) : post && e(React.Fragment, null,
        e("p", { className: "eyebrow" }, "Pawpad journal"),
        e("h1", { className: "h-display", style: { marginTop: 24 } }, post.title),
        e("p", { className: "blog-byline" }, [post.author || "Pawpad", blogDate(post.publishedAt)].filter(Boolean).join(" · ")),
        post.coverUrl && e("figure", { className: "blog-cover" }, e("img", { src: post.coverUrl, alt: post.coverAlt || post.title }), post.coverCaption && e("figcaption", null, post.coverCaption)),
        e("p", { className: "blog-summary" }, post.summary),
        (post.sections || []).map((section, i) => e("section", { className: "blog-section", key: i },
          section.heading && e("h2", null, section.heading),
          (section.text || "").split(/\n\s*\n/).filter(Boolean).map((paragraph, j) => e("p", { key: j }, paragraph)),
          section.imageUrl && e("figure", null, e("img", { src: section.imageUrl, alt: section.imageAlt || section.heading || post.title, loading: "lazy" }), section.imageCaption && e("figcaption", null, section.imageCaption))
        ))
      )
    )));
  }
  return e("div", { className: "page-enter" },
    e("section", { className: "blog-hero" }, e("div", { className: "container" },
      e("p", { className: "eyebrow" }, "The Pawpad journal"),
      e("h1", { className: "h-display", style: { marginTop: 24 } }, "Stories and care, ", e("em", { className: "italic", style: { color: "var(--driftwood)" } }, "thoughtfully shared")),
      e("p", { className: "lead" }, "Practical thoughts on conscious grooming, animal wellbeing, and helping dogs and cats feel safe in our care.")
    )),
    e("section", { className: "blog-list" }, e("div", { className: "container" },
      loading ? e("p", { role: "status" }, "Loading stories…") : error ? e("p", { role: "alert", className: "blog-empty" }, error) : posts.length === 0 ? e("p", { className: "blog-empty" }, "New stories are coming soon.") :
      e("div", { className: "blog-grid" }, posts.map((item) => e("a", { key: item.id, className: "blog-card", href: `blog.html?post=${encodeURIComponent(item.slug)}` },
        item.coverUrl && e("img", { className: "blog-card-image", src: item.coverUrl, alt: item.coverAlt || item.title, loading: "lazy" }),
        e("div", { className: "blog-card-copy" }, e("span", { className: "eyebrow" }, blogDate(item.publishedAt)), e("h2", null, item.title), e("p", null, item.summary), e("span", { className: "blog-read" }, "Read story →"))
      )))
    ))
  );
}
window.BlogPage = BlogPage;
