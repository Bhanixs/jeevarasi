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

    /* ---- Active nav link: current page, with scroll-spy for in-page sections ---- */
    (function () {
      const navLinks = Array.from(document.querySelectorAll('.main-nav a'));
      const currentPage = window.location.pathname.replace(/^\/|\.html$/g, '').split('/').pop() || 'index';

      function setActive(link) {
        navLinks.forEach(function (l) { l.closest('li') && l.closest('li').classList.remove('active'); });
        if (link) link.closest('li') && link.closest('li').classList.add('active');
      }

      const entries = navLinks.map(function (link) {
        const raw = link.getAttribute('href') || '';
        const [rawPath, hash] = raw.split('#');
        const linkPage = rawPath.replace(/^\/|\.html$/g, '') || 'index';
        return { link: link, page: linkPage, hash: hash ? '#' + hash : null };
      }).filter(function (e) { return e.page === currentPage; });

      const sectionEntries = entries.filter(function (e) { return e.hash && document.querySelector(e.hash); });
      const pageEntry = entries.find(function (e) { return !e.hash; });

      if (sectionEntries.length) {
        function pickByScroll() {
          const headerH = header ? header.offsetHeight : 0;
          let active = pageEntry;
          sectionEntries.forEach(function (e) {
            const target = document.querySelector(e.hash);
            if (target && target.getBoundingClientRect().top - headerH - 20 <= 0) {
              active = e;
            }
          });
          setActive(active ? active.link : null);
        }
        pickByScroll();
        window.addEventListener('scroll', pickByScroll, { passive: true });
      } else if (pageEntry) {
        setActive(pageEntry.link);
      }
    })();


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
       SMOOTH SCROLL (anchor links) — scrolls to in-page
       sections without ever leaving a "#section" in the
       address bar. Cross-page section links (e.g. a
       "Projects" link on the About page shown from the
       Blog page) hand the target off via sessionStorage
       and navigate to the plain page URL.
       ================================================ */
    function scrollToElement(hash) {
      const target = document.querySelector(hash);
      if (target) {
        const headerH = header ? header.offsetHeight : 0;
        const offset = target.getBoundingClientRect().top + window.pageYOffset - headerH - 10;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    }

    const currentPageForScroll = window.location.pathname.replace(/^\/|\.html$/g, '').split('/').pop() || 'index';

    document.querySelectorAll('a[href*="#"]').forEach(function (anchor) {
      const raw = anchor.getAttribute('href') || '';
      const hashIdx = raw.indexOf('#');
      const hash = raw.slice(hashIdx);
      if (hash.length <= 1) return; // bare "#" placeholders — leave as-is
      const pagePart = raw.slice(0, hashIdx);
      const linkPage = (pagePart.split('?')[0] || '').replace(/^\/|\.html$/g, '') || 'index';

      anchor.addEventListener('click', function (e) {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

        if (linkPage === currentPageForScroll && !pagePart.includes('?')) {
          if (document.querySelector(hash)) {
            e.preventDefault();
            scrollToElement(hash);
          }
        } else {
          e.preventDefault();
          sessionStorage.setItem('jeevarasiScrollTo', hash);
          window.location.href = pagePart || '/';
        }
      });
    });

    // Arrived from another page (via the handoff above), or from an old
    // bookmarked "#section" link — scroll to the target, then strip the
    // hash so it never shows in the address bar.
    const pendingHash = sessionStorage.getItem('jeevarasiScrollTo');
    if (pendingHash) {
      sessionStorage.removeItem('jeevarasiScrollTo');
      setTimeout(function () { scrollToElement(pendingHash); }, 120);
    } else if (window.location.hash) {
      const hash = window.location.hash;
      if (window.history && window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      setTimeout(function () { scrollToElement(hash); }, 120);
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
       CONTACT FORM & CTA SUBJECT PRE-SELECTION
       ================================================ */
    (function () {
      const subjectSelect = document.getElementById('contact-subject');
      const nameInput = document.getElementById('contact-name');

      function applySubject(val) {
        if (!subjectSelect || !val) return;
        const exists = Array.from(subjectSelect.options).some(function (o) { return o.value === val; });
        if (exists) {
          subjectSelect.value = val;
        }
      }

      // Check URL query param e.g. contact?subject=volunteer
      const urlParams = new URLSearchParams(window.location.search);
      const urlSubject = urlParams.get('subject');
      if (urlSubject) {
        applySubject(urlSubject);
        if (nameInput) {
          setTimeout(function () { nameInput.focus(); }, 350);
        }
      }

      // CTA buttons with data-subject
      document.querySelectorAll('[data-subject]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const sub = btn.getAttribute('data-subject');
          applySubject(sub);
          if (nameInput) {
            setTimeout(function () { nameInput.focus(); }, 350);
          }
        });
      });
    })();

    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      const statusEl = document.getElementById('contact-status');

      function showContactStatus(msg, isSuccess) {
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.style.display = 'block';
        if (isSuccess) {
          statusEl.style.color = '#1b5e20';
          statusEl.style.background = '#e8f5e9';
          statusEl.style.border = '1px solid #c8e6c9';
        } else {
          statusEl.style.color = '#b71c1c';
          statusEl.style.background = '#ffebee';
          statusEl.style.border = '1px solid #ffcdd2';
        }
      }

      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        if (statusEl) statusEl.style.display = 'none';

        const nameInput = contactForm.querySelector('[name="name"]');
        const emailInput = contactForm.querySelector('[name="email"]');
        const phoneInput = contactForm.querySelector('[name="phone"]');
        const subjectInput = contactForm.querySelector('[name="subject"]');
        const messageInput = contactForm.querySelector('[name="message"]');

        const name = (nameInput ? nameInput.value : '').trim();
        const email = (emailInput ? emailInput.value : '').trim();
        const phone = (phoneInput ? phoneInput.value : '').trim();
        const subject = (subjectInput ? subjectInput.value : '').trim();
        const message = (messageInput ? messageInput.value : '').trim();

        // Client-side validation
        if (!name) {
          showContactStatus('Please enter your full name.', false);
          if (nameInput) nameInput.focus();
          return;
        }
        if (!email || !email.includes('@') || !email.includes('.')) {
          showContactStatus('Please enter a valid email address.', false);
          if (emailInput) emailInput.focus();
          return;
        }
        if (!subject) {
          showContactStatus('Please select a subject from the dropdown.', false);
          if (subjectInput) subjectInput.focus();
          return;
        }
        if (!message) {
          showContactStatus('Please enter your message.', false);
          if (messageInput) messageInput.focus();
          return;
        }

        const btn = contactForm.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Sending...';
        btn.disabled = true;

        const data = { name, email, phone, subject, message };

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
            showContactStatus('Thank you! Your message has been sent successfully. We will get back to you shortly.', true);
            contactForm.reset();
          } else {
            btn.innerHTML = 'Failed — try again';
            btn.style.background = '#c0392b';
            showContactStatus(res.error || 'Submission failed. Please try again.', false);
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
          showContactStatus('Connection error. Please check your network and try again.', false);
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
        var email = (input ? input.value : '').trim();

        if (!email || !email.includes('@') || !email.includes('.')) {
          if (input) input.focus();
          return;
        }

        var original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '...';

        fetch('/api/admin?action=newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email })
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
