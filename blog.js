function formatDate(dateText) {
  if (!dateText) {
    return 'Unknown date';
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

async function fetchPosts() {
  const response = await fetch('../data/blog-posts.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error('Failed to load blog posts');
  }
  const data = await response.json();
  return Array.isArray(data.posts) ? data.posts : [];
}

function renderBlogListRow(post) {
  const row = document.createElement('a');
  row.className = 'blog-row';
  row.href = `post.html?slug=${encodeURIComponent(post.slug)}`;

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

function renderContentBlocks(postContentElement, blocks) {
  postContentElement.innerHTML = '';

  for (const block of blocks || []) {
    if (block.type === 'heading') {
      postContentElement.appendChild(createTextNode('h2', '', block.text));
      continue;
    }

    if (block.type === 'quote') {
      postContentElement.appendChild(createTextNode('blockquote', '', block.text));
      continue;
    }

    if (block.type === 'list') {
      const ul = document.createElement('ul');
      for (const item of block.items || []) {
        ul.appendChild(createTextNode('li', '', item));
      }
      postContentElement.appendChild(ul);
      continue;
    }

    postContentElement.appendChild(createTextNode('p', '', block.text || ''));
  }
}

async function loadBlogList() {
  const listContainer = document.getElementById('blog-list');
  if (!listContainer) {
    return;
  }

  try {
    const posts = await fetchPosts();
    listContainer.innerHTML = '';

    if (!posts.length) {
      listContainer.appendChild(createTextNode('p', 'empty-state', 'No blog posts yet.'));
      return;
    }

    for (const post of posts) {
      listContainer.appendChild(renderBlogListRow(post));
    }
  } catch (error) {
    listContainer.innerHTML = '';
    listContainer.appendChild(createTextNode('p', 'error-state', 'Failed to load posts.'));
    console.error(error);
  }
}

async function loadBlogPost() {
  const postTitle = document.getElementById('post-title');
  if (!postTitle) {
    return;
  }

  const postDate = document.getElementById('post-date');
  const postSubtitle = document.getElementById('post-subtitle');
  const postContent = document.getElementById('post-content');

  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug');

  try {
    const posts = await fetchPosts();
    const post = posts.find((item) => item.slug === slug);

    if (!post) {
      postDate.textContent = 'Post not found';
      postTitle.textContent = 'This post does not exist';
      postSubtitle.textContent = '';
      postContent.innerHTML = '';
      postContent.appendChild(
        createTextNode('p', 'error-state', 'Please return to the blog index and choose another post.')
      );
      return;
    }

    document.title = `${post.title} | Zhouliang Yu`;
    postDate.textContent = `${formatDate(post.date)} · ${post.read_time || '5 min read'}`;
    postTitle.textContent = post.title;
    postSubtitle.textContent = post.excerpt || '';

    renderContentBlocks(postContent, post.content);
  } catch (error) {
    postDate.textContent = 'Load failed';
    postTitle.textContent = 'Failed to load this post';
    postSubtitle.textContent = '';
    postContent.innerHTML = '';
    postContent.appendChild(createTextNode('p', 'error-state', 'Please try again later.'));
    console.error(error);
  }
}

loadBlogList();
loadBlogPost();
