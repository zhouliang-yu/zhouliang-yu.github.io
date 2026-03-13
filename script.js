const publicationContainer = document.getElementById('publication-list');
const publicationSyncTime = document.getElementById('pub-sync-time');
const blogPreviewContainer = document.getElementById('blog-preview-list');

function formatDate(dateText) {
  if (!dateText) {
    return 'Unknown';
  }
  const date = new Date(dateText);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

function createTextNode(tag, className, text) {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  node.textContent = text;
  return node;
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }
  return response.json();
}

function renderPublicationItem(item) {
  const article = document.createElement('article');
  article.className = 'pub-item';

  const top = document.createElement('div');
  top.className = 'pub-top';

  const title = document.createElement('h3');
  title.className = 'pub-title';
  const titleLink = document.createElement('a');
  titleLink.href = item.scholar_url;
  titleLink.target = '_blank';
  titleLink.rel = 'noreferrer';
  titleLink.textContent = item.title;
  title.appendChild(titleLink);

  const metaBadge = document.createElement('div');
  const year = createTextNode('span', 'pub-year', String(item.year || 'N/A'));
  const cites = createTextNode('span', 'pub-cites', `Cited by ${item.citations ?? 0}`);
  metaBadge.appendChild(year);
  metaBadge.appendChild(document.createTextNode(' '));
  metaBadge.appendChild(cites);

  top.appendChild(title);
  top.appendChild(metaBadge);

  const authors = createTextNode('p', 'pub-authors', item.authors || 'Authors unavailable');
  const venue = createTextNode('p', 'pub-venue', item.venue || 'Venue unavailable');

  const footer = document.createElement('div');
  footer.className = 'pub-footer';
  const scholarLink = document.createElement('a');
  scholarLink.href = item.scholar_url;
  scholarLink.target = '_blank';
  scholarLink.rel = 'noreferrer';
  scholarLink.textContent = 'Google Scholar link';
  footer.appendChild(scholarLink);

  article.appendChild(top);
  article.appendChild(authors);
  article.appendChild(venue);
  article.appendChild(footer);

  return article;
}

async function loadPublications() {
  if (!publicationContainer) {
    return;
  }

  try {
    const data = await fetchJson('data/scholar-publications.json');
    const items = Array.isArray(data.items) ? data.items : [];

    publicationSyncTime.textContent = `Synced: ${formatDate(data.synced_at)}`;

    publicationContainer.innerHTML = '';
    if (!items.length) {
      publicationContainer.appendChild(
        createTextNode('p', 'empty-state', 'No publications found from Google Scholar.')
      );
      return;
    }

    for (const item of items) {
      publicationContainer.appendChild(renderPublicationItem(item));
    }
  } catch (error) {
    publicationContainer.innerHTML = '';
    publicationContainer.appendChild(
      createTextNode('p', 'error-state', 'Failed to load publications. Please run sync script again.')
    );
    if (publicationSyncTime) {
      publicationSyncTime.textContent = 'Sync failed';
    }
    console.error(error);
  }
}

function renderBlogRow(post) {
  const row = document.createElement('a');
  row.className = 'blog-row';
  row.href = `blog/post.html?slug=${encodeURIComponent(post.slug)}`;

  const icon = createTextNode('span', 'blog-icon', post.icon || '📝');

  const main = document.createElement('div');
  main.className = 'blog-main';
  main.appendChild(createTextNode('p', 'blog-title', post.title));
  main.appendChild(createTextNode('p', 'blog-excerpt', post.excerpt));

  const meta = createTextNode(
    'span',
    'blog-meta',
    `${formatDate(post.date)} · ${post.read_time || '5 min'}`
  );

  row.appendChild(icon);
  row.appendChild(main);
  row.appendChild(meta);

  return row;
}

async function loadBlogPreview() {
  if (!blogPreviewContainer) {
    return;
  }

  try {
    const data = await fetchJson('data/blog-posts.json');
    const posts = Array.isArray(data.posts) ? data.posts.slice(0, 4) : [];

    blogPreviewContainer.innerHTML = '';
    if (!posts.length) {
      blogPreviewContainer.appendChild(
        createTextNode('p', 'empty-state', 'No blog posts yet.')
      );
      return;
    }

    for (const post of posts) {
      blogPreviewContainer.appendChild(renderBlogRow(post));
    }
  } catch (error) {
    blogPreviewContainer.innerHTML = '';
    blogPreviewContainer.appendChild(
      createTextNode('p', 'error-state', 'Failed to load blog posts.')
    );
    console.error(error);
  }
}

loadPublications();
loadBlogPreview();
