(function () {
  'use strict';

  var BLOG_CATEGORY_LABELS = {
    pet: 'Animal Care',
    nature: 'Plant Conservation',
    education: 'Education',
    environment: 'Environment',
    community: 'Community',
    general: 'General'
  };

  function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderNotFound(container) {
    container.innerHTML = '<div style="text-align:center; padding:60px 0;">' +
      '<h2>Story not found</h2>' +
      '<p style="color:var(--text-light); margin:12px 0 24px;">This post may have been removed or unpublished.</p>' +
      '<a href="blog" class="btn btn-primary">Back to Blog</a>' +
      '</div>';
  }

  async function loadPost() {
    var container = document.getElementById('post-content');
    var slug = new URLSearchParams(window.location.search).get('slug');
    if (!slug) { renderNotFound(container); return; }

    try {
      var res = await fetch('/api/admin?action=blogs&slug=' + encodeURIComponent(slug));
      var posts = (await res.json()) || [];
      var post = posts[0];
      if (!post) { renderNotFound(container); return; }

      var dateStr = post.created_at
        ? new Date(post.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
        : '';
      var catLabel = BLOG_CATEGORY_LABELS[post.category] || post.category || '';

      document.title = post.title + ' — Jeevarasi | The Nature School';
      var metaDesc = document.getElementById('post-meta-desc');
      if (metaDesc && post.summary) metaDesc.setAttribute('content', post.summary);
      document.getElementById('post-banner-title').textContent = post.title;
      document.getElementById('post-banner-crumb').textContent = post.title;

      var bodyHtml;
      if (post.content_type === 'pdf' && post.pdf_url) {
        bodyHtml = '<div class="post-pdf-box">' +
          '<i class="fas fa-file-pdf"></i>' +
          '<p style="margin-bottom:20px; color:var(--text-light);">This story is published as a downloadable report.</p>' +
          '<a href="' + esc(post.pdf_url) + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-arrow">' +
          '<i class="fas fa-eye"></i> View / Download PDF</a>' +
          '</div>';
      } else {
        bodyHtml = '<div class="post-body">' + (post.content_html || '') + '</div>';
      }

      container.innerHTML =
        (post.cover_image_url ? '<img class="post-cover" src="' + esc(post.cover_image_url) + '" alt="' + esc(post.title) + '">' : '') +
        '<h1 class="post-title">' + esc(post.title) + '</h1>' +
        '<div class="post-meta-row">' +
        (dateStr ? '<span><i class="fas fa-calendar-alt"></i> ' + dateStr + '</span>' : '') +
        (post.author ? '<span><i class="fas fa-user"></i> ' + esc(post.author) + '</span>' : '') +
        (catLabel ? '<span><i class="fas fa-tag"></i> ' + esc(catLabel) + '</span>' : '') +
        '</div>' +
        (post.summary ? '<p class="post-summary">' + esc(post.summary) + '</p>' : '') +
        bodyHtml;
    } catch (err) {
      console.error('Blog post load error:', err);
      renderNotFound(container);
    }
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(loadPost);
})();
