/* =====================================================================
   Elsy Lagunas · Psicóloga y Terapeuta — script.js
   Concepto: "El árbol que escucha".

   Principios:
   · Mejora progresiva: sin JavaScript la página se lee completa (el estado
     oculto de las entradas solo existe con la clase `js` en <html>).
   · Nada depende de la CDN: anime.js solo suma efectos extra (floración del
     árbol y trazos); si no carga, el mismo efecto corre con la Web Animations API.
   · `prefers-reduced-motion`: todo queda visible y quieto.
   · Una sola constante de WhatsApp (abajo). Si estuviera vacía, los botones
     y el envío del formulario se ocultan con elegancia.
   ===================================================================== */
(() => {
  'use strict';

  /* ---------------------------------------------------------------
     CONFIGURACIÓN — único lugar donde vive el número de WhatsApp
     (lada de México 52 + 10 dígitos). Dejar '' para ocultar WhatsApp.
     --------------------------------------------------------------- */
  const WHATSAPP = '522721345027';
  const MENSAJE_BASE = 'Hola Elsy, me gustaría agendar una cita.';

  /* ---------------------------------------------------------------
     Utilidades
     --------------------------------------------------------------- */
  const raiz = document.documentElement;
  raiz.classList.add('js');

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const NS = 'http://www.w3.org/2000/svg';

  const svgEl = (nombre, attrs = {}) => {
    const e = document.createElementNS(NS, nombre);
    Object.keys(attrs).forEach((k) => e.setAttribute(k, attrs[k]));
    return e;
  };

  /** Generador pseudoaleatorio con semilla: el árbol se ve igual en cada visita. */
  const semilla = (s) => () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /** Une una lista en lenguaje natural: "a, b y c". */
  const lista = (items) => (items.length < 2
    ? items.join('')
    : items.slice(0, -1).join(', ') + ' y ' + items[items.length - 1]);

  /** Ejecuta cb cuando anime.js esté listo, o tras `max` ms si la CDN tarda o falla. */
  function esperarAnime(cb, max = 600) {
    if (typeof window.anime === 'function') { cb(); return; }
    let hecho = false;
    const ir = () => { if (!hecho) { hecho = true; cb(); } };
    const tag = $('#anime-cdn');
    if (tag) tag.addEventListener('load', ir, { once: true });
    setTimeout(ir, max);
  }

  /* ---------------------------------------------------------------
     Trazos SVG que se dibujan (anime.js si está; si no, WAAPI)
     --------------------------------------------------------------- */
  function prepararTrazo(path) {
    try {
      const largo = path.getTotalLength();
      if (!largo) return 0;
      path.dataset.largo = String(largo);
      path.style.strokeDasharray = String(largo);
      path.style.strokeDashoffset = String(largo);
      return largo;
    } catch (e) { return 0; }
  }

  function dibujarTrazo(path, dur = 1200, delay = 0) {
    const largo = parseFloat(path.dataset.largo) || 0;
    const fin = () => { path.style.strokeDashoffset = '0'; path.style.strokeDasharray = 'none'; };
    if (!largo) { fin(); return; }
    if (typeof window.anime === 'function') {
      window.anime({
        targets: path, strokeDashoffset: [largo, 0], duration: dur, delay,
        easing: 'easeInOutSine', complete: fin
      });
    } else if (path.animate) {
      const a = path.animate(
        [{ strokeDashoffset: largo + 'px' }, { strokeDashoffset: '0px' }],
        { duration: dur, delay, easing: 'cubic-bezier(.65,0,.35,1)', fill: 'both' }
      );
      a.onfinish = () => { fin(); a.cancel(); };
    } else { fin(); }
  }

  /* =================================================================
     1) CARGADOR — se va solo en ≤ 2.4 s (y el CSS lo oculta aunque esto falle)
     ================================================================= */
  function iniciarCargador(alSalir) {
    const cargador = $('#cargador');
    if (!cargador) { alSalir(); return; }
    if (reduce) { cargador.remove(); alSalir(); return; }

    const cuenta = $('#cuenta');
    let salio = false;

    const terminar = () => {
      if (salio) return;
      salio = true;
      cargador.classList.add('salir');
      raiz.classList.add('listo');
      alSalir();
      setTimeout(() => cargador.remove(), 760);
    };

    const INICIO = 120;
    const DURACION = 1450;
    const paso = () => {
      const t = clamp((performance.now() - INICIO) / DURACION, 0, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      if (cuenta) cuenta.textContent = String(Math.round(e * 100));
      if (t < 1 && !salio) requestAnimationFrame(paso);
      else setTimeout(terminar, 110);
    };
    requestAnimationFrame(paso);
    // Tope absoluto (desde que empezó la navegación): 1.7 s + 0.62 s de salida < 2.4 s
    setTimeout(terminar, Math.max(0, 1700 - performance.now()));
  }

  /* =================================================================
     2) WHATSAPP — enlaces con mensaje, botón flotante y formulario
     ================================================================= */
  const urlWA = (mensaje) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

  function iniciarWhatsApp() {
    const enlaces = $$('[data-wa]');
    if (!WHATSAPP) {
      enlaces.forEach((a) => a.classList.add('wa-oculto'));
      return;
    }
    enlaces.forEach((a) => {
      a.href = urlWA(a.dataset.waMsg || MENSAJE_BASE);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }

  function iniciarFormulario() {
    const form = $('#form-contacto');
    if (!form) return;
    const nombre = $('#f-nombre');
    const error = $('#err-nombre');
    const estado = $('#form-estado');
    const enviar = $('#form-enviar');
    const campo = nombre ? nombre.closest('.campo') : null;

    if (!WHATSAPP) {
      if (enviar) enviar.classList.add('wa-oculto');
      if (estado) estado.textContent = 'Por ahora, usa los datos de contacto de esta página para agendar tu cita.';
      form.addEventListener('submit', (e) => e.preventDefault());
      return;
    }

    const limpiarError = () => {
      if (campo) campo.classList.remove('invalido');
      if (nombre) nombre.removeAttribute('aria-invalid');
      if (error) error.textContent = '';
    };
    if (nombre) nombre.addEventListener('input', limpiarError);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const quien = (nombre ? nombre.value : '').trim().replace(/\s+/g, ' ');
      if (quien.length < 2) {
        if (campo) campo.classList.add('invalido');
        if (nombre) { nombre.setAttribute('aria-invalid', 'true'); nombre.focus(); }
        if (error) error.textContent = 'Escribe tu nombre para que Elsy sepa cómo llamarte.';
        return;
      }
      limpiarError();

      const modalidadSel = form.querySelector('input[name="modalidad"]:checked');
      const modalidad = modalidadSel ? modalidadSel.value : '';
      const motivos = $$('input[name="motivo"]:checked', form).map((i) => i.value);
      const extraEl = $('#f-mensaje');
      const extra = extraEl ? extraEl.value.trim() : '';

      const partes = [`Hola Elsy, soy ${quien}. Me gustaría agendar una cita.`];
      if (modalidad) partes.push(`Prefiero sesión ${modalidad}.`);
      if (motivos.length) partes.push(`Me gustaría trabajar: ${lista(motivos)}.`);
      if (extra) partes.push(extra);
      const url = urlWA(partes.join('\n'));

      if (estado) {
        estado.textContent = 'Abriendo WhatsApp con tu mensaje listo… ';
        const a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
        a.textContent = 'Si no se abre, toca aquí.';
        estado.append(a);
      }
      const ventana = window.open(url, '_blank');
      if (ventana) ventana.opener = null;
      else window.location.href = url;
    });
  }

  /* =================================================================
     3) MENÚ MÓVIL, ENCABEZADO Y NAVEGACIÓN ACTIVA
     ================================================================= */
  function iniciarMenu() {
    const burger = $('#burger');
    const menu = $('#menu-movil');
    if (!burger || !menu) return;
    const enlaces = $$('a', menu);

    const abrir = (si) => {
      document.body.classList.toggle('menu-abierto', si);
      burger.setAttribute('aria-expanded', String(si));
      burger.setAttribute('aria-label', si ? 'Cerrar menú' : 'Abrir menú');
      menu.setAttribute('aria-hidden', String(!si));
      enlaces.forEach((a) => { a.tabIndex = si ? 0 : -1; });
      if (si) setTimeout(() => { if (enlaces[0]) enlaces[0].focus({ preventScroll: true }); }, 450);
    };

    burger.addEventListener('click', () => abrir(!document.body.classList.contains('menu-abierto')));
    enlaces.forEach((a) => a.addEventListener('click', () => abrir(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) { abrir(false); burger.focus(); }
    });
    window.matchMedia('(min-width: 900px)').addEventListener('change', (e) => { if (e.matches) abrir(false); });
  }

  function iniciarNavActiva() {
    if (!('IntersectionObserver' in window)) return;
    const enlaces = $$('.menu a[href^="#"]');
    const mapa = new Map(enlaces.map((a) => [a.getAttribute('href').slice(1), a]));
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        enlaces.forEach((a) => { a.classList.remove('activo'); a.removeAttribute('aria-current'); });
        const a = mapa.get(en.target.id);
        if (a) { a.classList.add('activo'); a.setAttribute('aria-current', 'true'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    mapa.forEach((_, id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* =================================================================
     4) ENTRADAS AL HACER SCROLL, CONTADORES E ICONOS QUE SE DIBUJAN
     ================================================================= */
  function iniciarReveal() {
    const els = $$('.rv');
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
  }

  function iniciarContadores() {
    const els = $$('[data-contar]');
    // El número final ya está escrito en el HTML: sin JS o con movimiento reducido se queda así.
    if (!els.length || reduce || !('IntersectionObserver' in window)) return;
    els.forEach((e) => { e.textContent = '0'; });
    const contar = (el) => {
      const fin = parseInt(el.dataset.contar, 10) || 0;
      const t0 = performance.now();
      const paso = (ahora) => {
        const t = clamp((ahora - t0) / 1600, 0, 1);
        el.textContent = String(Math.round(fin * (1 - Math.pow(1 - t, 3))));
        if (t < 1) requestAnimationFrame(paso); else el.textContent = String(fin);
      };
      requestAnimationFrame(paso);
    };
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); contar(en.target); } });
    }, { threshold: 0.6 });
    els.forEach((e) => io.observe(e));
  }

  /** Iconos de los pilares y ramas decorativas: se dibujan al entrar en pantalla. */
  function iniciarTrazosDecorativos() {
    if (reduce || !('IntersectionObserver' in window)) return;
    const grupos = [
      ...$$('.pilar').map((el) => ({ el, trazos: $$('.dibuja', el) })),
      ...$$('.manifiesto__rama').map((el) => ({ el, trazos: $$('.trazo-sec', el) }))
    ].filter((g) => g.trazos.length);
    grupos.forEach((g) => g.trazos.forEach(prepararTrazo));
    const io = new IntersectionObserver((entradas) => {
      entradas.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        const g = grupos.find((x) => x.el === en.target);
        if (g) g.trazos.forEach((p, i) => dibujarTrazo(p, 1300, 250 + i * 220));
      });
    }, { threshold: 0.25 });
    grupos.forEach((g) => io.observe(g.el));
  }

  /* =================================================================
     5) HERO — partículas, árbol que se dibuja, mariposa y parallax 3D
     ================================================================= */
  function prepararArbol() {
    const svg = $('#arbol');
    const gHojas = $('#arbol-hojas');
    if (!svg || !gHojas || !svg.getTotalLength) return null;
    const trazos = $$('.trazo', svg);
    if (trazos.length < 9) return null;

    const R = semilla(11);
    const hojas = [];

    const crearHoja = (x, y, rot, escala) => {
      const g = svgEl('g', { transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${escala.toFixed(2)})` });
      const mece = svgEl('g');
      const h = svgEl('path', { class: 'hoja-l', d: 'M0 0 C6.5 -5 7.5 -15 0 -22 C-7.5 -15 -6.5 -5 0 0Z M0 -1 L0 -15' });
      mece.append(h); g.append(mece); gHojas.append(g);
      hojas.push({ h, mece });
    };

    // Hojas a lo largo de las ramas (trazos 3 a 7) y una corona en la copa
    [3, 4, 5, 6, 7].forEach((idx) => {
      const p = trazos[idx];
      let largo = 0;
      try { largo = p.getTotalLength(); } catch (e) { return; }
      const n = Math.max(4, Math.round(largo / 20));
      for (let k = 1; k <= n; k++) {
        const d = (0.12 + 0.88 * (k / n)) * largo;
        const a = p.getPointAtLength(d);
        const b = p.getPointAtLength(Math.min(largo, d + 2));
        const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
        const lado = k % 2 ? 1 : -1;
        const abre = k === n ? 0 : lado * (38 + R() * 32);
        crearHoja(a.x, a.y, ang + abre + 90, 0.75 + R() * 0.55);
      }
    });
    for (let j = -3; j <= 3; j++) crearHoja(200, 118, j * 24, 1.05 + (3 - Math.abs(j)) * 0.07);

    // Sin movimiento: el árbol queda dibujado y quieto
    if (reduce) return { animar() {} };

    const largos = trazos.map(prepararTrazo);
    hojas.forEach((o) => { o.h.style.opacity = '0'; });

    const retrasos = [0, 900, 900, 1000, 1000, 1000, 1150, 1150, 1700];
    const duraciones = [1300, 900, 900, 1100, 1100, 1300, 900, 900, 1200];

    const florecer = () => {
      const els = hojas.map((o) => o.h);
      if (typeof window.anime === 'function') {
        window.anime({
          targets: els, scale: [0, 1], opacity: [0, 1],
          delay: window.anime.stagger(26, { start: 700 }), duration: 1200,
          easing: 'easeOutElastic(1, .55)'
        });
      } else {
        els.forEach((h, i) => {
          if (!h.animate) { h.style.opacity = '1'; return; }
          h.animate(
            [{ transform: 'scale(0)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
            { duration: 900, delay: 700 + i * 26, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'both' }
          );
        });
      }
    };

    return {
      animar() {
        trazos.forEach((p, i) => dibujarTrazo(p, duraciones[i] || 1100, retrasos[i] || 0));
        esperarAnime(florecer, 600);

        // Vaivén permanente de las hojas (siempre en movimiento)
        hojas.forEach((o) => {
          if (!o.mece.animate) return;
          o.mece.animate(
            [{ transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }],
            { duration: 2600 + R() * 2600, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out', delay: -R() * 3000 }
          );
        });

        // Savia: destellos dorados que recorren ramas y raíces sin parar
        if (!svg.animate) return;
        const gP = svgEl('g', { class: 'arbol__pulsos' });
        svg.insertBefore(gP, gHojas);
        trazos.slice(0, 8).forEach((p, i) => {
          const largo = largos[i];
          if (!largo) return;
          const c = svgEl('path', { class: 'pulso', d: p.getAttribute('d') });
          c.style.strokeDasharray = `12 ${largo + 12}`;
          gP.append(c);
          const sentido = i === 1 || i === 2 ? [-largo, 12] : [12, -largo]; // raíces: la savia sube
          c.animate(
            [
              { strokeDashoffset: sentido[0] + 'px', offset: 0 },
              { strokeDashoffset: sentido[1] + 'px', offset: 0.62 },
              { strokeDashoffset: sentido[1] + 'px', offset: 1 }
            ],
            { duration: Math.max(3400, largo * 22), delay: 3200 + i * 700, iterations: Infinity, easing: 'linear', fill: 'both' }
          );
        });
      }
    };
  }

  function iniciarHero() {
    const hero = $('#inicio');
    if (!hero) return { entrada() {} };
    const cv = $('#particulas');
    const ctx = cv && cv.getContext ? cv.getContext('2d') : null;
    const visual = $('#hero-visual');
    const mar = $('#mariposa');
    const arbol = prepararArbol();

    let entrado = false;
    const entrada = () => {
      if (entrado) return;
      entrado = true;
      if (arbol) arbol.animar();
      if (mar) mar.style.opacity = '1';
    };

    if (mar) {
      mar.style.opacity = reduce ? '1' : '0';
      mar.style.transition = 'opacity 1.4s ease';
    }

    // ---- Movimiento reducido: mariposa quieta junto al retrato y sin bucle ----
    if (reduce) {
      if (mar && visual) {
        const w = visual.offsetWidth;
        mar.style.transform = `translate3d(${(w * 0.84).toFixed(0)}px, ${(w * 0.06).toFixed(0)}px, 0) rotate(24deg)`;
      }
      return { entrada, medir() {}, scroll() {} };
    }

    /* ----- Partículas: hojas y motas que suben con vaivén ----- */
    const PALETA = [[15, 139, 130], [109, 187, 160], [141, 185, 107], [226, 182, 107], [95, 143, 69]];
    let W = 0, H = 0, dpr = 1;
    let mw = 46, mh = 40; // tamaño de la mariposa (un <svg> no tiene offsetWidth)
    const particulas = [];
    const nueva = (inicial) => {
      const hoja = Math.random() < 0.55;
      return {
        hoja,
        c: PALETA[(Math.random() * PALETA.length) | 0],
        r: hoja ? 5 + Math.random() * 8 : 1.4 + Math.random() * 2.6,
        x: Math.random() * W,
        y: inicial ? Math.random() * H : H + 24,
        vy: 10 + Math.random() * 22,
        vx: 0,
        fase: Math.random() * 6.283,
        frec: 0.35 + Math.random() * 0.6,
        amp: 10 + Math.random() * 22,
        rot: Math.random() * 6.283,
        vrot: (Math.random() - 0.5) * 0.9,
        a: 0.14 + Math.random() * 0.3
      };
    };

    const medir = () => {
      if (mar) {
        const cs = getComputedStyle(mar);
        mw = parseFloat(cs.width) || 46; mh = parseFloat(cs.height) || 40;
      }
      if (!cv || !ctx) return;
      W = hero.clientWidth; H = hero.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(clamp((W * H) / 30000, 16, 46));
      while (particulas.length < n) particulas.push(nueva(true));
      particulas.length = n;
    };
    medir();

    /* ----- Puntero (solo ratón / lápiz) ----- */
    const ptr = { x: 0, y: 0, t: -1e9, dentro: false };
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = performance.now(); ptr.dentro = true;
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', () => { ptr.dentro = false; });

    let sx = 0, sy = 0;                     // parallax suavizado
    let bx = 0, by = 0, pbx = 0, pby = 0;   // mariposa
    let ang = 0, bien = false;
    let visible = true, corriendo = false, ultimo = 0;

    const bucle = (ahora) => {
      if (!visible || document.hidden) { corriendo = false; return; }
      const dt = Math.min(0.05, (ahora - ultimo) / 1000 || 0.016);
      ultimo = ahora;
      const t = ahora / 1000;
      // Lecturas primero (evita recálculos de layout intercalados con escrituras)
      const hr = hero.getBoundingClientRect();
      const vr = visual ? visual.getBoundingClientRect() : null;
      const activo = ptr.dentro && ahora - ptr.t < 3000;

      // Parallax 3D: sigue al puntero; sin puntero, deriva sola
      const tx = activo ? clamp((ptr.x / window.innerWidth - 0.5) * 2, -1, 1) : Math.sin(t * 0.32) * 0.45;
      const ty = activo ? clamp((ptr.y / window.innerHeight - 0.5) * 2, -1, 1) : Math.cos(t * 0.27) * 0.3;
      const k = Math.min(1, dt * 3);
      sx += (tx - sx) * k; sy += (ty - sy) * k;
      if (visual) {
        visual.style.setProperty('--px', sx.toFixed(3));
        visual.style.setProperty('--py', sy.toFixed(3));
      }

      // Mariposa: sigue el cursor si está cerca del retrato; si no, vuela en espiral
      if (mar && vr) {
        const vw = vr.width, vh = vr.height;
        const cerca = activo && ptr.x > vr.left - vw * 0.35 && ptr.x < vr.right + vw * 0.35 &&
                      ptr.y > vr.top - vh * 0.3 && ptr.y < vr.bottom + vh * 0.3;
        let ox, oy;
        if (cerca) { ox = ptr.x - vr.left + 26; oy = ptr.y - vr.top - 22; }
        else {
          ox = vw * (0.5 + 0.46 * Math.sin(t * 0.37) + 0.12 * Math.sin(t * 0.93 + 1));
          oy = vh * (0.5 + 0.46 * Math.sin(t * 0.53 + 1.3) + 0.08 * Math.cos(t * 0.81));
        }
        if (!bien) { bx = ox; by = oy; pbx = bx; pby = by; bien = true; }
        const f = Math.min(1, dt * (cerca ? 3.2 : 2.4));
        bx += (ox - bx) * f; by += (oy - by) * f;
        const vxm = (bx - pbx) / (dt || 0.016), vym = (by - pby) / (dt || 0.016);
        pbx = bx; pby = by;
        if (Math.hypot(vxm, vym) > 14) {
          const objetivo = Math.atan2(vym, vxm) * 180 / Math.PI + 90;
          const dif = ((objetivo - ang + 540) % 360) - 180;
          ang += dif * Math.min(1, dt * 5);
        }
        const aleteo = Math.sin(t * 9) * 2.5;
        mar.style.transform = `translate3d(${(bx - mw / 2).toFixed(1)}px, ${(by - mh / 2 + aleteo).toFixed(1)}px, 0) rotate(${ang.toFixed(1)}deg)`;
      }

      // Partículas
      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        const px = ptr.x - hr.left, py = ptr.y - hr.top;
        const amortigua = Math.pow(0.02, dt);
        for (const p of particulas) {
          p.y -= p.vy * dt;
          p.fase += p.frec * dt;
          p.x += (Math.cos(p.fase) * p.amp * p.frec + p.vx) * dt;
          p.rot += p.vrot * dt;
          if (activo) {
            const dx = p.x - px, dy = p.y - py, d2 = dx * dx + dy * dy;
            if (d2 < 16900) {
              const d = Math.sqrt(d2) || 1, fuerza = (1 - d / 130) * 220;
              p.vx += (dx / d) * fuerza * dt * 6;
              p.y += (dy / d) * fuerza * dt * 0.6;
            }
          }
          p.vx *= amortigua;
          if (p.y < -30) Object.assign(p, nueva(false), { x: Math.random() * W });
          if (p.x < -30) p.x = W + 30; else if (p.x > W + 30) p.x = -30;

          const col = `${p.c[0]},${p.c[1]},${p.c[2]}`;
          ctx.save();
          ctx.translate(p.x, p.y);
          if (p.hoja) {
            ctx.rotate(p.rot);
            const r = p.r;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(r * 0.9, -r * 0.3, r * 0.9, -r * 1.5, 0, -r * 2);
            ctx.bezierCurveTo(-r * 0.9, -r * 1.5, -r * 0.9, -r * 0.3, 0, 0);
            ctx.fillStyle = `rgba(${col},${p.a})`;
            ctx.fill();
          } else {
            ctx.beginPath(); ctx.arc(0, 0, p.r * 3, 0, 6.283);
            ctx.fillStyle = `rgba(${col},${p.a * 0.22})`; ctx.fill();
            ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.283);
            ctx.fillStyle = `rgba(${col},${Math.min(1, p.a * 1.6)})`; ctx.fill();
          }
          ctx.restore();
        }
      }
      requestAnimationFrame(bucle);
    };

    const arrancar = () => {
      if (corriendo || !visible || document.hidden) return;
      corriendo = true;
      ultimo = performance.now();
      requestAnimationFrame(bucle);
    };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) arrancar(); }).observe(hero);
    }
    document.addEventListener('visibilitychange', () => { if (!document.hidden) arrancar(); });
    arrancar();

    /* ----- Al bajar, el hero se desliza y se desvanece suavemente ----- */
    const texto = $('.hero__texto', hero);
    return {
      entrada,
      medir,
      scroll(y, vh) {
        if (y > vh * 1.3) return;
        const f = clamp(y / (vh * 0.9), 0, 1);
        if (texto) { texto.style.translate = `0 ${(y * 0.1).toFixed(1)}px`; texto.style.opacity = String(1 - f * 0.85); }
        if (visual) visual.style.translate = `0 ${(y * 0.07).toFixed(1)}px`;
      }
    };
  }

  /* =================================================================
     6) MOTOR DE SCROLL — un solo requestAnimationFrame para todo
        Cada módulo tiene leer() (mide) y escribir() (pinta) para no
        forzar recálculos de layout.
     ================================================================= */

  /* --- Manifiesto: cada palabra se enciende al leerla --- */
  function modManifiesto() {
    const p = $('#manifiesto-texto');
    if (!p) return null;
    const palabras = p.textContent.trim().split(/\s+/);
    p.textContent = '';
    const spans = palabras.map((w) => {
      const s = document.createElement('span');
      s.className = 'pw';
      s.textContent = w;
      p.append(s, document.createTextNode(' '));
      return s;
    });
    if (reduce) { spans.forEach((s) => s.classList.add('on')); return null; }
    let encendidas = -1;
    return {
      leer(vh) {
        const r = p.getBoundingClientRect();
        if (r.top > vh) return 0;
        if (r.bottom < 0) return 1;
        return clamp((vh * 0.85 - r.top) / (vh * 0.35 + r.height), 0, 1);
      },
      escribir(prog) {
        const n = Math.round(clamp(prog * 1.12, 0, 1) * spans.length);
        if (n === encendidas) return;
        encendidas = n;
        spans.forEach((s, i) => s.classList.toggle('on', i < n));
      }
    };
  }

  /* --- Parallax suave en elementos [data-parallax] --- */
  function modParallax() {
    const items = $$('[data-parallax]').map((el) => ({ el, k: parseFloat(el.dataset.parallax) || 0.05 }));
    if (reduce || !items.length) return null;
    return {
      leer(vh) {
        return items.map((o) => {
          const r = (o.el.parentElement || o.el).getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return null;
          return -(r.top + r.height / 2 - vh / 2) * o.k;
        });
      },
      escribir(vals) {
        vals.forEach((v, i) => { if (v !== null) items[i].el.style.translate = `0 ${v.toFixed(1)}px`; });
      }
    };
  }

  /* --- Servicios: las tarjetas apiladas se encogen al ser cubiertas --- */
  function modServicios() {
    const cards = $$('.srv');
    if (!cards.length) return null;
    const indice = $$('.servicios__indice li');
    let tops = [];
    const recalcular = () => { tops = cards.map((c) => parseFloat(getComputedStyle(c).top) || 0); };
    recalcular();
    let ultimoAct = -1;
    const previo = new Array(cards.length).fill(-1);
    return {
      recalcular,
      leer() {
        const rects = cards.map((c) => c.getBoundingClientRect());
        const cubre = cards.map((c, i) => {
          if (i === cards.length - 1) return 0;
          const den = Math.max(1, rects[i].bottom - tops[i + 1]);
          return clamp((rects[i].bottom - rects[i + 1].top) / den, 0, 1);
        });
        let act = 0;
        rects.forEach((r, i) => { if (r.top <= tops[i] + 40) act = i; });
        return { cubre, act };
      },
      escribir({ cubre, act }) {
        if (!reduce) {
          cards.forEach((c, i) => {
            if (Math.abs(cubre[i] - previo[i]) > 0.002) {
              previo[i] = cubre[i];
              c.style.setProperty('--cubre', cubre[i].toFixed(3));
            }
          });
        }
        if (act !== ultimoAct) {
          ultimoAct = act;
          indice.forEach((li) => li.classList.toggle('act', Number(li.dataset.i) === act));
        }
      }
    };
  }

  /* --- Portal: la imagen se abre a pantalla completa con el scroll --- */
  function modPortal() {
    const portal = $('#portal');
    if (!portal) return null;

    // Si la foto externa no carga, queda la ilustración SVG que está debajo
    const foto = $('.portal__foto', portal);
    if (foto) {
      const quitar = () => foto.remove();
      foto.addEventListener('error', quitar, { once: true });
      if (foto.complete && foto.naturalWidth === 0) quitar();
    }
    if (reduce) return null;

    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    let pPrev = -1, tPrev = -1;
    return {
      leer(vh) {
        const r = portal.getBoundingClientRect();
        if (r.top > vh * 1.2) return { p: 0, t: 0 };
        if (r.bottom < -vh * 0.2) return { p: 1, t: 1 };
        const total = Math.max(1, r.height - vh);
        const s = clamp((vh * 0.25 - r.top) / (total + vh * 0.25), 0, 1);
        return { p: ease(clamp(s / 0.5, 0, 1)), t: clamp((s - 0.42) / 0.2, 0, 1) };
      },
      escribir({ p, t }) {
        if (Math.abs(p - pPrev) > 0.001) { pPrev = p; portal.style.setProperty('--p', p.toFixed(4)); }
        if (Math.abs(t - tPrev) > 0.005) { tPrev = t; portal.style.setProperty('--t', t.toFixed(3)); }
      }
    };
  }

  /* --- Proceso: la enredadera crece mientras se baja --- */
  function modVid() {
    const cuerpo = $('#proceso-lista');
    const svg = $('#vid');
    const base = $('#vid-base');
    const trazo = $('#vid-trazo');
    const gh = $('#vid-hojas');
    const punta = $('#vid-punta');
    if (!cuerpo || !svg || !base || !trazo || !gh || !punta || !trazo.getTotalLength) return null;
    const pasos = $$('.paso', cuerpo);
    if (!pasos.length) return null;

    const N = 200;
    let largo = 0, ys = [], yIni = 0, yFin = 0, nodos = [], hojas = [], previo = -1;

    const posEn = (el, tope) => {
      let x = 0, y = 0, e = el;
      while (e && e !== tope) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      return { x, y };
    };

    const construir = () => {
      const W = cuerpo.offsetWidth, H = cuerpo.offsetHeight;
      if (!W || !H) return;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      nodos = pasos.map((p) => {
        const n = $('.paso__nodo', p);
        const o = posEn(n, cuerpo);
        return { x: o.x + n.offsetWidth / 2, y: o.y + n.offsetHeight / 2, el: p };
      });
      const ancho = window.innerWidth >= 900;
      const amp = ancho ? 48 : 12;
      const p0 = nodos[0];
      let d = `M${p0.x} ${p0.y - 34} L${p0.x} ${p0.y}`;
      for (let i = 0; i < nodos.length - 1; i++) {
        const a = nodos[i], b = nodos[i + 1], s = i % 2 === 0 ? 1 : -1, dy = b.y - a.y;
        d += ` C${a.x + amp * s} ${a.y + dy * 0.34} ${b.x - amp * s} ${a.y + dy * 0.66} ${b.x} ${b.y}`;
      }
      const u = nodos[nodos.length - 1];
      d += ` C${u.x + amp} ${u.y + 22} ${u.x - amp * 0.6} ${u.y + 40} ${u.x + amp * 0.4} ${u.y + 56}`;
      base.setAttribute('d', d);
      trazo.setAttribute('d', d);
      largo = trazo.getTotalLength();
      trazo.style.strokeDasharray = String(largo);

      ys = [];
      for (let i = 0; i <= N; i++) ys.push(trazo.getPointAtLength((largo * i) / N).y);
      yIni = ys[0]; yFin = ys[N];

      gh.textContent = '';
      hojas = [];
      const sep = ancho ? 74 : 64;
      for (let k = 1, n = Math.floor(largo / sep); k <= n; k++) {
        const L = k * sep;
        const pt = trazo.getPointAtLength(L);
        const p2 = trazo.getPointAtLength(Math.min(largo, L + 2));
        const a = Math.atan2(p2.y - pt.y, p2.x - pt.x) * 180 / Math.PI;
        const lado = k % 2 ? 1 : -1;
        const g = svgEl('g', { transform: `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)}) rotate(${(a + lado * 62 + 90).toFixed(1)})` });
        const h = svgEl('path', { class: 'vid__hoja', d: 'M0 0 C10 -8 10 -24 0 -34 C-10 -24 -10 -8 0 0Z' });
        g.append(h); gh.append(g);
        hojas.push({ el: h, y: pt.y });
      }
      previo = -1;
    };

    // fracción de la longitud cuya coordenada y alcanza yT
    const fraccion = (yT) => {
      if (yT <= yIni) return 0;
      if (yT >= yFin) return 1;
      for (let i = 1; i <= N; i++) {
        if (ys[i] >= yT) {
          const a = ys[i - 1], f = ys[i] === a ? 0 : (yT - a) / (ys[i] - a);
          return (i - 1 + f) / N;
        }
      }
      return 1;
    };

    construir();
    return {
      reconstruir: construir,
      leer(vh) {
        if (reduce) return Infinity;
        return vh * 0.62 - cuerpo.getBoundingClientRect().top;
      },
      escribir(yT) {
        if (!largo) return;
        const f = reduce ? 1 : fraccion(yT);
        if (Math.abs(f - previo) > 0.0005) {
          previo = f;
          trazo.style.strokeDashoffset = String(largo * (1 - f));
          const pt = trazo.getPointAtLength(largo * f);
          punta.setAttribute('cx', pt.x.toFixed(1));
          punta.setAttribute('cy', pt.y.toFixed(1));
          punta.style.opacity = f <= 0.001 || f >= 0.999 ? '0' : '1';
        }
        hojas.forEach((h) => h.el.classList.toggle('ok', h.y <= yT));
        nodos.forEach((n) => n.el.classList.toggle('ok', n.y <= yT + 8));
      }
    };
  }

  /* --- Motor: progreso, encabezado, cinta y todos los módulos --- */
  function iniciarScroll(hero) {
    const barra = $('.progreso span');
    const cabecera = $('#cabecera');
    const pista = $('.cinta__pista');
    const modulos = [modManifiesto(), modParallax(), modServicios(), modPortal(), modVid()].filter(Boolean);

    let pendiente = false;
    let yPrev = window.scrollY, tPrev = performance.now();
    let tasa = 1, scrolled = null;

    const frame = (ahora) => {
      pendiente = false;
      const y = window.scrollY, vh = window.innerHeight;
      const dt = Math.max(0.016, (ahora - tPrev) / 1000);
      const vel = (y - yPrev) / dt;
      tPrev = ahora; yPrev = y;

      // Lecturas
      const max = Math.max(1, raiz.scrollHeight - vh);
      const datos = modulos.map((m) => m.leer(vh));

      // Escrituras
      if (barra) barra.style.transform = `scaleX(${clamp(y / max, 0, 1).toFixed(4)})`;
      const baja = y > 30;
      if (cabecera && baja !== scrolled) { scrolled = baja; cabecera.classList.toggle('scrolled', baja); }
      modulos.forEach((m, i) => m.escribir(datos[i]));
      if (hero && hero.scroll && !reduce) hero.scroll(y, vh);

      // La cinta acelera con la velocidad del scroll y vuelve a su ritmo
      if (pista && !reduce && pista.getAnimations) {
        const objetivo = 1 + clamp(Math.abs(vel) / 450, 0, 6);
        tasa += (objetivo - tasa) * 0.14;
        const anim = pista.getAnimations()[0];
        if (anim && Math.abs(anim.playbackRate - tasa) > 0.01) anim.playbackRate = tasa;
        if (Math.abs(tasa - 1) > 0.02) pedir();
      }
    };
    const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(frame); } };

    window.addEventListener('scroll', pedir, { passive: true });

    let temporizador = 0;
    const alRedimensionar = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        if (hero && hero.medir) hero.medir();
        modulos.forEach((m) => { if (m.recalcular) m.recalcular(); if (m.reconstruir) m.reconstruir(); });
        pedir();
      }, 150);
    };
    window.addEventListener('resize', alRedimensionar);
    window.addEventListener('orientationchange', alRedimensionar);
    window.addEventListener('load', alRedimensionar);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alRedimensionar);
    if ('ResizeObserver' in window) {
      const cuerpo = $('#proceso-lista');
      if (cuerpo) new ResizeObserver(alRedimensionar).observe(cuerpo);
    }
    pedir();
  }

  /* =================================================================
     7) INTERACCIONES — respiración, motivos, preguntas frecuentes
     ================================================================= */

  /* --- Orbe de respiración: la etiqueta sigue al ritmo de la animación CSS (10 s) --- */
  function iniciarOrbe() {
    const orbe = $('#orbe');
    const nucleo = $('#orbe-nucleo');
    const etiqueta = $('#orbe-etiqueta');
    const boton = $('#btn-pausa');
    if (!orbe || !nucleo) return;

    let pausado = false;
    if (boton) {
      boton.addEventListener('click', () => {
        pausado = !pausado;
        orbe.classList.toggle('pausa', pausado);
        boton.setAttribute('aria-pressed', String(pausado));
        if (boton.firstElementChild) boton.firstElementChild.textContent = pausado ? 'Continuar' : 'Pausar';
      });
    }
    if (reduce || !etiqueta || !('IntersectionObserver' in window)) return;

    let visible = false, corriendo = false, ultima = '';
    const bucle = () => {
      if (!visible) { corriendo = false; return; }
      const anim = nucleo.getAnimations ? nucleo.getAnimations()[0] : null;
      let txt = 'Respira';
      if (anim && anim.currentTime !== null) {
        const ms = Number(anim.currentTime) % 10000;
        txt = ms < 4000 ? 'Inhala' : ms < 5000 ? 'Sostén' : 'Exhala';
      }
      if (txt !== ultima) { ultima = txt; etiqueta.textContent = txt; }
      requestAnimationFrame(bucle);
    };
    new IntersectionObserver((es) => {
      visible = es[0].isIntersecting;
      if (visible && !corriendo) { corriendo = true; requestAnimationFrame(bucle); }
    }).observe(orbe);
  }

  /* --- Motivos: chips elegibles que preparan el mensaje y el formulario --- */
  const MOTIVOS = {
    ansiedad: { nombre: 'ansiedad', msg: 'Cuando la mente no se detiene, un espacio de escucha ayuda a ponerle nombre a lo que sientes y a encontrar calma. No tienes que sostenerlo solo.' },
    depresion: { nombre: 'depresión', msg: 'Cuando todo pesa más de lo normal, pedir apoyo es un acto de valentía. Aquí puedes ir a tu propio ritmo, sin prisa y sin juicios.' },
    duelo: { nombre: 'duelo', msg: 'Despedirte de alguien o de algo duele. Aquí hay espacio para tu tristeza, con respeto y con tiempo.' },
    relaciones: { nombre: 'relaciones', msg: 'Pareja, familia o amistades: entender cómo te vinculas es parte de cuidarte. También hay terapia de pareja y terapia familiar.' },
    cambios: { nombre: 'procesos de cambio', msg: 'Hasta un cambio deseado remueve todo por dentro. Acompañarte en el proceso hace que cada paso se sienta más firme.' },
    bienestar: { nombre: 'bienestar emocional', msg: 'No hace falta estar mal para cuidarte. Tu bienestar emocional merece atención hoy.' }
  };
  const MENSAJE_VACIO = 'Cuando elijas algo, aquí aparecerá un mensaje pensado para ti.';
  const MENSAJE_VARIOS = 'Son varias cosas a la vez, y eso también pasa. No tienes que ordenarlas tú solo: cuéntale a Elsy lo que sientas y juntos deciden por dónde empezar.';

  function iniciarMotivos() {
    const chips = $$('.chip[data-motivo]');
    if (!chips.length) return;
    const mensaje = $('#motivos-mensaje');
    const cta = $('#motivos-cta');
    const cajas = $$('input[data-motivo-form]');
    const seleccion = new Set();
    let temporizador = 0;
    let mostrado = mensaje ? mensaje.textContent : '';

    const pintar = () => {
      chips.forEach((c) => c.setAttribute('aria-pressed', String(seleccion.has(c.dataset.motivo))));
      cajas.forEach((i) => { i.checked = seleccion.has(i.dataset.motivoForm); });

      const claves = Array.from(seleccion);
      const texto = claves.length === 0 ? MENSAJE_VACIO
        : claves.length === 1 ? MOTIVOS[claves[0]].msg : MENSAJE_VARIOS;
      if (mensaje && texto !== mostrado) {
        mostrado = texto;
        clearTimeout(temporizador);
        mensaje.classList.add('cambia');
        temporizador = setTimeout(() => { mensaje.textContent = texto; mensaje.classList.remove('cambia'); }, reduce ? 0 : 200);
      }
      if (cta) {
        const base = 'Hola Elsy, me gustaría agendar una cita para platicar.';
        const msg = claves.length ? `${base} Lo que hoy me pesa: ${lista(claves.map((k) => MOTIVOS[k].nombre))}.` : base;
        cta.dataset.waMsg = msg;
        if (WHATSAPP) cta.href = urlWA(msg);
      }
    };

    chips.forEach((c) => c.addEventListener('click', () => {
      const k = c.dataset.motivo;
      if (seleccion.has(k)) seleccion.delete(k); else seleccion.add(k);
      pintar();
    }));
    cajas.forEach((i) => i.addEventListener('change', () => {
      const k = i.dataset.motivoForm;
      if (i.checked) seleccion.add(k); else seleccion.delete(k);
      pintar();
    }));
  }

  /* --- Preguntas frecuentes: acordeón accesible --- */
  function iniciarFaq() {
    const items = $$('.faq__item');
    if (!items.length) return;
    const poner = (it, abierto) => {
      const b = $('.faq__btn', it), p = $('.faq__panel', it);
      it.classList.toggle('abierto', abierto);
      if (b) b.setAttribute('aria-expanded', String(abierto));
      if (p) p.inert = !abierto;
    };
    items.forEach((it) => {
      poner(it, false);
      const b = $('.faq__btn', it);
      if (!b) return;
      b.addEventListener('click', () => {
        const abre = !it.classList.contains('abierto');
        items.forEach((o) => poner(o, false));
        if (abre) poner(it, true);
      });
    });
  }

  /* =================================================================
     8) DETALLES DE PUNTERO — botones magnéticos, inclinación 3D y brillo
     ================================================================= */
  function iniciarPuntero() {
    if (reduce || !punteroFino) return;

    $$('.btn--mag').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse') return;
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.22;
        const y = (e.clientY - r.top - r.height / 2) * 0.3;
        b.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });

    // Retrato de Elsy: inclinación 3D
    const zona = $('.elsy__visual');
    const retrato = $('.retrato--elsy');
    if (zona && retrato) {
      zona.addEventListener('pointermove', (e) => {
        const r = zona.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        retrato.style.transform = `perspective(900px) rotateY(${(x * 9).toFixed(2)}deg) rotateX(${(-y * 7).toFixed(2)}deg)`;
      });
      zona.addEventListener('pointerleave', () => { retrato.style.transform = ''; });
    }

    // Brillo que sigue al cursor en las secciones oscuras
    [$('#respira'), $('#contacto')].forEach((s) => {
      if (!s) return;
      let raf = 0;
      s.addEventListener('pointermove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = s.getBoundingClientRect();
          s.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 100).toFixed(1) + '%');
          s.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 100).toFixed(1) + '%');
        });
      });
    });
  }

  /* =================================================================
     ARRANQUE — cada módulo va aislado: si uno falla, el resto sigue
     ================================================================= */
  const seguro = (fn, valor) => {
    try { return fn(); } catch (err) {
      if (window.console) console.warn('[Elsy Lagunas] módulo omitido:', err);
      return valor;
    }
  };

  const hero = seguro(iniciarHero, { entrada() {} });

  seguro(iniciarWhatsApp);
  seguro(iniciarMenu);
  seguro(iniciarNavActiva);
  seguro(iniciarReveal);
  seguro(iniciarContadores);
  seguro(iniciarTrazosDecorativos);
  seguro(iniciarOrbe);
  seguro(iniciarMotivos);
  seguro(iniciarFaq);
  seguro(iniciarFormulario);
  seguro(iniciarPuntero);
  seguro(() => iniciarScroll(hero));

  const anio = $('#anio');
  if (anio) anio.textContent = String(new Date().getFullYear());

  // El cargador se retira solo y da paso a la entrada del hero
  seguro(() => iniciarCargador(() => hero.entrada()), null);
})();
