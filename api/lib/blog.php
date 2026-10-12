<?php
/** Blog posts: private drafts, public published reads, and a live sitemap. */
declare(strict_types=1);

if (!defined('PAWPAD_API')) {
    http_response_code(404);
    exit;
}

function blog_slug($value): string
{
    $slug = strtolower(trim((string) $value));
    return preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug) && strlen($slug) <= 120 ? $slug : '';
}

function blog_image_url($value): string
{
    $url = clean_text($value, 500);
    if ($url === '') {
        return '';
    }
    if (preg_match('~^assets/img/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g)$~', $url)) {
        return $url;
    }
    $parts = parse_url($url);
    $host = strtolower((string) ($parts['host'] ?? ''));
    $path = (string) ($parts['path'] ?? '');
    if (($parts['scheme'] ?? '') !== 'https' || !in_array($host, ['pawpad.in', 'www.pawpad.in', 'api.pawpad.in'], true)
        || !preg_match('~^/(?:uploads|assets/img)/[a-zA-Z0-9/_-]+\.(?:webp|png|jpe?g)$~', $path)) {
        json_error('Please use an image uploaded through the Pawpad media manager.');
    }
    return $url;
}

function blog_post_array(array $row, bool $full = false): array
{
    $post = [
        'id' => (int) $row['id'],
        'slug' => $row['slug'],
        'title' => $row['title'],
        'summary' => $row['summary'],
        'coverUrl' => $row['cover_url'],
        'coverAlt' => $row['cover_alt'],
        'coverCaption' => $row['cover_caption'],
        'author' => $row['author'],
        'seoTitle' => $row['seo_title'],
        'seoDescription' => $row['seo_description'],
        'publishedAt' => to_iso($row['published_at']),
        'updatedAt' => to_iso($row['updated_at']),
    ];
    if ($full) {
        $post['sections'] = json_decode((string) $row['sections'], true) ?: [];
        $post['keywords'] = $row['keywords'];
        $post['status'] = $row['status'];
        $post['updatedBy'] = $row['updated_by'];
    }
    return $post;
}

function list_blog_posts(bool $admin = false): array
{
    $sql = 'SELECT * FROM blog_posts' . ($admin ? '' : " WHERE status = 'published'")
        . ' ORDER BY published_at DESC, updated_at DESC, id DESC';
    $rows = db()->query($sql)->fetchAll();
    return ['posts' => array_map(fn(array $row): array => blog_post_array($row, $admin), $rows)];
}

function get_blog_post(array $input, bool $admin = false): array
{
    $id = (int) ($input['id'] ?? 0);
    $slug = blog_slug($input['slug'] ?? '');
    if ($id < 1 && $slug === '') {
        json_error('Choose a blog post.');
    }
    $sql = 'SELECT * FROM blog_posts WHERE ' . ($id > 0 ? 'id = ?' : 'slug = ?')
        . ($admin ? '' : " AND status = 'published'");
    $stmt = db()->prepare($sql);
    $stmt->execute([$id > 0 ? $id : $slug]);
    $row = $stmt->fetch();
    if (!$row) {
        json_error('Blog post not found.', 404);
    }
    $post = blog_post_array($row, true);
    if (!$admin) {
        unset($post['status'], $post['updatedBy'], $post['keywords']);
    }
    return ['post' => $post];
}

