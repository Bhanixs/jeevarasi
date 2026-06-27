/* =============================================
   JEEVARSI TRUST — MAIN JAVASCRIPT
   Handles: Sticky nav, mobile menu, hero slider,
   smooth scroll, scroll animations, scroll-to-top
   ============================================= */

(function () {
  'use strict';

  /* ---- DOM Ready Helper ---- */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function () {

    /* ================================================
       STICKY HEADER
       ================================================ */
    const header = document.querySelector('.site-header');
    const topBar = document.querySelector('.top-bar');
    let lastScroll = 0;

    window.addEventListener('scroll', function () {
      const scrollY = window.pageYOffset;

      if (scrollY > 80) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      // Hide top bar after 200px scroll
      if (topBar) {
        if (scrollY > 200) {
          topBar.classList.add('hidden');
        } else {
          topBar.classList.remove('hidden');
        }
      }

      lastScroll = scrollY;
    });


    /* ================================================
       MOBILE MENU TOGGLE
       ================================================ */
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    if (menuToggle && mainNav) {
      menuToggle.addEventListener('click', function () {
        menuToggle.classList.toggle('active');
        mainNav.classList.toggle('open');
        menuToggle.setAttribute('aria-expanded', mainNav.classList.contains('open'));
      });

      // Close menu when a nav link is clicked
      mainNav.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', function () {
          menuToggle.classList.remove('active');
          mainNav.classList.remove('open');
        });
      });

      // Close menu on outside click
      document.addEventListener('click', function (e) {
        if (!header.contains(e.target)) {
          menuToggle.classList.remove('active');
          mainNav.classList.remove('open');
        }
      });
    }

    /* ---- Active nav link based on current page ---- */
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.main-nav a').forEach(function (link) {
      const href = link.getAttribute('href');
      if (href === currentPage || (currentPage === '' && href === 'index.html')) {
        link.closest('li') && link.closest('li').classList.add('active');
      }
    });


    /* ================================================
       HERO SLIDER
       ================================================ */
    const slides = document.querySelectorAll('.hero-slider .slide');
    const dots = document.querySelectorAll('.slider-dot');
    let currentSlide = 0;
    let sliderTimer = null;

    function goToSlide(n) {
      slides[currentSlide].classList.remove('active');
      dots[currentSlide] && dots[currentSlide].classList.remove('active');
      currentSlide = (n + slides.length) % slides.length;
      slides[currentSlide].classList.add('active');
      dots[currentSlide] && dots[currentSlide].classList.add('active');
    }

    function nextSlide() { goToSlide(currentSlide + 1); }

    function startSlider() {
      sliderTimer = setInterval(nextSlide, 5000);
    }

    function resetSlider() {
      clearInterval(sliderTimer);
      startSlider();
    }

    if (slides.length > 0) {
      slides[0].classList.add('active');
      dots[0] && dots[0].classList.add('active');
      startSlider();

      // Dot navigation
      dots.forEach(function (dot, i) {
        dot.addEventListener('click', function () {
          goToSlide(i);
          resetSlider();
        });
      });

      // Keyboard navigation
      document.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { goToSlide(currentSlide - 1); resetSlider(); }
        if (e.key === 'ArrowRight') { goToSlide(currentSlide + 1); resetSlider(); }
      });

      // Touch/swipe support
      let touchStartX = 0;
      const sliderEl = document.querySelector('.hero-slider');
      if (sliderEl) {
        sliderEl.addEventListener('touchstart', function (e) {
          touchStartX = e.touches[0].clientX;
        }, { passive: true });
        sliderEl.addEventListener('touchend', function (e) {
          const delta = touchStartX - e.changedTouches[0].clientX;
          if (Math.abs(delta) > 50) {
            delta > 0 ? nextSlide() : goToSlide(currentSlide - 1);
            resetSlider();
          }
        }, { passive: true });
      }
    }


    /* ================================================
       SMOOTH SCROLL (anchor links)
       ================================================ */
    function scrollToElement(hash) {
      const target = document.querySelector(hash);
      if (target) {
        const headerH = header ? header.offsetHeight : 0;
        const offset = target.getBoundingClientRect().top + window.pageYOffset - headerH - 10;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }

    // Handle anchor clicks
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        const hash = this.getAttribute('href');
        const target = document.querySelector(hash);
        if (target) {
          e.preventDefault();
          scrollToElement(hash);
        }
      });
    });

    // Handle page load with hash (for navigation from other pages)
    if (window.location.hash) {
      setTimeout(function () {
        scrollToElement(window.location.hash);
      }, 100);
    }


    /* ================================================
       SCROLL-TRIGGERED ANIMATIONS (Intersection Observer)
       ================================================ */
    const revealEls = document.querySelectorAll(
      '.reveal, .reveal-left, .reveal-right, .reveal-scale'
    );

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      revealEls.forEach(function (el) { observer.observe(el); });
    } else {
      // Fallback: show all immediately
      revealEls.forEach(function (el) { el.classList.add('visible'); });
    }


    /* ================================================
       SCROLL TO TOP BUTTON
       ================================================ */
    const scrollTopBtn = document.getElementById('scroll-top');
    if (scrollTopBtn) {
      window.addEventListener('scroll', function () {
        if (window.pageYOffset > 500) {
          scrollTopBtn.classList.add('visible');
        } else {
          scrollTopBtn.classList.remove('visible');
        }
      });
      scrollTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }


    /* ================================================
       GALLERY FILTER
       ================================================ */
    const filterBtns = document.querySelectorAll('.filter-btn');

    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');

        const filter = btn.getAttribute('data-filter');
        // Query fresh each time so dynamically added items are included
        document.querySelectorAll('.gallery-item').forEach(function (item) {
          if (filter === 'all' || item.getAttribute('data-category') === filter) {
            item.style.display = '';
            setTimeout(function () { item.style.opacity = '1'; item.style.transform = 'scale(1)'; }, 10);
          } else {
            item.style.opacity = '0';
            item.style.transform = 'scale(0.9)';
            setTimeout(function () { item.style.display = 'none'; }, 300);
          }
        });
      });
    });


    /* ================================================
       LIGHTBOX
       ================================================ */
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxVideo = document.getElementById('lightbox-video');
    const lightboxClose = document.querySelector('.lightbox-close');

    window.openLightbox = function (src, isVideo) {
      if (!lightbox) return;
      if (isVideo) {
        lightboxImg.style.display = 'none';
        lightboxVideo.style.display = 'block';
        lightboxVideo.src = src;
        lightboxVideo.load();
        lightboxVideo.play().catch(function () {});
      } else {
        lightboxVideo.style.display = 'none';
        lightboxVideo.pause();
        lightboxVideo.src = '';
        lightboxImg.style.display = 'block';
        lightboxImg.src = src;
      }
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    };

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
      lightboxImg.src = '';
      lightboxVideo.pause();
      lightboxVideo.src = '';
      lightboxImg.style.display = 'none';
      lightboxVideo.style.display = 'none';
    }

    if (lightbox) {
      document.querySelectorAll('.gallery-item[data-img]').forEach(function (item) {
        item.addEventListener('click', function () {
          const src = item.getAttribute('data-img');
          const isVideo = item.querySelector('video') !== null;
          window.openLightbox(src, isVideo);
        });
      });

      if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
      lightbox.addEventListener('click', function (e) {
        if (e.target === lightbox) closeLightbox();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeLightbox();
      });
    }


    /* ================================================
       CONTACT FORM
       ================================================ */
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Sending...';
        btn.disabled = true;

        const data = {
          name:    contactForm.querySelector('[name="name"]').value,
          email:   contactForm.querySelector('[name="email"]').value,
          phone:   contactForm.querySelector('[name="phone"]').value,
          subject: contactForm.querySelector('[name="subject"]').value,
          message: contactForm.querySelector('[name="message"]').value
        };

        fetch('/api/admin?action=contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success) {
            btn.innerHTML = '✓ Message Sent!';
            btn.style.background = 'var(--primary)';
            contactForm.reset();
          } else {
            btn.innerHTML = 'Failed — try again';
            btn.style.background = '#c0392b';
          }
          setTimeout(function () {
            btn.innerHTML = original;
            btn.style.background = '';
            btn.disabled = false;
          }, 3500);
        })
        .catch(function () {
          btn.innerHTML = 'Error — try again';
          btn.style.background = '#c0392b';
          setTimeout(function () {
            btn.innerHTML = original;
            btn.style.background = '';
            btn.disabled = false;
          }, 3500);
        });
      });
    }


    /* ================================================
       NEWSLETTER FORM
       ================================================ */
    document.querySelectorAll('.newsletter-form').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var btn = form.querySelector('button');
        var input = form.querySelector('input[type="email"]');
        var original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '...';

        fetch('/api/admin?action=newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: input.value })
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          btn.innerHTML = res.success ? '✓ Subscribed!' : 'Error — try again';
          btn.style.background = res.success ? 'var(--primary-dark)' : '#c0392b';
          if (res.success) form.reset();
          setTimeout(function () {
            btn.innerHTML = original;
            btn.style.background = '';
            btn.disabled = false;
          }, 2500);
        })
        .catch(function () {
          btn.innerHTML = 'Error — try again';
          btn.style.background = '#c0392b';
          setTimeout(function () {
            btn.innerHTML = original;
            btn.style.background = '';
            btn.disabled = false;
          }, 2500);
        });
      });
    });



    /* ================================================
       REVIEWS — star picker, submit, load
       ================================================ */
    var _reviewRating = 0;
    var _reviewStars = null;

    var starPicker = document.getElementById('star-picker');
    if (starPicker) {
      _reviewStars = starPicker.querySelectorAll('[data-rating]');

      _reviewStars.forEach(function (star) {
        star.addEventListener('mouseover', function () {
          var hover = parseInt(star.dataset.rating, 10);
          _reviewStars.forEach(function (s) {
            s.style.color = parseInt(s.dataset.rating, 10) <= hover ? '#f39c12' : '#ccc';
          });
        });
        star.addEventListener('mouseout', function () {
          _reviewStars.forEach(function (s) {
            s.style.color = parseInt(s.dataset.rating, 10) <= _reviewRating ? '#f39c12' : '#ccc';
          });
        });
        star.addEventListener('click', function () {
          _reviewRating = parseInt(star.dataset.rating, 10);
          document.getElementById('review-rating').value = _reviewRating;
          _reviewStars.forEach(function (s) {
            s.style.color = parseInt(s.dataset.rating, 10) <= _reviewRating ? '#f39c12' : '#ccc';
          });
        });
      });
      _reviewStars.forEach(function (s) { s.style.color = '#ccc'; });
    }

    var reviewForm = document.getElementById('review-form');
    if (reviewForm) {
      reviewForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = document.getElementById('review-name').value.trim();
        var rating = document.getElementById('review-rating').value;
        var message = document.getElementById('review-message').value.trim();
        var statusEl = document.getElementById('review-status');
        var btn = reviewForm.querySelector('button[type="submit"]');
        var original = btn.innerHTML;

        if (!name || !rating || !message) {
          statusEl.style.color = '#c0392b';
          statusEl.textContent = 'Please fill in all fields and select a rating.';
          statusEl.style.display = 'block';
          return;
        }

        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Submitting...';
        statusEl.style.display = 'none';

        fetch('/api/admin?action=review', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name, rating: parseInt(rating, 10), message: message })
        })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (res.success) {
            statusEl.style.color = 'var(--primary)';
            statusEl.textContent = 'Thank you! Your review has been submitted and will appear after approval.';
            statusEl.style.display = 'block';
            reviewForm.reset();
            _reviewRating = 0;
            if (_reviewStars) _reviewStars.forEach(function (s) { s.style.color = '#ccc'; });
            btn.innerHTML = '✓ Submitted!';
            setTimeout(function () { btn.innerHTML = original; btn.disabled = false; }, 3500);
          } else {
            statusEl.style.color = '#c0392b';
            statusEl.textContent = res.error || 'Something went wrong. Please try again.';
            statusEl.style.display = 'block';
            btn.innerHTML = original;
            btn.disabled = false;
          }
        })
        .catch(function () {
          statusEl.style.color = '#c0392b';
          statusEl.textContent = 'Network error. Please try again.';
          statusEl.style.display = 'block';
          btn.innerHTML = original;
          btn.disabled = false;
        });
      });
    }

    function escReview(str) {
      return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function loadReviews() {
      var grid = document.getElementById('reviews-grid');
      if (!grid) return;
      fetch('/api/admin?action=reviews')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (!Array.isArray(data) || !data.length) {
            grid.innerHTML = '<p class="reviews-empty">No reviews yet. Be the first to share your experience!</p>';
            return;
          }
          grid.innerHTML = data.map(function (review) {
            var stars = '';
            for (var i = 1; i <= 5; i++) {
              stars += '<i class="fas fa-star" style="color:' + (i <= review.rating ? '#f39c12' : '#ddd') + ';font-size:15px;"></i>';
            }
            return '<div class="review-card">' +
              '<div class="review-stars">' + stars + '</div>' +
              '<p class="review-message">“' + escReview(review.message) + '”</p>' +
              '<p class="review-author">— ' + escReview(review.name) + '</p>' +
              '</div>';
          }).join('');
        })
        .catch(function () {});
    }

    loadReviews();

  }); // end ready

})();
