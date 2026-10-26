(function () {
  if (customElements.get('dls-map')) return;
  const CSS = `dls-map{display:block;position:relative;width:100%;height:100%}
:root,[data-theme="dark"]{--mf:#262B31;--ml:#3B4148;--mz:rgba(224,0,27,.28);--mzl:#FF3B4A}
[data-theme="light"]{--mf:#F4F5F6;--ml:#A9AFB6;--mz:rgba(224,0,27,.16);--mzl:#E0001B}
@keyframes dlsMapPulse{0%{transform:scale(1);opacity:.6}100%{transform:scale(4.5);opacity:0}}`;
  const CX = 399, CY = 210; // Запоріжжя у viewBox 560×380
  const EIO = 'cubic-bezier(.65,0,.35,1)', EOUT = 'cubic-bezier(.16,1,.3,1)';
  const NS = 'http://www.w3.org/2000/svg';
  const cache = {};
  const load = (src) => cache[src] || (cache[src] = fetch(src).then(r => r.text()).then(t => {
    const doc = new DOMParser().parseFromString(t, 'image/svg+xml');
    return [...doc.querySelectorAll('path')].map(p => p.getAttribute('d'));
  }));

  class DlsMap extends HTMLElement {
    connectedCallback() {
      if (this._built) return;
      this._built = true;
      if (!document.getElementById('dls-map-css')) {
        const s = document.createElement('style'); s.id = 'dls-map-css'; s.textContent = CSS; document.head.appendChild(s);
      }
      this.setAttribute('role', 'img');
      this.setAttribute('aria-label', 'Карта України, виділено Запорізьку область');
      this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const svg = this.svg = document.createElementNS(NS, 'svg');
      svg.setAttribute('viewBox', '0 0 560 380');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.cssText = 'display:block;width:100%;height:100%;overflow:visible';
      this.appendChild(svg);
      const dot = (extra) => { const d = document.createElement('span'); d.setAttribute('aria-hidden', 'true'); d.style.cssText = 'position:absolute;left:71.26%;top:55.28%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;' + extra; this.appendChild(d); return d; };
      this.ring = dot('box-sizing:border-box;border:1px solid var(--mzl);opacity:0;');
      this.pulse = dot('background:var(--text,#F4F5F6);opacity:0;');
      this.dot = dot('background:var(--text,#F4F5F6);');
      const lb = this.label = document.createElement('span');
      lb.textContent = 'Запоріжжя';
      lb.style.cssText = "position:absolute;right:calc(28.74% + 10px);top:55.28%;transform:translateY(-50%);font:500 14px/1.45 'IBM Plex Sans',sans-serif;color:var(--text,#F4F5F6);white-space:nowrap;";
      this.appendChild(lb);
      load(this.getAttribute('src') || 'assets/geo/ukraine-zp-dark.svg').then(ds => this.build(ds));
    }
    build(ds) {
      const mk = (d, fill, stroke) => { const p = document.createElementNS(NS, 'path'); p.setAttribute('d', d); p.setAttribute('stroke-width', '1'); p.setAttribute('stroke-linejoin', 'round'); p.style.fill = fill; p.style.stroke = stroke; this.svg.appendChild(p); return p; };
      this.regions = ds[0].split(/(?=M)/).filter(Boolean).map(d => mk(d, 'var(--mf)', 'var(--ml)'));
      this.zp = mk(ds[1], 'var(--mz)', 'var(--mzl)');
      if (this.reduced) { this.startPulse(); return; }
      this.hide();
      this.io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { this.io.disconnect(); this.play(); } }, { threshold: 0.35 });
      this.io.observe(this);
    }
    hide() {
      [...this.regions, this.zp].forEach(p => { const L = p.getTotalLength(); p._len = L; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.style.fillOpacity = 0; });
      [this.dot, this.label].forEach(e => e.style.opacity = 0);
    }
    play() {
      const pts = this.regions.map(p => { const b = p.getBBox(); return Math.hypot(b.x + b.width / 2 - CX, b.y + b.height / 2 - CY); });
      const max = Math.max(...pts);
      const end = (p) => () => { p.style.strokeDasharray = 'none'; p.style.strokeDashoffset = 0; p.style.fillOpacity = 1; };
      this.regions.forEach((p, i) => {
        const dl = 100 + (1 - pts[i] / max) * 900;
        p.animate({ strokeDashoffset: [p._len, 0] }, { duration: 1100, delay: dl, easing: EIO, fill: 'forwards' });
        p.animate({ fillOpacity: [0, 1] }, { duration: 800, delay: dl + 450, easing: 'ease', fill: 'forwards' }).onfinish = end(p);
      });
      const z = this.zp;
      z.animate({ strokeDashoffset: [z._len, 0] }, { duration: 900, delay: 1250, easing: EIO, fill: 'forwards' });
      z.animate({ fillOpacity: [0, 1] }, { duration: 700, delay: 1750, easing: 'ease', fill: 'forwards' }).onfinish = end(z);
      this.dot.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 500, delay: 1950, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'forwards' }).onfinish = () => { this.dot.style.opacity = 1; this.startPulse(); };
      this.ring.animate([{ opacity: .6, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(16)' }], { duration: 1400, delay: 2000, easing: EOUT });
      this.label.animate([{ opacity: 0, transform: 'translate(8px,-50%)' }, { opacity: 1, transform: 'translate(0,-50%)' }], { duration: 700, delay: 2100, easing: EOUT, fill: 'forwards' }).onfinish = () => { this.label.style.opacity = 1; };
    }
    startPulse() { if (!this.reduced) this.pulse.style.animation = 'dlsMapPulse 2s cubic-bezier(.16,1,.3,1) infinite'; }
    disconnectedCallback() { this.io && this.io.disconnect(); }
  }
  customElements.define('dls-map', DlsMap);
})();