function save_blog_post(array $admin, array $input): array
{
    $id = (int) ($input['id'] ?? 0);
    $old = null;
    if ($id > 0) {
        $stmt = db()->prepare('SELECT * FROM blog_posts WHERE id = ?');
        $stmt->execute([$id]);
        $old = $stmt->fetch();
        if (!$old) json_error('Blog post not found.', 404);
    }
    $slug = blog_slug($input['slug'] ?? '');
    if ($slug === '') json_error('Use a URL slug with lowercase letters, numbers, and hyphens.');
    if ($old && $old['status'] === 'published' && $slug !== $old['slug']) {
        json_error('A published blog URL cannot be changed.');
    }
    $duplicate = db()->prepare('SELECT id FROM blog_posts WHERE slug = ? AND id <> ?');
    $duplicate->execute([$slug, $id]);
    if ($duplicate->fetch()) json_error('This blog URL is already in use.', 409);

    $title = clean_text($input['title'] ?? '', 200);
    if ($title === '') json_error('Enter a blog title.');
    $sectionsInput = $input['sections'] ?? [];
    if (!is_array($sectionsInput) || count($sectionsInput) > 40) json_error('Use at most 40 article sections.');
    $sections = [];
    foreach ($sectionsInput as $section) {
        if (!is_array($section)) json_error('Invalid article section.');
        $entry = [
            'heading' => clean_text($section['heading'] ?? '', 200),
            'text' => clean_text($section['text'] ?? '', 12000),
            'imageUrl' => blog_image_url($section['imageUrl'] ?? ''),
            'imageAlt' => clean_text($section['imageAlt'] ?? '', 250),
            'imageCaption' => clean_text($section['imageCaption'] ?? '', 250),
        ];
        if ($entry['heading'] !== '' || $entry['text'] !== '' || $entry['imageUrl'] !== '') $sections[] = $entry;
    }
    $cover = blog_image_url($input['coverUrl'] ?? '');
    $summary = clean_text($input['summary'] ?? '', 1200);
    $seoTitle = clean_text($input['seoTitle'] ?? '', 200);
    $seoDescription = clean_text($input['seoDescription'] ?? '', 320);
    $author = clean_text($input['author'] ?? '', 160);
    $keywords = clean_text($input['keywords'] ?? '', 1000);
    if ($old && $old['status'] === 'published') {
        blog_validate_publishable($summary, $cover, clean_text($input['coverAlt'] ?? '', 250), $sections);
    }
    $now = now_utc();
    $data = [$slug, $title, $summary, $cover, clean_text($input['coverAlt'] ?? '', 250),
        clean_text($input['coverCaption'] ?? '', 250), json_encode($sections, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        $author, $seoTitle, $seoDescription, $keywords, $now, $admin['email']];
    if ($old) {
        db()->prepare('UPDATE blog_posts SET slug=?, title=?, summary=?, cover_url=?, cover_alt=?, cover_caption=?, sections=?, author=?, seo_title=?, seo_description=?, keywords=?, updated_at=?, updated_by=? WHERE id=?')
            ->execute([...$data, $id]);
    } else {
        db()->prepare("INSERT INTO blog_posts (slug, title, summary, cover_url, cover_alt, cover_caption, sections, author, seo_title, seo_description, keywords, updated_at, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
            ->execute($data);
        $id = (int) db()->lastInsertId();
    }
    return get_blog_post(['id' => $id], true);
}

function blog_validate_publishable(string $summary, string $cover, string $coverAlt, array $sections): void
{
    $hasText = false;
    foreach ($sections as $section) {
        if (trim((string) ($section['text'] ?? '')) !== '') $hasText = true;
        if (($section['imageUrl'] ?? '') !== '' && trim((string) ($section['imageAlt'] ?? '')) === '') json_error('Describe every article picture with alt text before publishing.');
    }
    if (!$hasText || trim($summary) === '') json_error('Add a summary and article text before publishing.');
    if ($cover !== '' && $coverAlt === '') json_error('Describe the cover image with alt text before publishing.');
}

function publish_blog_post(array $admin, array $input, bool $publish): array
{
    $id = (int) ($input['id'] ?? 0);
    $stmt = db()->prepare('SELECT * FROM blog_posts WHERE id = ?');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Blog post not found.', 404);
    if ($publish) {
        $sections = json_decode((string) $row['sections'], true) ?: [];
        blog_validate_publishable($row['summary'], $row['cover_url'], $row['cover_alt'], $sections);
    }
    $status = $publish ? 'published' : 'draft';
    db()->prepare('UPDATE blog_posts SET status=?, published_at=?, updated_at=?, updated_by=? WHERE id=?')
        ->execute([$status, $publish ? ($row['published_at'] ?: now_utc()) : $row['published_at'], now_utc(), $admin['email'], $id]);
    return get_blog_post(['id' => $id], true);
}

function send_blog_sitemap(): void
{
    $rows = db()->query("SELECT slug, updated_at FROM blog_posts WHERE status = 'published' ORDER BY slug")->fetchAll();
    header('Content-Type: application/xml; charset=utf-8');
    header('Cache-Control: public, max-age=300');
    echo '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($rows as $row) {
        $url = 'https://pawpad.in/blog.html?post=' . rawurlencode($row['slug']);
        echo '  <url><loc>' . htmlspecialchars($url, ENT_XML1, 'UTF-8') . '</loc><lastmod>'
            . substr($row['updated_at'], 0, 10) . '</lastmod></url>' . "\n";
    }
    echo '</urlset>';
    exit;
}
