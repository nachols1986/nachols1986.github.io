(function () {
  var manifest = window.THESIS_MANIFEST || [];
  window.THESIS_DATA = window.THESIS_DATA || {};

  var state = {
    studentId: localStorage.getItem('tesis_active_student') || 'basilio',
    sectionIdx: parseInt(localStorage.getItem('tesis_active_sec_basilio') || '1', 10),
    viewAll: localStorage.getItem('tesis_view_all') === '1',
    query: ''
  };

  var selectorEl = document.getElementById('student-selector');
  var bannerEl = document.getElementById('student-banner');
  var containerEl = document.getElementById('sections-container');
  var tocEl = document.getElementById('toc-list');
  var countEl = document.getElementById('section-count-label');
  var pagEl = document.getElementById('pagination-nav');
  var searchEl = document.getElementById('search-input');
  var asideEl = document.getElementById('archive-aside');

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function loadStudentScript(id, cb) {
    if (window.THESIS_DATA[id]) return cb(window.THESIS_DATA[id]);
    var s = document.createElement('script');
    s.src = 'data/' + id + '.js?v=1';
    s.onload = function () { cb(window.THESIS_DATA[id]); };
    document.body.appendChild(s);
  }

  function renderSelector() {
    selectorEl.innerHTML = manifest.map(function (m) {
      var active = m.id === state.studentId ? ' activo' : '';
      return (
        '<button type="button" class="alumno-card' + active + '" data-id="' + m.id + '">' +
          '<div class="alumno-top">' +
            '<span class="chip ' + m.chip + '">' + esc(m.program) + '</span>' +
            '<span style="font-family:var(--mono);font-size:0.68rem;color:var(--tinta-2);">~' + m.total_mins + 'm</span>' +
          '</div>' +
          '<div class="alumno-nombre">' + esc(m.name) + '</div>' +
          '<div class="alumno-etapa">' + esc(m.stage) + '</div>' +
        '</button>'
      );
    }).join('');

    Array.prototype.forEach.call(selectorEl.querySelectorAll('.alumno-card'), function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-id');
        selectStudent(id);
      });
    });
  }

  function renderBlock(b) {
    if (b.type === 'h2') {
      return '<h2 id="' + esc(b.id) + '">' + esc(b.text) + '</h2>';
    }
    if (b.type === 'h3') {
      return '<h3 id="' + esc(b.id) + '">' + esc(b.text) + '</h3>';
    }
    if (b.type === 'caption') {
      return '<p class="caption-line">' + esc(b.text) + '</p>';
    }
    if (b.type === 'note') {
      return '<p class="note-line">' + esc(b.text) + '</p>';
    }
    if (b.type === 'bib') {
      return '<p class="bib-line">' + esc(b.text) + '</p>';
    }
    if (b.type === 'li') {
      return '<ul><li>' + esc(b.text) + '</li></ul>';
    }
    if (b.type === 'img') {
      return '<figure class="post-figure"><img src="' + esc(b.src) + '" alt="' + esc(b.alt) + '" loading="lazy" /></figure>';
    }
    if (b.type === 'table') {
      var rowsHtml = (b.rows || []).map(function (r, idx) {
        var tag = idx === 0 ? 'th' : 'td';
        return '<tr>' + r.map(function (c) { return '<' + tag + '>' + esc(c) + '</' + tag + '>'; }).join('') + '</tr>';
      }).join('');
      return '<div class="tabla-wrap"><table class="tabla-editorial">' + rowsHtml + '</table></div>';
    }
    return '<p>' + esc(b.text) + '</p>';
  }

  function renderSectionArticle(sec, idx, total) {
    var bodyHtml = (sec.blocks || []).map(renderBlock).join('');
    return (
      '<article class="post-article" id="' + esc(sec.id) + '">' +
        '<header class="post-header">' +
          '<div class="post-meta-top">' +
            '<span>' + esc(sec.num) + '</span>' +
            '<span>·</span>' +
            '<span>' + sec.words + ' palabras (~' + sec.mins + ' min)</span>' +
            '<span>·</span>' +
            '<span>Sección ' + (idx + 1) + ' de ' + total + '</span>' +
          '</div>' +
          '<h2 class="post-title">' + esc(sec.title) + '</h2>' +
        '</header>' +
        '<div class="post-body">' + bodyHtml + '</div>' +
      '</article>'
    );
  }

  function renderStudent(st) {
    if (!st) return;
    var secs = st.sections || [];
    if (state.sectionIdx < 0 || state.sectionIdx >= secs.length) {
      state.sectionIdx = secs.length > 1 ? 1 : 0;
    }

    bannerEl.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">' +
        '<span class="etiqueta">' + esc(st.program) + ' · ' + esc(st.stage) + '</span>' +
        '<span class="ficha-tesis-meta">Archivo: ' + esc(st.file) + ' · Actualizado: ' + esc(st.updated) + '</span>' +
      '</div>' +
      '<h2 class="ficha-tesis-titulo">' + esc(st.name) + ' — ' + esc(st.title) + '</h2>' +
      '<div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem;">' +
        '<button type="button" class="btn-recto ' + (state.sectionIdx === 0 && !state.viewAll ? '' : 'secundario') + '" id="btn-go-review">Ver Dictamen del Director</button>' +
        '<button type="button" class="btn-recto ' + (state.sectionIdx > 0 && !state.viewAll ? '' : 'secundario') + '" id="btn-go-doc">Leer Trabajo (Cap. 1 / Inicio)</button>' +
      '</div>';

    document.getElementById('btn-go-review').onclick = function () {
      state.viewAll = false;
      updateModeLabel();
      goToSection(0);
    };
    document.getElementById('btn-go-doc').onclick = function () {
      state.viewAll = false;
      updateModeLabel();
      goToSection(secs.length > 1 ? 1 : 0);
    };

    var q = state.query.trim().toLowerCase();
    countEl.textContent = secs.length + ' secciones';

    tocEl.innerHTML = secs.map(function (s, idx) {
      var isAct = !state.viewAll && idx === state.sectionIdx;
      return (
        '<button type="button" class="sec-link' + (isAct ? ' active' : '') + '" data-idx="' + idx + '">' +
          '<span><strong>' + esc(s.num) + '</strong> · ' + esc(s.title) + '</span>' +
          '<span class="sec-mins">' + s.mins + 'm</span>' +
        '</button>'
      );
    }).join('');

    Array.prototype.forEach.call(tocEl.querySelectorAll('.sec-link'), function (b) {
      b.addEventListener('click', function () {
        var i = parseInt(b.getAttribute('data-idx'), 10);
        asideEl.classList.remove('mobile-open');
        if (state.viewAll) {
          var target = document.getElementById(secs[i].id);
          if (target) target.scrollIntoView({ behavior: 'smooth' });
        } else {
          goToSection(i);
        }
      });
    });

    if (q) {
      var filtered = [];
      secs.forEach(function (s, idx) {
        var matchBlocks = (s.blocks || []).filter(function (b) {
          var t = (b.text || '') + ' ' + JSON.stringify(b.rows || '');
          return t.toLowerCase().indexOf(q) !== -1;
        });
        if (matchBlocks.length || s.title.toLowerCase().indexOf(q) !== -1) {
          filtered.push(renderSectionArticle({
            id: s.id,
            num: s.num,
            title: s.title,
            words: s.words,
            mins: s.mins,
            blocks: matchBlocks.length ? matchBlocks : s.blocks
          }, idx, secs.length));
        }
      });
      containerEl.innerHTML = filtered.length ? filtered.join('') : '<p style="padding:1.5rem 0;color:var(--tinta-2);">Sin coincidencias para "' + esc(state.query) + '".</p>';
      pagEl.innerHTML = '';
      return;
    }

    if (state.viewAll) {
      containerEl.innerHTML = secs.map(function (s, idx) {
        return renderSectionArticle(s, idx, secs.length);
      }).join('');
      pagEl.innerHTML = '';
    } else {
      var cur = secs[state.sectionIdx];
      containerEl.innerHTML = renderSectionArticle(cur, state.sectionIdx, secs.length);
      var prevDis = state.sectionIdx <= 0 ? 'disabled' : '';
      var nextDis = state.sectionIdx >= secs.length - 1 ? 'disabled' : '';
      var prevLabel = state.sectionIdx > 0 ? secs[state.sectionIdx - 1].num : '';
      var nextLabel = state.sectionIdx < secs.length - 1 ? secs[state.sectionIdx + 1].num : '';
      pagEl.innerHTML =
        '<button type="button" class="btn-recto secundario" id="prev-sec-btn" ' + prevDis + '>← Anterior ' + esc(prevLabel) + '</button>' +
        '<span style="font-family:var(--mono);font-size:0.76rem;color:var(--tinta-2);">' + (state.sectionIdx + 1) + ' / ' + secs.length + '</span>' +
        '<button type="button" class="btn-recto" id="next-sec-btn" ' + nextDis + '>Siguiente ' + esc(nextLabel) + ' →</button>';

      var pBtn = document.getElementById('prev-sec-btn');
      var nBtn = document.getElementById('next-sec-btn');
      if (pBtn) pBtn.onclick = function () { if (state.sectionIdx > 0) goToSection(state.sectionIdx - 1); };
      if (nBtn) nBtn.onclick = function () { if (state.sectionIdx < secs.length - 1) goToSection(state.sectionIdx + 1); };
    }
  }

  function goToSection(idx) {
    state.sectionIdx = idx;
    try { localStorage.setItem('tesis_active_sec_' + state.studentId, String(idx)); } catch (e) {}
    renderStudent(window.THESIS_DATA[state.studentId]);
    window.scrollTo({ top: bannerEl.offsetTop - 12, behavior: 'smooth' });
  }

  function selectStudent(id) {
    state.studentId = id;
    state.query = '';
    searchEl.value = '';
    try {
      localStorage.setItem('tesis_active_student', id);
      var savedIdx = localStorage.getItem('tesis_active_sec_' + id);
      state.sectionIdx = savedIdx !== null ? parseInt(savedIdx, 10) : 1;
    } catch (e) { state.sectionIdx = 1; }
    renderSelector();
    containerEl.innerHTML = '<p style="padding:1.5rem 0;color:var(--tinta-2);">Cargando documento...</p>';
    loadStudentScript(id, function (st) {
      renderStudent(st);
    });
  }

  function updateModeLabel() {
    document.getElementById('mode-label').textContent = state.viewAll ? 'Todo corrido' : 'Por sección';
    try { localStorage.setItem('tesis_view_all', state.viewAll ? '1' : '0'); } catch (e) {}
  }

  document.getElementById('mode-toggle').addEventListener('click', function () {
    state.viewAll = !state.viewAll;
    updateModeLabel();
    renderStudent(window.THESIS_DATA[state.studentId]);
  });

  document.getElementById('theme-toggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    try { localStorage.setItem('tesis_theme', cur); } catch (e) {}
  });

  document.getElementById('font-toggle').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-font') === 'sans' ? 'serif' : 'sans';
    document.documentElement.setAttribute('data-font', cur);
    try { localStorage.setItem('tesis_font', cur); } catch (e) {}
  });

  var sizes = ['sm', 'md', 'lg'];
  document.getElementById('size-down').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-size') || 'md';
    var next = sizes[Math.max(0, sizes.indexOf(cur) - 1)];
    document.documentElement.setAttribute('data-size', next);
    try { localStorage.setItem('tesis_size', next); } catch (e) {}
  });
  document.getElementById('size-up').addEventListener('click', function () {
    var cur = document.documentElement.getAttribute('data-size') || 'md';
    var next = sizes[Math.min(sizes.length - 1, sizes.indexOf(cur) + 1)];
    document.documentElement.setAttribute('data-size', next);
    try { localStorage.setItem('tesis_size', next); } catch (e) {}
  });

  document.getElementById('mobile-archive-toggle').addEventListener('click', function () {
    asideEl.classList.toggle('mobile-open');
  });

  searchEl.addEventListener('input', function () {
    state.query = searchEl.value || '';
    renderStudent(window.THESIS_DATA[state.studentId]);
  });

  window.addEventListener('scroll', function () {
    var docH = document.documentElement.scrollHeight - window.innerHeight;
    var pct = docH > 0 ? Math.min(100, Math.max(0, (window.scrollY / docH) * 100)) : 0;
    document.getElementById('reading-progress').style.width = pct + '%';
  });

  updateModeLabel();
  selectStudent(state.studentId);
})();
