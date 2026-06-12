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
       CONTACT FORM (basic validation)
       ================================================ */
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
      contactForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const btn = contactForm.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.innerHTML = '<span class="spinner"></span> Sending...';
        btn.disabled = true;

        // Simulate send (replace with real API call)
        setTimeout(function () {
          btn.innerHTML = '✓ Message Sent!';
          btn.style.background = 'var(--primary)';
          contactForm.reset();
          setTimeout(function () {
            btn.innerHTML = original;
            btn.style.background = '';
            btn.disabled = false;
          }, 3500);
        }, 1500);
      });
    }


    /* ================================================
       NEWSLETTER FORM
       ================================================ */
    const newsletterForm = document.querySelector('.newsletter-form');
    if (newsletterForm) {
      newsletterForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const btn = newsletterForm.querySelector('button');
        btn.innerHTML = '✓ Subscribed!';
        btn.style.background = 'var(--primary-dark)';
        setTimeout(function () {
          btn.innerHTML = 'Subscribe';
          btn.style.background = '';
          newsletterForm.reset();
        }, 2500);
      });
    }

  }); // end ready

})();
