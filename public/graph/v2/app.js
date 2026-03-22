/* Vault Graph 2.0 — Interactive Explorer
 * Cytoscape.js-based vault knowledge graph viewer.
 * No build step, no framework, no dependencies beyond Cytoscape.js.
 */

(function () {
  'use strict';

  // ---- State ----
  let cy = null;
  let meta = null;
  let overviewData = null;
  let currentView = 'overview'; // 'overview' | 'cluster'
  let currentClusterId = null;
  let cardTimers = [];
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Cluster colors (same as Python pipeline) ----
  const CLUSTER_COLORS = [
    '#88C0D0', '#A3BE8C', '#BF616A', '#EBCB8B',
    '#B48EAD', '#D08770', '#8FBCBB', '#81A1C1',
  ];

  // ---- DOM References ----
  const $cy = document.getElementById('cy');
  const $loading = document.getElementById('loading');
  const $graphHint = document.getElementById('graph-hint');
  const $breadcrumb = document.getElementById('breadcrumb');
  const $btnBack = document.getElementById('btn-back');
  const $sidebar = document.getElementById('sidebar');
  const $sidebarOverlay = document.getElementById('sidebar-overlay');
  const $sidebarTitle = document.getElementById('sidebar-title');
  const $sidebarBody = document.getElementById('sidebar-body');
  const $sidebarClose = document.getElementById('sidebar-close');
  const $statsRibbon = document.getElementById('stats-ribbon');
  const $bentoGrid = document.getElementById('bento-grid');
  const $gapsSection = document.getElementById('gaps-section');
  const $footer = document.getElementById('footer');

  // ---- Init ----
  async function init() {
    try {
      meta = await fetchJSON('data/meta.json');
      overviewData = await fetchJSON('data/overview.json');
      renderStatsRibbon();
      renderBentoCards();
      renderGaps();
      renderFooter();
      showOverview();
    } catch (err) {
      $loading.innerHTML = '<span style="color:#BF616A">Failed to load graph data.</span>';
      console.error('Init error:', err);
    }
  }

  // ---- Data Fetching ----
  async function fetchJSON(url) {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('Failed to fetch ' + url + ': ' + resp.status);
    return resp.json();
  }

  // ---- Overview Mode ----
  function showOverview() {
    currentView = 'overview';
    currentClusterId = null;
    $loading.style.display = 'none';
    $btnBack.classList.remove('visible');
    $breadcrumb.innerHTML = '<span class="current">Overview</span>';
    $graphHint.textContent = 'Tap a research thread to explore';
    $graphHint.classList.remove('hidden');

    renderGraph(overviewData, 'overview');
  }

  // ---- Deep Dive Mode ----
  async function showCluster(clusterId) {
    $loading.style.display = 'flex';
    $cy.style.opacity = '0.3';

    try {
      const clusterData = await fetchJSON('data/cluster-' + clusterId + '.json');
      currentView = 'cluster';
      currentClusterId = clusterId;

      $loading.style.display = 'none';
      $cy.style.opacity = '1';
      $btnBack.classList.add('visible');

      const label = meta.clusterLabels[String(clusterId)] || ('Cluster ' + clusterId);
      $breadcrumb.innerHTML =
        '<a id="bc-overview">Overview</a>' +
        '<span class="sep">&rsaquo;</span>' +
        '<span class="current">' + escapeHtml(label) + '</span>';
      document.getElementById('bc-overview').addEventListener('click', showOverview);

      $graphHint.textContent = 'Tap a node for details';
      $graphHint.classList.remove('hidden');

      renderGraph(clusterData, 'cluster');
    } catch (err) {
      $loading.style.display = 'none';
      $cy.style.opacity = '1';
      console.error('Cluster load error:', err);
    }
  }

  // ---- Graph Rendering ----
  function renderGraph(data, mode) {
    if (cy) {
      cy.destroy();
      cy = null;
    }

    const elements = buildElements(data, mode);

    cy = cytoscape({
      container: $cy,
      elements: elements,
      layout: { name: 'preset' },
      style: buildStylesheet(mode),
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
      boxSelectionEnabled: false,
      autounselectify: false,
    });

    // Fit to viewport with padding
    cy.fit(undefined, 40);

    // ---- Interaction ----
    cy.on('tap', 'node', function (evt) {
      const node = evt.target;
      const nodeData = node.data();

      if (mode === 'overview' && nodeData.type === 'inquiry') {
        // Navigate to cluster deep dive
        const clusterId = nodeData.cluster;
        if (clusterId >= 0 && meta.clusterFiles[clusterId]) {
          showCluster(clusterId);
        }
        return;
      }

      // Show sidebar with node details
      openSidebar(nodeData, mode);

      // Highlight neighborhood
      highlightNode(node);
    });

    cy.on('tap', function (evt) {
      if (evt.target === cy) {
        closeSidebar();
        unhighlightAll();
      }
    });

    // Hide hint after first interaction
    cy.on('tapstart', function () {
      $graphHint.classList.add('hidden');
    });
  }

  function buildElements(data, mode) {
    const elements = [];

    // Nodes
    for (const node of data.nodes) {
      const cluster = node.cluster >= 0 ? node.cluster : 0;
      elements.push({
        group: 'nodes',
        data: {
          id: node.id,
          label: node.label || node.id,
          type: node.type || 'general',
          cluster: cluster,
          centrality: node.centrality || 0,
          degree: node.degree || 0,
          connections: node.connections || [],
          isBridge: node.isBridge || false,
          bridgesTo: node.bridgesTo || [],
          noteCount: node.noteCount || 0,
          gapCount: node.gapCount || 0,
          researchQuestion: node.researchQuestion || '',
          keyFinding: node.keyFinding || '',
          bridgeNodes: node.bridgeNodes || [],
          color: CLUSTER_COLORS[cluster % CLUSTER_COLORS.length],
        },
        position: {
          x: node.position.x,
          y: node.position.y,
        },
      });
    }

    // Edges
    for (const edge of data.edges) {
      elements.push({
        group: 'edges',
        data: {
          id: edge.source + '-' + edge.target,
          source: edge.source,
          target: edge.target,
          weight: edge.weight || 1,
        },
      });
    }

    return elements;
  }

  function buildStylesheet(mode) {
    const isOverview = mode === 'overview';

    return [
      // Base node style
      {
        selector: 'node',
        style: {
          'width': function (ele) {
            if (ele.data('type') === 'inquiry') return isOverview ? 50 : 40;
            return isOverview ? 14 : 18;
          },
          'height': function (ele) {
            if (ele.data('type') === 'inquiry') return isOverview ? 50 : 40;
            return isOverview ? 14 : 18;
          },
          'background-color': function (ele) { return ele.data('color'); },
          'border-width': function (ele) {
            if (ele.data('isBridge')) return 2;
            return 1;
          },
          'border-color': function (ele) {
            if (ele.data('isBridge')) return '#EBCB8B';
            return '#2E3440';
          },
          'border-style': function (ele) {
            if (ele.data('isBridge')) return 'dashed';
            return 'solid';
          },
          'opacity': function (ele) {
            if (ele.data('type') === 'inquiry') return 1;
            return 0.75;
          },
          'label': function (ele) {
            if (isOverview && ele.data('type') !== 'inquiry') return '';
            if (ele.data('type') === 'inquiry') return ele.data('label');
            // In cluster mode, show labels for literature/course too
            const label = ele.data('label');
            return label.length > 28 ? label.substring(0, 25) + '...' : label;
          },
          'font-size': function (ele) {
            if (ele.data('type') === 'inquiry') return isOverview ? 11 : 10;
            return 8;
          },
          'font-family': "'JetBrains Mono', monospace",
          'color': '#ECEFF4',
          'text-outline-color': '#2E3440',
          'text-outline-width': 2,
          'text-valign': 'bottom',
          'text-margin-y': 6,
          'text-wrap': 'wrap',
          'text-max-width': isOverview ? '120px' : '100px',
          'min-zoomed-font-size': 6,
        },
      },
      // Edges
      {
        selector: 'edge',
        style: {
          'width': 1,
          'line-color': 'rgba(136, 192, 208, 0.15)',
          'curve-style': 'bezier',
          'opacity': 0.6,
        },
      },
      // Highlighted node
      {
        selector: 'node.highlighted',
        style: {
          'border-width': 3,
          'border-color': '#B048A8',
          'opacity': 1,
          'z-index': 10,
        },
      },
      // Neighbor of highlighted
      {
        selector: 'node.neighbor',
        style: {
          'opacity': 1,
          'z-index': 5,
        },
      },
      // Dimmed (non-neighbor)
      {
        selector: 'node.dimmed',
        style: {
          'opacity': 0.1,
        },
      },
      // Dimmed edge
      {
        selector: 'edge.dimmed',
        style: {
          'opacity': 0.04,
        },
      },
      // Highlighted edge (neighbor edge)
      {
        selector: 'edge.highlighted',
        style: {
          'line-color': 'rgba(136, 192, 208, 0.5)',
          'opacity': 1,
          'width': 2,
        },
      },
    ];
  }

  // ---- Highlight / Unhighlight ----
  function highlightNode(node) {
    unhighlightAll();
    const neighborhood = node.neighborhood();

    cy.elements().addClass('dimmed');
    node.removeClass('dimmed').addClass('highlighted');
    neighborhood.nodes().removeClass('dimmed').addClass('neighbor');
    neighborhood.edges().removeClass('dimmed').addClass('highlighted');
    // Also highlight edges connected to the tapped node
    node.connectedEdges().removeClass('dimmed').addClass('highlighted');
  }

  function unhighlightAll() {
    if (!cy) return;
    cy.elements().removeClass('highlighted neighbor dimmed');
  }

  // ---- Sidebar ----
  function openSidebar(nodeData, mode) {
    $sidebarTitle.textContent = nodeData.label || nodeData.id;

    let html = '';

    // Type badge
    const badgeClass = 'badge-' + (nodeData.type || 'general');
    html += '<div class="sidebar-section">';
    html += '<span class="badge ' + badgeClass + '">' + escapeHtml(nodeData.type || 'general') + '</span>';
    html += '</div>';

    // Stats
    html += '<div class="sidebar-section">';
    html += '<div class="sidebar-section-title">Metrics</div>';
    html += '<div class="stat-row"><span class="stat-label">Centrality</span><span class="stat-value">' + (nodeData.centrality || 0).toFixed(4) + '</span></div>';
    html += '<div class="stat-row"><span class="stat-label">Connections</span><span class="stat-value">' + (nodeData.degree || 0) + '</span></div>';
    if (nodeData.cluster >= 0) {
      const clusterLabel = meta.clusterLabels[String(nodeData.cluster)] || ('Cluster ' + nodeData.cluster);
      html += '<div class="stat-row"><span class="stat-label">Community</span><span class="stat-value">' + escapeHtml(clusterLabel) + '</span></div>';
    }
    html += '</div>';

    // Bridge info
    if (nodeData.isBridge && nodeData.bridgesTo && nodeData.bridgesTo.length > 0) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-title">Bridges to</div>';
      for (const bt of nodeData.bridgesTo) {
        html += '<span class="bridge-tag">' + escapeHtml(bt) + '</span>';
      }
      html += '</div>';
    }

    // Connections list
    if (nodeData.connections && nodeData.connections.length > 0) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-title">Top connections</div>';
      html += '<ul class="connection-list">';
      for (const conn of nodeData.connections.slice(0, 10)) {
        html += '<li><a data-node-id="' + escapeHtml(conn) + '">' + escapeHtml(conn) + '</a></li>';
      }
      html += '</ul>';
      html += '</div>';
    }

    // Research question (inquiry nodes)
    if (nodeData.researchQuestion) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-title">Research question</div>';
      html += '<p class="panel-content">' + escapeHtml(nodeData.researchQuestion) + '</p>';
      html += '</div>';
    }

    // Key finding
    if (nodeData.keyFinding) {
      html += '<div class="sidebar-section">';
      html += '<div class="sidebar-section-title">Key finding</div>';
      html += '<p class="panel-content">' + escapeHtml(nodeData.keyFinding) + '</p>';
      html += '</div>';
    }

    $sidebarBody.innerHTML = html;

    // Wire up connection links to navigate in graph
    $sidebarBody.querySelectorAll('[data-node-id]').forEach(function (link) {
      link.addEventListener('click', function () {
        const targetId = this.getAttribute('data-node-id');
        if (cy) {
          const targetNode = cy.getElementById(targetId);
          if (targetNode.length > 0) {
            closeSidebar();
            cy.animate({
              center: { eles: targetNode },
              zoom: cy.zoom(),
            }, { duration: prefersReducedMotion ? 0 : 300 });
            setTimeout(function () {
              highlightNode(targetNode);
              openSidebar(targetNode.data(), currentView);
            }, prefersReducedMotion ? 0 : 350);
          }
        }
      });
    });

    $sidebar.classList.add('open');
    $sidebarOverlay.classList.add('open');
  }

  function closeSidebar() {
    $sidebar.classList.remove('open');
    $sidebarOverlay.classList.remove('open');
  }

  // ---- Stats Ribbon ----
  function renderStatsRibbon() {
    if (!meta) return;
    $statsRibbon.innerHTML =
      statBlock(meta.totalNotes, 'notes') +
      statBlock(meta.totalLinks, 'links') +
      statBlock(meta.communities, 'clusters') +
      statBlock(meta.singletons, 'singletons') +
      '<div class="stat"><span class="stat-text">updated ' + formatDate(meta.generated) + '</span></div>';
  }

  function statBlock(num, label) {
    return '<div class="stat"><span class="stat-num">' + num + '</span><span class="stat-text">' + label + '</span></div>';
  }

  // ---- Bento Cards ----
  function renderBentoCards() {
    if (!meta || !overviewData) return;

    // Clear existing timers
    cardTimers.forEach(clearInterval);
    cardTimers = [];

    let html = '';
    const clusterCount = meta.clusterFiles.length;

    for (let i = 0; i < clusterCount; i++) {
      const label = meta.clusterLabels[String(i)] || ('Cluster ' + i);
      const color = CLUSTER_COLORS[i % CLUSTER_COLORS.length];

      // Find inquiry nodes in this cluster for content cycling
      const inquiryNodes = overviewData.nodes.filter(function (n) {
        return n.cluster === i && n.type === 'inquiry';
      });

      // Get stats from overview data
      const clusterNodes = overviewData.nodes.filter(function (n) { return n.cluster === i; });
      const noteCount = inquiryNodes.length > 0 ? (inquiryNodes[0].noteCount || clusterNodes.length) : clusterNodes.length;
      const gapCount = inquiryNodes.reduce(function (sum, n) { return sum + (n.gapCount || 0); }, 0);

      // Collect cycling content
      const rq = inquiryNodes.map(function (n) { return n.researchQuestion; }).filter(Boolean).join(' ');
      const kf = inquiryNodes.map(function (n) { return n.keyFinding; }).filter(Boolean).join(' ');
      const bridges = inquiryNodes.flatMap(function (n) { return n.bridgeNodes || []; });
      const bridgeLabels = bridges.map(function (c) {
        return meta.clusterLabels[String(c)] || ('Cluster ' + c);
      });

      const sizeClass = noteCount > 30 ? ' large' : '';

      html += '<div class="bento-card' + sizeClass + '" data-cluster="' + i + '" tabindex="0" role="button" aria-label="Explore ' + escapeHtml(label) + '">';
      html += '<div class="bento-card-header">';
      html += '<div class="bento-card-title">' + escapeHtml(label) + '</div>';
      html += '<div class="bento-card-dot" style="background:' + color + '"></div>';
      html += '</div>';
      html += '<div class="bento-card-stats">';
      html += '<span><span class="num">' + noteCount + '</span> notes</span>';
      if (gapCount > 0) {
        html += '<span><span class="num">' + gapCount + '</span> gaps</span>';
      }
      html += '</div>';
      html += '<div class="bento-card-cycle" data-card-idx="' + i + '">';

      // Panel 0: Research question
      html += '<div class="bento-card-panel active" data-panel="0">';
      html += '<div class="panel-label">Research question</div>';
      html += '<div class="panel-content">' + escapeHtml(rq || 'Exploring this research thread...') + '</div>';
      html += '</div>';

      // Panel 1: Key finding
      html += '<div class="bento-card-panel" data-panel="1">';
      html += '<div class="panel-label">Key finding</div>';
      html += '<div class="panel-content">' + escapeHtml(kf || 'Analysis in progress.') + '</div>';
      html += '</div>';

      // Panel 2: Bridge nodes
      html += '<div class="bento-card-panel" data-panel="2">';
      html += '<div class="panel-label">Bridges to</div>';
      html += '<div class="panel-content">' + (bridgeLabels.length > 0 ? bridgeLabels.map(function (b) { return '<span class="bridge-tag">' + escapeHtml(b) + '</span>'; }).join(' ') : 'No cross-cluster bridges') + '</div>';
      html += '</div>';

      html += '</div>'; // end cycle
      html += '<div class="cycle-dots"><div class="cycle-dot active"></div><div class="cycle-dot"></div><div class="cycle-dot"></div></div>';
      html += '</div>'; // end card
    }

    $bentoGrid.innerHTML = html;

    // Wire up click events
    $bentoGrid.querySelectorAll('.bento-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const clusterId = parseInt(this.getAttribute('data-cluster'));
        showCluster(clusterId);
        // Scroll to top
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
      });
      card.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.click();
        }
      });
    });

    // Start auto-cycling (skip if reduced motion)
    if (!prefersReducedMotion) {
      startCardCycling();
    }
  }

  function startCardCycling() {
    const cards = $bentoGrid.querySelectorAll('.bento-card-cycle');
    cards.forEach(function (cycleEl, idx) {
      let currentPanel = 0;
      let paused = false;

      const card = cycleEl.closest('.bento-card');
      card.addEventListener('mouseenter', function () { paused = true; });
      card.addEventListener('mouseleave', function () { paused = false; });
      card.addEventListener('touchstart', function () { paused = true; }, { passive: true });
      card.addEventListener('touchend', function () {
        setTimeout(function () { paused = false; }, 2000);
      });

      // Stagger start: offset by 1.5s per card
      const offset = idx * 1500;

      const timer = setTimeout(function () {
        const interval = setInterval(function () {
          if (paused) return;
          const panels = cycleEl.querySelectorAll('.bento-card-panel');
          const dots = card.querySelectorAll('.cycle-dot');
          if (panels.length === 0) return;

          panels[currentPanel].classList.remove('active');
          if (dots[currentPanel]) dots[currentPanel].classList.remove('active');
          currentPanel = (currentPanel + 1) % panels.length;
          panels[currentPanel].classList.add('active');
          if (dots[currentPanel]) dots[currentPanel].classList.add('active');
        }, 5000);
        cardTimers.push(interval);
      }, offset);
      cardTimers.push(timer);
    });
  }

  // ---- Structural Gaps ----
  function renderGaps() {
    if (!meta || !meta.structuralGaps || meta.structuralGaps.length === 0) {
      $gapsSection.style.display = 'none';
      return;
    }

    // Show top 8 most interesting gaps (lowest density)
    const gaps = meta.structuralGaps.slice(0, 8);
    let html = '';
    for (const gap of gaps) {
      html += '<div class="gap-row">';
      html += '<span class="gap-label">' + escapeHtml(gap.labelA) + '</span>';
      html += '<span class="gap-arrow">&harr;</span>';
      html += '<span class="gap-label">' + escapeHtml(gap.labelB) + '</span>';
      html += '<span class="gap-count">' + gap.crossEdges + ' cross-edge' + (gap.crossEdges !== 1 ? 's' : '') + '</span>';
      html += '</div>';
    }
    $gapsSection.innerHTML = html;
  }

  // ---- Footer ----
  function renderFooter() {
    if (!meta) return;
    $footer.textContent = 'Vault Graph -- updated ' + formatDate(meta.generated);
  }

  // ---- Utilities ----
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) {
      return isoStr.split('T')[0];
    }
  }

  // ---- Event Wiring ----
  $btnBack.addEventListener('click', showOverview);
  $sidebarClose.addEventListener('click', closeSidebar);
  $sidebarOverlay.addEventListener('click', closeSidebar);

  // Keyboard: Escape closes sidebar or goes back
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if ($sidebar.classList.contains('open')) {
        closeSidebar();
        unhighlightAll();
      } else if (currentView === 'cluster') {
        showOverview();
      }
    }
  });

  // ---- Boot ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
