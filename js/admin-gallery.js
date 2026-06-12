(function () {
  'use strict';

  async function loadAdminGallery() {
    try {
      const response = await fetch('/api/admin?action=gallery');
      if (!response.ok) throw new Error('Failed to load gallery');

      const items = await response.json();
      console.log('Gallery URLs:', items);
      const adminGrid = document.getElementById('admin-gallery-grid');
      const mainGrid = document.getElementById('gallery-grid');

      if (!items || items.length === 0) {
        if (adminGrid) {
          adminGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-light); padding: 40px;">Gallery coming soon...</p>';
        }
        return;
      }

      // Render into admin gallery section
      if (adminGrid) {
        adminGrid.innerHTML = items.map((item, idx) => {
          const isVideo = item.contentType && item.contentType.startsWith('video/');
          return `
            <div class="gallery-item reveal${idx > 0 ? ' reveal-delay-' + Math.min(idx, 3) : ''}" data-category="admin" data-img="${item.url}">
              ${isVideo ? `<video src="${item.url}" style="width: 100%; height: 100%; object-fit: cover;"></video>` : `<img src="${item.url}" alt="Admin upload">`}
              <div class="gallery-overlay"><i class="fas fa-expand"></i></div>
              <span class="gallery-tag">${isVideo ? 'Video' : 'Photo'}</span>
            </div>
          `;
        }).join('');

        document.querySelectorAll('#admin-gallery-grid .gallery-item').forEach((item) => {
          item.addEventListener('click', () => {
            const src = item.getAttribute('data-img');
            const isVideo = item.querySelector('video') !== null;
            if (window.openLightbox) {
              window.openLightbox(src, isVideo);
            }
          });
        });
      }

      // Also append uploaded items to the MAIN gallery grid
      if (mainGrid) {
        items.forEach((item, idx) => {
          const isVideo = item.contentType && item.contentType.startsWith('video/');
          const el = document.createElement('div');
          el.className = `gallery-item reveal${idx > 0 ? ' reveal-delay-' + Math.min(idx, 3) : ''}`;
          el.setAttribute('data-category', 'admin');
          el.setAttribute('data-img', item.url);
          el.innerHTML = `
            ${isVideo ? `<video src="${item.url}" style="width: 100%; height: 100%; object-fit: cover;"></video>` : `<img src="${item.url}" alt="Admin upload">`}
            <div class="gallery-overlay"><i class="fas fa-expand"></i></div>
            <span class="gallery-tag">${isVideo ? 'Video' : 'Photo'}</span>
          `;
          mainGrid.appendChild(el);

          // Lightbox handler
          el.addEventListener('click', () => {
            if (window.openLightbox) {
              window.openLightbox(item.url, isVideo);
            }
          });

          // Trigger reveal animation
          if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(function (entries) {
              entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                  entry.target.classList.add('visible');
                  observer.unobserve(entry.target);
                }
              });
            }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
            observer.observe(el);
          } else {
            el.classList.add('visible');
          }
        });
      }
    } catch (error) {
      console.error('Error loading admin gallery:', error);
    }
  }

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(loadAdminGallery);
})();
