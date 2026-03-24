/**
 * Dose-Response Chart Visualization
 * Animated bar chart showing contacts vs return-to-standing rates.
 */
window.initDoseResponse = function(canvas) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const W = 640, H = 220;
  canvas.width = W; canvas.height = H;

  // Data: return-to-standing rates by contact level by term
  const terms = ['FA23 (pre)', 'SP24 (pre)', 'FA24', 'SP25', 'FA25'];
  const data = {
    '0':  [20.7, 21.1, 17.0, 17.0, 15.6],
    '1':  [34.9, 30.6, 41.4, 53.6, 48.6],
    '2':  [43.6, 30.6, 42.5, 51.5, 47.8],
    '3+': [36.2, 38.0, 47.7, 51.1, 51.7],
  };
  const levels = ['0', '1', '2', '3+'];
  const levelColors = {
    '0':  '#3d4f66',
    '1':  '#88C0D0',
    '2':  '#A3BE8C',
    '3+': '#EBCB8B',
  };
  const levelLabels = {
    '0':  '0 contacts',
    '1':  '1 contact',
    '2':  '2 contacts',
    '3+': '3+ contacts',
  };

  const PAD = { top: 24, right: 20, bottom: 48, left: 50 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const nTerms = terms.length;
  const groupW = chartW / nTerms;
  const barW = groupW / (levels.length + 1);

  let progress = prefersReducedMotion ? 1 : 0;
  let raf3;

  function drawChart() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, W, H);

    const maxVal = 60;

    // Grid lines
    [20, 40, 60].forEach(v => {
      const y = PAD.top + chartH - (v / maxVal) * chartH;
      ctx.beginPath();
      ctx.moveTo(PAD.left, y);
      ctx.lineTo(PAD.left + chartW, y);
      ctx.strokeStyle = 'rgba(61,79,102,0.4)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillStyle = '#3d4f66';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(v + '%', PAD.left - 6, y);
    });

    // Baseline marker (pre-era avg ~21%)
    const baseY = PAD.top + chartH - (20.9 / maxVal) * chartH;
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.moveTo(PAD.left, baseY);
    ctx.lineTo(PAD.left + chartW, baseY);
    ctx.strokeStyle = 'rgba(191,97,106,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.fillStyle = 'rgba(191,97,106,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText('pre-era zero-contact baseline', PAD.left + 4, baseY - 5);

    // Bars
    terms.forEach((term, ti) => {
      const groupX = PAD.left + ti * groupW + barW * 0.5;

      levels.forEach((lvl, li) => {
        const val = data[lvl][ti] * Math.min(1, progress);
        const barH = (val / maxVal) * chartH;
        const x = groupX + li * barW;
        const y = PAD.top + chartH - barH;
        const col = levelColors[lvl];

        ctx.fillStyle = col;
        ctx.globalAlpha = lvl === '0' ? 0.4 : 0.85;
        ctx.fillRect(x, y, barW - 2, barH);
        ctx.globalAlpha = 1;

        // Value label on bars (only when mostly drawn)
        if (progress > 0.85 && barH > 14) {
          ctx.font = '8px JetBrains Mono, monospace';
          ctx.fillStyle = col;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.fillText(data[lvl][ti] + '%', x + (barW-2)/2, y - 2);
        }
      });

      // Term label
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillStyle = ti < 2 ? '#3d4f66' : '#88C0D0';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(term, PAD.left + ti * groupW + groupW/2, PAD.top + chartH + 6);
      // pre label
      if (ti === 1) {
        ctx.fillStyle = 'rgba(61,79,102,0.7)';
        ctx.font = '8px JetBrains Mono, monospace';
        ctx.fillText('\u2190 pre-program', PAD.left + groupW, PAD.top + chartH + 18);
      }
    });

    // Legend
    levels.forEach((lvl, li) => {
      const lx = PAD.left + li * 142;
      const ly = 8;
      ctx.fillStyle = levelColors[lvl];
      ctx.globalAlpha = lvl === '0' ? 0.4 : 0.85;
      ctx.fillRect(lx, ly, 10, 9);
      ctx.globalAlpha = 1;
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.fillStyle = '#cdd4df';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(levelLabels[lvl], lx + 14, ly + 4);
    });

    if (progress < 1) {
      progress = Math.min(1, progress + 0.035);
      if (!prefersReducedMotion) {
        raf3 = requestAnimationFrame(drawChart);
      }
    }
  }

  drawChart();
};
