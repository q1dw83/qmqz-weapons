/* 全民枪战2 武器图鉴 — 纯静态页面，无依赖 */
(function () {
  'use strict';

  var ALL = '全部';
  var SORT_KEYS = ['伤害', '射速', '精度', '穿甲', '跑动', '英雄打击', '弹匣容量'];
  var CARD_STATS = ['伤害', '射速', '精度', '穿甲', '跑动', '射程', '英雄打击', '弹匣容量'];
  var HIDDEN_FIELDS = { '截图文件': 1 };

  var state = { series: ALL, type: '', q: '', sort: '' };
  var data = null, weapons = [], shotIndex = {}, maxByKey = {};
  var $ = function (id) { return document.getElementById(id); };

  // 文件名含中文和 · 等字符：逐段 encodeURIComponent
  function encPath(p) {
    return String(p).split('/').map(encodeURIComponent).join('/');
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(v) {
    var n = typeof v === 'number' ? v : parseFloat(v);
    return isNaN(n) ? -Infinity : n;
  }
  function thumbOf(w) {
    var e = shotIndex[w['截图文件']];
    return (e && e.t) || w['截图文件'];
  }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  function fetchJSON(url, optional) {
    return fetch(url).then(function (r) {
      if (!r.ok) { if (optional) return null; throw new Error(url + ' HTTP ' + r.status); }
      return r.json();
    }).catch(function (e) { if (optional) return null; throw e; });
  }

  Promise.all([fetchJSON('weapons.json'), fetchJSON('shots_index.json', true)]).then(function (res) {
    data = res[0];
    shotIndex = res[1] || {};
    weapons = (data.weapons || []).map(function (w, i) { w._i = i; return w; });
    init();
  }).catch(function (err) {
    $('loading').textContent = '数据加载失败：' + err.message;
  });

  function init() {
    // 统计各数值字段最大值（详情表条形图用）
    weapons.forEach(function (w) {
      Object.keys(w).forEach(function (k) {
        if (typeof w[k] === 'number' && k !== '_i') maxByKey[k] = Math.max(maxByKey[k] || 0, w[k]);
      });
    });
    $('meta').textContent = '共 ' + weapons.length + ' 把武器 · 数据版本 ' + (data.version != null ? data.version : '-');

    // 系列（按首次出现顺序）
    var counts = {}, order = [];
    weapons.forEach(function (w) {
      var s = w['系列'] || '未分类';
      if (!(s in counts)) { counts[s] = 0; order.push(s); }
      counts[s]++;
    });
    var seriesEntries = [[ALL, weapons.length]].concat(order.map(function (s) { return [s, counts[s]]; }));
    var ul = $('seriesList'), sel = $('seriesSelect');
    seriesEntries.forEach(function (e) {
      var li = el('li', null, '<span>' + esc(e[0]) + '</span><span class="n">' + e[1] + '</span>');
      li.dataset.s = e[0];
      li.tabIndex = 0;
      ul.appendChild(li);
      var o = el('option'); o.value = e[0]; o.textContent = e[0] + '（' + e[1] + '）'; sel.appendChild(o);
    });
    ul.addEventListener('click', function (ev) {
      var li = ev.target.closest('li'); if (li) setSeries(li.dataset.s);
    });
    ul.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { var li = ev.target.closest('li'); if (li) setSeries(li.dataset.s); }
    });
    sel.addEventListener('change', function () { setSeries(sel.value); });

    // 武器类型
    var tcount = {};
    weapons.forEach(function (w) { var t = w['武器类型'] || '未知'; tcount[t] = (tcount[t] || 0) + 1; });
    var tf = $('typeFilter');
    tf.appendChild(new Option('全部类型', ''));
    Object.keys(tcount).sort(function (a, b) { return tcount[b] - tcount[a]; }).forEach(function (t) {
      tf.appendChild(new Option(t + '（' + tcount[t] + '）', t));
    });
    tf.addEventListener('change', function () { state.type = tf.value; render(); });

    // 排序
    var sb = $('sortBy');
    sb.appendChild(new Option('默认顺序', ''));
    SORT_KEYS.forEach(function (k) { sb.appendChild(new Option('按' + k + '（高→低）', k)); });
    sb.addEventListener('change', function () { state.sort = sb.value; render(); });

    var timer;
    $('search').addEventListener('input', function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () { state.q = e.target.value.trim().toLowerCase(); render(); }, 120);
    });

    $('grid').addEventListener('click', function (ev) {
      var c = ev.target.closest('.card'); if (c) openDetail(weapons[+c.dataset.i]);
    });
    $('grid').addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') { var c = ev.target.closest('.card'); if (c) openDetail(weapons[+c.dataset.i]); }
    });
    $('modal').addEventListener('click', function (ev) { if (ev.target.hasAttribute('data-close')) closeDetail(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeDetail(); });

    // 支持 #系列名 直达
    var h = decodeURIComponent(location.hash.slice(1));
    if (h && (h in counts)) state.series = h;
    window.addEventListener('hashchange', function () {
      var s = decodeURIComponent(location.hash.slice(1)) || ALL;
      if (s === ALL || s in counts) setSeries(s, true);
    });

    $('loading').hidden = true;
    setSeries(state.series, true);
  }

  function setSeries(s, fromHash) {
    state.series = s;
    Array.prototype.forEach.call($('seriesList').children, function (li) {
      li.classList.toggle('active', li.dataset.s === s);
    });
    $('seriesSelect').value = s;
    if (!fromHash) {
      var nh = s === ALL ? '' : '#' + encodeURIComponent(s);
      if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + nh);
    }
    render();
    window.scrollTo(0, 0);
  }

  function filtered() {
    var q = state.q;
    var list = weapons.filter(function (w) {
      if (state.series !== ALL && (w['系列'] || '未分类') !== state.series) return false;
      if (state.type && (w['武器类型'] || '未知') !== state.type) return false;
      if (q) {
        var hay = ((w['武器名'] || '') + ' ' + (w['特殊属性'] || '') + ' ' + (w['击败特效'] || '')).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });
    if (state.sort) {
      var k = state.sort;
      list.sort(function (a, b) { return (num(b[k]) - num(a[k])) || (a._i - b._i); });
    }
    return list;
  }

  function cardHTML(w) {
    var stats = CARD_STATS.map(function (k) {
      var v = w[k];
      return '<div' + (k === state.sort ? ' class="hl"' : '') + '><b>' + esc(v === '' || v == null ? '-' : v) +
        '</b><span>' + esc(k) + '</span></div>';
    }).join('');
    return '<img class="thumb" loading="lazy" decoding="async" alt="' + esc(w['武器名']) + '" src="' + encPath(thumbOf(w)) + '">' +
      '<div class="body"><div class="name" title="' + esc(w['武器名']) + '">' + esc(w['武器名']) + '</div>' +
      '<div class="tags"><span class="tag lv">' + esc(w['等级']) + '</span><span class="tag ty">' + esc(w['武器类型']) +
      '</span>' + (state.series === ALL ? '<span class="tag">' + esc(w['系列']) + '</span>' : '') + '</div>' +
      '<div class="stats">' + stats + '</div>' +
      (w['特殊属性'] ? '<div class="special" title="' + esc(w['特殊属性']) + '">' + esc(w['特殊属性']) + '</div>' : '') +
      '</div>';
  }

  function render() {
    var list = filtered();
    var grid = $('grid');
    grid.textContent = '';
    var frag = document.createDocumentFragment();
    list.forEach(function (w) {
      var c = el('div', 'card', cardHTML(w));
      c.dataset.i = w._i;
      c.tabIndex = 0;
      frag.appendChild(c);
    });
    grid.appendChild(frag);
    $('empty').hidden = list.length > 0;
    $('curTitle').textContent = state.series === ALL ? '全部系列' : state.series + ' 系列';
    var total = state.series === ALL ? weapons.length :
      weapons.filter(function (w) { return (w['系列'] || '未分类') === state.series; }).length;
    $('count').textContent = '显示 ' + list.length + ' / ' + total + ' 把';
  }

  function imageLabel(path, main) {
    var f = path.split('/').pop();
    var stem = main.split('/').pop().replace(/\.[^.]+$/, '');
    var rest = f.slice(stem.length + 1).replace(/\.[^.]+$/, '');
    if (/^皮肤\d+$/.test(rest)) return rest;
    if (rest === 'bolt') return '生化打击（格）截图';
    return rest || f;
  }

  function openDetail(w) {
    if (!w) return;
    var main = w['截图文件'];
    var ent = shotIndex[main] || {};
    var extras = ent.x || [];
    var hasSkins = extras.some(function (p) { return /_皮肤\d+\.[^.]+$/.test(p); });
    $('mTitle').textContent = w['武器名'];
    $('mSub').textContent = [w['系列'] + ' 系列', w['武器类型'], w['等级']].filter(Boolean).join(' · ');
    var g = $('mGallery'); g.textContent = '';
    var imgs = [[main, hasSkins ? '皮肤1（默认）' : '']].concat(extras.map(function (p) { return [p, imageLabel(p, main)]; }));
    imgs.forEach(function (it) {
      var fig = el('figure');
      var img = el('img', /_bolt\.png$/.test(it[0]) ? 'small' : '');
      img.alt = w['武器名'] + (it[1] ? ' ' + it[1] : '');
      // 先显示缩略图，再换成原图
      var t = it[0] === main ? ent.t : null;
      img.src = encPath(t || it[0]);
      if (t) {
        var full = new Image();
        full.onload = function () { img.src = full.src; };
        full.src = encPath(it[0]);
      }
      fig.appendChild(img);
      if (it[1]) fig.appendChild(el('figcaption', null, esc(it[1])));
      g.appendChild(fig);
    });
    var cols = (data.columns && data.columns.length ? data.columns.slice() : []);
    Object.keys(w).forEach(function (k) { if (k !== '_i' && cols.indexOf(k) < 0) cols.push(k); });
    var rows = cols.filter(function (k) { return !HIDDEN_FIELDS[k]; }).map(function (k) {
      var v = w[k];
      var cell = v === '' || v == null ? '<span style="color:var(--muted)">—</span>' : esc(v);
      if (typeof v === 'number' && maxByKey[k] > 0) {
        cell += '<span class="bar" style="width:' + Math.max(2, Math.round(120 * v / maxByKey[k])) + 'px"></span>';
      }
      return '<tr><th>' + esc(k) + '</th><td>' + cell + '</td></tr>';
    });
    rows.push('<tr><th>截图文件</th><td><a href="' + encPath(main) + '" target="_blank" rel="noopener">' + esc(main) + '</a></td></tr>');
    $('mTable').innerHTML = rows.join('');
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('modal').querySelector('.modal-box').scrollTop = 0;
  }

  function closeDetail() {
    if ($('modal').hidden) return;
    $('modal').hidden = true;
    document.body.style.overflow = '';
  }
})();
