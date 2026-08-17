// LiveWire 4.0 — shared behavior across pages

document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.primary-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      nav.classList.toggle('is-open');
      const open = nav.classList.contains('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => nav.classList.remove('is-open'));
    });
  }

  // Mark active nav link based on current page
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.primary-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('is-active');
    }
  });

  // Scroll reveal
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal');
  if (reduced) {
    revealEls.forEach(el => el.classList.add('is-visible'));
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('is-visible'));
  }

  // Events page: category filter
  const filterBtns = document.querySelectorAll('.filter-btn');
  const eventItems = document.querySelectorAll('.event-item');
  if (filterBtns.length && eventItems.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        const cat = btn.dataset.filter;
        eventItems.forEach(item => {
          const show = cat === 'all' || item.dataset.category === cat;
          item.style.display = show ? '' : 'none';
        });
      });
    });
  }

  // Registration button: friendly no-op / coming soon state
  const regBtn = document.querySelector('[data-reg-cta]');
  if (regBtn) {
    regBtn.addEventListener('click', (e) => {
      e.preventDefault();
      regBtn.classList.add('is-disabled');
      const label = regBtn.querySelector('.btn-label');
      if (label) {
        const original = label.textContent;
        label.textContent = 'Opening soon — check back';
        setTimeout(() => { label.textContent = original; regBtn.classList.remove('is-disabled'); }, 2200);
      }
    });
  }

  // Smooth details animation
  const details = document.querySelectorAll('details');
  details.forEach(targetDetail => {
    targetDetail.addEventListener('click', (e) => {
      const summary = e.target.closest('summary');
      if (!summary) return;
      e.preventDefault();
      
      const body = targetDetail.querySelector('.event-body');
      if (!body) {
        if (targetDetail.hasAttribute('open')) targetDetail.removeAttribute('open');
        else targetDetail.setAttribute('open', 'true');
        return;
      }
      
      if (targetDetail.hasAttribute('open')) {
        body.style.animation = 'detailsSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards';
        setTimeout(() => {
          targetDetail.removeAttribute('open');
          body.style.animation = '';
        }, 250);
      } else {
        targetDetail.setAttribute('open', 'true');
        body.style.animation = 'detailsSlideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
      }
    });
  });


  // ─── Custom cursor (non-touch devices only) ───
  if (window.matchMedia('(pointer: fine)').matches) {
    const ring = document.createElement('div');
    const dot  = document.createElement('div');
    ring.className = 'cursor-ring';
    dot.className  = 'cursor-dot';
    document.body.appendChild(ring);
    document.body.appendChild(dot);

    let mouseX = -100, mouseY = -100;   // true mouse position
    let ringX  = -100, ringY  = -100;   // ring (follows instantly)
    let dotX   = -100, dotY   = -100;   // dot  (follows with lag)
    const ease = 0.15;                  // lerp factor for the dot

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      // show cursors on first move
      ring.style.display = 'block';
      dot.style.display  = 'block';
    });

    document.addEventListener('mouseleave', () => {
      ring.style.display = 'none';
      dot.style.display  = 'none';
    });
    document.addEventListener('mouseenter', () => {
      ring.style.display = 'block';
      dot.style.display  = 'block';
    });

    // hover detection for interactive elements
    const hoverTargets = 'a, button, [role="button"], input, textarea, select, summary, .btn, .filter-btn, .card';
    document.addEventListener('mouseover', e => {
      if (e.target.closest(hoverTargets)) {
        ring.classList.add('is-hover');
        dot.classList.add('is-hover');
      }
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest(hoverTargets)) {
        ring.classList.remove('is-hover');
        dot.classList.remove('is-hover');
      }
    });

    function animateCursor() {
      // ring follows mouse directly
      ringX = mouseX;
      ringY = mouseY;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;

      // dot follows with smooth lerp
      dotX += (mouseX - dotX) * ease;
      dotY += (mouseY - dotY) * ease;
      dot.style.transform = `translate(${dotX}px, ${dotY}px) translate(-50%, -50%)`;

      requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

});
