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
});
