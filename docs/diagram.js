// diagram.js -- Interactive system diagram for docs page
// Reads the global NODES array and renders the diagram into #diagram.

(function () {
  const diagram = document.getElementById('diagram');
  const detailPanel = document.getElementById('detail-panel');
  if (!diagram || !detailPanel) return;

  // ── Color map ──────────────────────────────────────────────
  const COLOR_MAP = {
    'frost':          'var(--frost)',
    'frost-deep':     'var(--frost-deep)',
    'aurora-green':   'var(--aurora-green)',
    'aurora-yellow':  'var(--aurora-yellow)'
  };

  // ── Agent-to-system connection map ─────────────────────────
  const CONNECTIONS = {
    'claude-code': ['zotero', 'obsidian', 'research-db'],
    'gemini-cli':  ['google-drive']
  };

  // ── Categorize nodes by type ───────────────────────────────
  const byType = { agent: [], system: [], pipeline: [], automated: [] };
  NODES.forEach(n => {
    if (byType[n.type]) byType[n.type].push(n);
  });

  // ── Helper: truncate description ───────────────────────────
  function shortDesc(desc) {
    if (!desc) return '';
    return desc.length > 20 ? desc.slice(0, 20) + '...' : desc;
  }

  // ── Helper: schedule hint from automated descriptions ──────
  function scheduleHint(desc) {
    if (!desc) return '';
    const m = desc.match(/\b(weekly|daily|hourly|runs?\s+\w+|on\s+\w+days?\b.*?(?:at\s+\d+\w+)?)/i);
    if (m) {
      const raw = m[0].trim();
      if (/wednesdays?\s+at\s+3am/i.test(desc)) return '(Wed 3am)';
      return '(' + raw + ')';
    }
    return '';
  }

  // ── Helper: create a DOM element with attributes ───────────
  function el(tag, attrs, children) {
    const e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(k => {
        if (k === 'className') e.className = attrs[k];
        else if (k === 'textContent') e.textContent = attrs[k];
        else e.setAttribute(k, attrs[k]);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (typeof c === 'string') e.appendChild(document.createTextNode(c));
        else if (c) e.appendChild(c);
      });
    }
    return e;
  }

  // ── Build: Agents row ──────────────────────────────────────
  diagram.appendChild(el('div', { className: 'diagram-label', textContent: 'AGENTS' }));

  const agentRow = el('div', { className: 'diagram-row' });
  byType.agent.forEach(n => {
    const card = el('div', { className: 'node', 'data-id': n.id });
    card.style.borderColor = COLOR_MAP[n.color] || 'var(--nord2)';

    card.appendChild(el('div', {
      className: 'node-type-label',
      textContent: n.type.charAt(0).toUpperCase() + n.type.slice(1)
    }));
    card.querySelector('.node-type-label').style.color = COLOR_MAP[n.color] || 'var(--frost)';
    card.appendChild(el('div', { className: 'node-icon', textContent: n.icon }));
    card.appendChild(el('div', { className: 'node-title', textContent: n.title }));
    card.appendChild(el('div', { className: 'node-sub', textContent: shortDesc(n.description) }));

    agentRow.appendChild(card);
  });
  diagram.appendChild(agentRow);

  // ── Build: SVG overlay (populated after layout) ────────────
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  diagram.appendChild(svg);

  // ── Build: Core Systems row ────────────────────────────────
  const systemLabel = el('div', { className: 'diagram-label', textContent: 'CORE SYSTEMS' });
  systemLabel.style.marginTop = '32px';
  diagram.appendChild(systemLabel);

  const systemRow = el('div', { className: 'diagram-row' });
  byType.system.forEach(n => {
    const card = el('div', { className: 'node', 'data-id': n.id });
    card.style.borderColor = COLOR_MAP[n.color] || 'var(--nord2)';

    card.appendChild(el('div', {
      className: 'node-type-label',
      textContent: n.type.charAt(0).toUpperCase() + n.type.slice(1)
    }));
    card.querySelector('.node-type-label').style.color = COLOR_MAP[n.color] || 'var(--frost)';
    card.appendChild(el('div', { className: 'node-icon', textContent: n.icon }));
    card.appendChild(el('div', { className: 'node-title', textContent: n.title }));
    card.appendChild(el('div', { className: 'node-sub', textContent: shortDesc(n.description) }));

    systemRow.appendChild(card);
  });
  diagram.appendChild(systemRow);

  // ── Build: Pipeline ────────────────────────────────────────
  const pipeLabel = el('div', { className: 'diagram-label', textContent: 'RESEARCH PIPELINE' });
  pipeLabel.style.marginTop = '16px';
  diagram.appendChild(pipeLabel);

  const pipeline = el('div', { className: 'pipeline' });
  byType.pipeline.forEach((n, i) => {
    if (i > 0) {
      pipeline.appendChild(el('div', { className: 'pipeline-arrow', textContent: '\u2192' }));
    }
    const isLast = i === byType.pipeline.length - 1;
    const stage = el('div', {
      className: 'pipeline-stage' + (isLast ? ' endpoint' : ''),
      'data-id': n.id,
      textContent: n.icon + ' ' + n.title
    });
    pipeline.appendChild(stage);
  });
  diagram.appendChild(pipeline);

  // ── Build: Automated strip ─────────────────────────────────
  const autoLabel = el('div', { className: 'diagram-label', textContent: 'AUTOMATED' });
  autoLabel.style.marginTop = '16px';
  diagram.appendChild(autoLabel);

  const strip = el('div', { className: 'automated-strip' });
  byType.automated.forEach(n => {
    const badge = el('div', { className: 'auto-badge', 'data-id': n.id });
    badge.appendChild(el('span', { className: 'status-dot' }));
    badge.appendChild(document.createTextNode(' ' + n.title + ' '));
    const hint = scheduleHint(n.description);
    if (hint) {
      const hintSpan = el('span', { textContent: hint });
      hintSpan.style.color = 'var(--nord3)';
      badge.appendChild(hintSpan);
    }
    strip.appendChild(badge);
  });
  diagram.appendChild(strip);

  // ── SVG connection lines ───────────────────────────────────
  function drawLines() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const dRect = diagram.getBoundingClientRect();

    Object.keys(CONNECTIONS).forEach(agentId => {
      const agentEl = diagram.querySelector('.node[data-id="' + agentId + '"]');
      if (!agentEl) return;

      const aRect = agentEl.getBoundingClientRect();
      const ax = aRect.left + aRect.width / 2 - dRect.left;
      const ay = aRect.top + aRect.height - dRect.top;

      CONNECTIONS[agentId].forEach(sysId => {
        const sysEl = diagram.querySelector('.node[data-id="' + sysId + '"]');
        if (!sysEl) return;

        const sRect = sysEl.getBoundingClientRect();
        const sx = sRect.left + sRect.width / 2 - dRect.left;
        const sy = sRect.top - dRect.top;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', ax);
        line.setAttribute('y1', ay);
        line.setAttribute('x2', sx);
        line.setAttribute('y2', sy);
        line.setAttribute('data-from', agentId);
        line.setAttribute('data-to', sysId);
        svg.appendChild(line);
      });
    });
  }

  // Draw after layout settles
  requestAnimationFrame(() => requestAnimationFrame(drawLines));

  // Debounced redraw on resize
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawLines, 150);
  });

  // ── Hover: activate SVG lines for agents ───────────────────
  diagram.querySelectorAll('.diagram-row .node').forEach(node => {
    const id = node.dataset.id;
    if (!CONNECTIONS[id]) return;

    node.addEventListener('mouseenter', () => {
      svg.querySelectorAll('line[data-from="' + id + '"]').forEach(l => l.classList.add('active'));
    });
    node.addEventListener('mouseleave', () => {
      svg.querySelectorAll('line.active').forEach(l => l.classList.remove('active'));
    });
  });

  // ── Pipeline sweep animation ───────────────────────────────
  function runSweep() {
    var stages = document.querySelectorAll('.pipeline-stage');
    stages.forEach(function (stage, i) {
      setTimeout(function () {
        stage.classList.add('sweep');
        setTimeout(function () { stage.classList.remove('sweep'); }, 400);
      }, i * 200);
    });
  }
  setTimeout(runSweep, 500);

  // ── Click handler: detail panel ────────────────────────────
  let selectedId = null;

  function findNode(id) {
    for (var i = 0; i < NODES.length; i++) {
      if (NODES[i].id === id) return NODES[i];
    }
    return null;
  }

  function openDetail(nodeData, clickedEl) {
    // Toggle off if same node clicked again
    if (selectedId === nodeData.id) {
      clickedEl.classList.remove('selected');
      detailPanel.classList.remove('open');
      selectedId = null;
      return;
    }

    // Remove previous selection
    diagram.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    clickedEl.classList.add('selected');
    selectedId = nodeData.id;

    // Build panel content
    var html = '<div class="detail-panel-title">' + escHtml(nodeData.title) + '</div>';
    html += '<div class="detail-panel-desc">' + escHtml(nodeData.description || '') + '</div>';

    // Commands
    if (nodeData.commands && nodeData.commands.length) {
      html += '<div class="detail-panel-commands">';
      nodeData.commands.forEach(function (cmd) {
        html += '<code>' + escHtml(cmd) + '</code>';
      });
      html += '</div>';
    }

    // Files
    if (nodeData.files && nodeData.files.length) {
      html += '<div style="margin-top:8px;font-size:12px;color:var(--nord3)">';
      html += '<strong style="color:var(--nord4)">Files:</strong> ';
      html += nodeData.files.map(escHtml).join(', ');
      html += '</div>';
    }

    // Related section link
    if (nodeData['related-section']) {
      html += '<div style="margin-top:10px">';
      html += '<a href="#' + nodeData['related-section'] + '" style="font-size:12px">See full reference \u2192</a>';
      html += '</div>';
    }

    detailPanel.innerHTML = html;
    detailPanel.classList.add('open');

    // Add copy buttons to command code blocks
    detailPanel.querySelectorAll('.detail-panel-commands code').forEach(addCopyButton);
  }

  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // Attach click handlers to all interactive elements
  diagram.addEventListener('click', function (e) {
    var target = e.target.closest('.node, .pipeline-stage, .auto-badge');
    if (!target) return;
    var id = target.dataset.id;
    if (!id) return;
    var nodeData = findNode(id);
    if (!nodeData) return;
    openDetail(nodeData, target);
  });

  // ── Copy to clipboard ──────────────────────────────────────
  function addCopyButton(codeEl) {
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.textContent = 'copy';
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var text = codeEl.textContent.replace('copy', '').trim();
      navigator.clipboard.writeText(text);
      btn.textContent = 'copied';
      btn.classList.add('copied');
      setTimeout(function () {
        btn.textContent = 'copy';
        btn.classList.remove('copied');
      }, 1500);
    });
    codeEl.style.position = 'relative';
    codeEl.appendChild(btn);
  }

  // Add copy buttons to existing code blocks in expandable sections
  document.querySelectorAll('.detail-body pre code').forEach(addCopyButton);

})();
