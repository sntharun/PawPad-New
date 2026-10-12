/* Blog editor for the existing Pawpad admin suite. Posts live in the API, not site_content. */
(function (window) {
  const e = React.createElement;
  const { useState, useEffect } = React;
  const blank = () => ({ id: 0, slug: "", status: "draft", title: "", summary: "", coverUrl: "", coverAlt: "", coverCaption: "", author: "Pawpad", seoTitle: "", seoDescription: "", keywords: "", sections: [{ heading: "", text: "", imageUrl: "", imageAlt: "", imageCaption: "" }] });
  const blankSection = () => ({ heading: "", text: "", imageUrl: "", imageAlt: "", imageCaption: "" });
  const wordsToIgnore = new Set("a about after all also an and are as at be because been before between but by can care do does each for from has have how in into is it its of on or our pet pets so that the their them there these this to was we were what when where which while who will with your you dog dogs cat cats pawpad".split(" "));

  function suggestKeywords(post) {
    const source = [post.title, post.summary, ...(post.sections || []).flatMap((section) => [section.heading, section.text])].join(" ").toLowerCase();
    const tokens = (source.match(/[a-z][a-z'-]{2,}/g) || []).map((word) => word.replace(/^'|'$/g, ""));
    const scores = new Map();
    const add = (phrase, score) => {
      if (!phrase || phrase.length < 5 || phrase.length > 60) return;
      scores.set(phrase, (scores.get(phrase) || 0) + score);
    };
    for (let i = 0; i < tokens.length; i++) {
      if (!wordsToIgnore.has(tokens[i])) add(tokens[i], 1);
      if (i + 1 < tokens.length && !wordsToIgnore.has(tokens[i]) && !wordsToIgnore.has(tokens[i + 1])) add(tokens[i] + " " + tokens[i + 1], 2);
      if (i + 2 < tokens.length && !wordsToIgnore.has(tokens[i]) && !wordsToIgnore.has(tokens[i + 2])) add(tokens.slice(i, i + 3).join(" "), 1);
    }
    const headings = [post.title, ...(post.sections || []).map((section) => section.heading)].join(" ").toLowerCase();
    for (const phrase of headings.split(/[,:;.!?]/).map((value) => value.trim())) {
      if (phrase.length >= 5 && phrase.length <= 60) add(phrase, 6);
    }
    return [...scores].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([phrase]) => phrase).join(", ");
  }

  function Field({ label, value, onChange, textarea, rows, placeholder }) {
    return e("label", { style: { display: "flex", flexDirection: "column", gap: 5, fontSize: 12, color: "var(--admin-text-muted)" } },
      label,
      textarea ? e("textarea", { className: "input-field", rows: rows || 3, value: value || "", placeholder, onChange: (event) => onChange(event.target.value) })
        : e("input", { className: "input-field", value: value || "", placeholder, onChange: (event) => onChange(event.target.value) })
    );
  }

  function BlogAdminTab() {
    const [posts, setPosts] = useState([]);
    const [post, setPost] = useState(blank);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState("");
    const [error, setError] = useState("");
    const ImageWidget = window.PawpadAdminImageUploadWidget;

    const refresh = async (selectedId) => {
      const result = await window.PawpadApi.call("list_blog_admin", {});
      setLoading(false);
      if (!result.ok) {
        setError((result.data && result.data.error) || "Could not load blog posts.");
        return;
      }
      const rows = result.data.posts || [];
      setPosts(rows);
      if (selectedId) {
        const selected = rows.find((row) => row.id === selectedId);
        if (selected) setPost({ ...blank(), ...selected });
      }
    };

    useEffect(() => { refresh(); }, []);
    const change = (field, value) => setPost((previous) => ({ ...previous, [field]: value }));
    const sectionChange = (index, field, value) => setPost((previous) => ({ ...previous, sections: previous.sections.map((section, at) => at === index ? { ...section, [field]: value } : section) }));
    const select = (id) => {
      setNotice(""); setError("");
      setPost(id ? { ...blank(), ...posts.find((row) => row.id === id) } : blank());
    };

    const save = async (publishAfter) => {
      if (busy) return;
      setBusy(true); setError(""); setNotice("");
      const saved = await window.PawpadApi.call("save_blog_post", post);
      if (!saved.ok) {
        setError((saved.data && saved.data.error) || "Could not save the article.");
        setBusy(false); return;
      }
      let result = saved;
      if (publishAfter) result = await window.PawpadApi.call("publish_blog_post", { id: saved.data.post.id });
      if (!result.ok) {
        setError((result.data && result.data.error) || "Saved as a draft, but publishing failed.");
        await refresh(saved.data.post.id);
      } else {
        setNotice(publishAfter ? "Published. The article is now live on blog.html." : (post.status === "published" ? "Live article updated." : "Draft saved."));
        await refresh(result.data.post.id);
      }
      setBusy(false);
    };

    const unpublish = async () => {
      if (!post.id || busy || !window.confirm("Remove this article from the public blog? The draft will remain editable.")) return;
      setBusy(true); setError("");
      const result = await window.PawpadApi.call("unpublish_blog_post", { id: post.id });
      if (result.ok) {
        setNotice("Article is now a private draft.");
        await refresh(post.id);
      } else setError((result.data && result.data.error) || "Could not unpublish the article.");
      setBusy(false);
    };

    const exportPosts = () => {
      const blob = new Blob([JSON.stringify(posts, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url; link.download = `pawpad-blog-${new Date().toISOString().slice(0, 10)}.json`;
      link.click(); URL.revokeObjectURL(url);
    };

    return e("div", { className: "phase2-grid" },
      e("aside", { className: "card", style: { display: "flex", flexDirection: "column", gap: 10 } },
        e("h2", { style: { fontFamily: "var(--font-display)", fontSize: 21 } }, "Articles"),
        e("button", { className: "btn-admin btn-admin-primary", type: "button", onClick: () => select(0) }, "+ New article"),
        loading ? e("p", null, "Loading…") : posts.length === 0 ? e("p", { style: { fontSize: 13 } }, "No articles yet.") :
          posts.map((item) => e("button", { key: item.id, type: "button", className: `btn-admin ${post.id === item.id ? "btn-admin-primary" : "btn-admin-secondary"}`, style: { textAlign: "left", whiteSpace: "normal" }, onClick: () => select(item.id) }, item.title || "Untitled", " · ", item.status)),
        e("button", { className: "btn-admin btn-admin-secondary", type: "button", onClick: exportPosts, disabled: posts.length === 0 }, "Download blog backup")
      ),
      e("div", { className: "card", style: { display: "flex", flexDirection: "column", gap: 18 } },
        e("div", null, e("h2", { style: { fontFamily: "var(--font-display)", fontSize: 23 } }, post.id ? "Edit article" : "New article"),
          e("p", { style: { fontSize: 13, color: "var(--admin-text-muted)" } }, post.status === "published" ? "Published · edits to this article go live when saved" : "Draft · visible only in this admin panel")),
        error && e("p", { role: "alert", style: { color: "var(--admin-danger)" } }, error),
        notice && e("p", { role: "status", style: { color: "var(--admin-success)" } }, notice),
        e(Field, { label: "Article title", value: post.title, onChange: (value) => change("title", value) }),
        e(Field, { label: "URL slug (lowercase letters and hyphens; locked after publishing)", value: post.slug, onChange: (value) => change("slug", value), placeholder: "gentle-dog-grooming" }),
        post.slug && post.status === "published" && e("a", { href: `blog.html?post=${encodeURIComponent(post.slug)}`, target: "_blank", rel: "noopener", style: { fontSize: 12 } }, "View live article ↗"),
        e(Field, { label: "Summary / description shown on the Blog page", value: post.summary, onChange: (value) => change("summary", value), textarea: true, rows: 3 }),
        e(ImageWidget, { label: "Cover image", currentUrl: post.coverUrl, onSelectUrl: (value) => change("coverUrl", value) }),
        e(Field, { label: "Cover image description (alt text)", value: post.coverAlt, onChange: (value) => change("coverAlt", value) }),
        e(Field, { label: "Cover caption", value: post.coverCaption, onChange: (value) => change("coverCaption", value) }),
        e(Field, { label: "Author", value: post.author, onChange: (value) => change("author", value) }),
        e("h3", { style: { fontFamily: "var(--font-display)", fontSize: 21 } }, "Main content"),
        (post.sections || []).map((section, index) => e("div", { key: index, style: { border: "1px solid var(--admin-border)", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 } },
          e("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, e("strong", null, `Section ${index + 1}`), e("button", { type: "button", className: "btn-admin btn-admin-secondary", onClick: () => change("sections", post.sections.filter((_, at) => at !== index)) }, "Remove")),
          e(Field, { label: "Heading", value: section.heading, onChange: (value) => sectionChange(index, "heading", value) }),
          e(Field, { label: "Text (leave a blank line between paragraphs)", value: section.text, onChange: (value) => sectionChange(index, "text", value), textarea: true, rows: 7 }),
          e(ImageWidget, { label: "Picture in this section", currentUrl: section.imageUrl, onSelectUrl: (value) => sectionChange(index, "imageUrl", value) }),
          e(Field, { label: "Picture description (alt text)", value: section.imageAlt, onChange: (value) => sectionChange(index, "imageAlt", value) }),
          e(Field, { label: "Picture caption", value: section.imageCaption, onChange: (value) => sectionChange(index, "imageCaption", value) })
        )),
        e("button", { type: "button", className: "btn-admin btn-admin-secondary", onClick: () => change("sections", [...post.sections, blankSection()]) }, "+ Add content section"),
        e("h3", { style: { fontFamily: "var(--font-display)", fontSize: 21 } }, "Search appearance"),
        e(Field, { label: "SEO title (optional; article title is used if blank)", value: post.seoTitle, onChange: (value) => change("seoTitle", value) }),
        e(Field, { label: "SEO description (optional; summary is used if blank)", value: post.seoDescription, onChange: (value) => change("seoDescription", value), textarea: true }),
        e("div", { className: "phase2-keywords" },
          e(Field, { label: "Keywords and phrases (comma separated; edit freely)", value: post.keywords, onChange: (value) => change("keywords", value), textarea: true, rows: 2 }),
          e("button", { type: "button", className: "btn-admin btn-admin-secondary", onClick: () => change("keywords", suggestKeywords(post)) }, "Generate from article text")
        ),
        e("p", { style: { fontSize: 12, color: "var(--admin-text-muted)" } }, "Use these phrases naturally in the title, headings, summary, and article. Search engines do not use a meta keywords tag."),
        e("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } },
          e("button", { type: "button", className: "btn-admin btn-admin-secondary", disabled: busy, onClick: () => save(false) }, busy ? "Saving…" : "Save"),
          post.status !== "published" && e("button", { type: "button", className: "btn-admin btn-admin-primary", disabled: busy, onClick: () => save(true) }, busy ? "Publishing…" : "Save & publish"),
          post.status === "published" && e("button", { type: "button", className: "btn-admin btn-admin-danger", disabled: busy, onClick: unpublish }, "Unpublish")
        )
      )
    );
  }

  window.PawpadBlogAdminTab = BlogAdminTab;
})(window);
