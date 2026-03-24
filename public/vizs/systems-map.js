/**
 * Interactive Systems Map Visualization
 * Draggable/clickable theoretical framework nodes with force-directed layout.
 */
window.initSystemsMap = function(canvas) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  const W = 960, H = 540;
  canvas.width = W; canvas.height = H;

  // Node types
  const TYPES = {
    theory:   { color: '#88C0D0', bg: '#1a2d38' },
    method:   { color: '#A3BE8C', bg: '#1e2a1e' },
    concept:  { color: '#B48EAD', bg: '#271f2e' },
    practice: { color: '#EBCB8B', bg: '#2a2616' },
    anchor:   { color: '#BF616A', bg: '#2a1a1c' },
  };

  // Nodes
  const nodes = [
    { id:0,  type:'anchor',   label:'student in context',   sub:'the unit of analysis',           x:480, y:270, w:170, h:44, pinned:true },
    { id:1,  type:'theory',   label:'Bronfenbrenner',       sub:'nested ecological systems',       x:110, y:95,  w:155, h:44 },
    { id:2,  type:'theory',   label:'Luhmann',              sub:'self-referential systems',        x:800, y:80,  w:150, h:44 },
    { id:3,  type:'theory',   label:'complex adaptive',     sub:'emergence & nonlinearity',        x:830, y:260, w:155, h:44 },
    { id:4,  type:'theory',   label:'complex responsive',   sub:'meaning in interaction',          x:760, y:440, w:165, h:44 },
    { id:5,  type:'concept',  label:'attribution',          sub:'explanation shapes next action',  x:130, y:280, w:145, h:44 },
    { id:6,  type:'concept',  label:'asset-based',          sub:'start from strength',             x:120, y:430, w:140, h:44 },
    { id:7,  type:'concept',  label:'self-worth theory',    sub:'performance as identity signal',  x:420, y:460, w:160, h:44 },
    { id:8,  type:'method',   label:'mixed methods',        sub:'numbers + narrative together',    x:380, y:70,  w:150, h:44 },
    { id:9,  type:'method',   label:'discourse analysis',   sub:'language as data',                x:260, y:420, w:155, h:44 },
    { id:10, type:'method',   label:'trajectory typology',  sub:'map the actual paths taken',      x:700, y:170, w:160, h:44 },
    { id:11, type:'practice', label:'instrument design',    sub:'build what can see the question', x:400, y:170, w:165, h:44 },
  ];

  // Edges
  const edges = [
    [1,0,'shapes context','shapes'],
    [2,0,'defines system','shapes'],
    [3,0,'emergence','feeds'],
    [4,0,'emerges from','feeds'],
    [5,0,'explains response','shapes'],
    [6,0,'design principle','informs'],
    [7,5,'self-protection','feeds'],
    [8,11,'enables','uses'],
    [8,9,'uses','uses'],
    [9,5,'surfaces','informs'],
    [10,0,'maps paths','informs'],
    [11,0,'operationalizes','constrains'],
    [1,5,'contextualizes','informs'],
    [2,3,'parallel','feeds'],
    [6,7,'reframes','shapes'],
  ];

  const EDGE_COLORS = {
    feeds:      'rgba(163,190,140,0.5)',
    shapes:     'rgba(136,192,208,0.5)',
    informs:    'rgba(180,142,173,0.45)',
    constrains: 'rgba(191,97,106,0.45)',
    uses:       'rgba(235,203,139,0.4)',
  };

  let vx = nodes.map(() => 0), vy = nodes.map(() => 0);
  let selected = -1, hovered = -1;
  let dragNode = -1, dragOffX = 0, dragOffY = 0;
  let raf2;

  function nb(n) { return { x:n.x-n.w/2, y:n.y-n.h/2, w:n.w, h:n.h }; }

  function hitTest(mx, my) {
    for (let i = nodes.length-1; i >= 0; i--) {
      const b = nb(nodes[i]);
      if (mx >= b.x && mx <= b.x+b.w && my >= b.y && my <= b.y+b.h) return i;
    }
    return -1;
  }

  function edgePoint(n, tx, ty) {
    const cx = n.x, cy = n.y;
    const dx = tx - cx, dy = ty - cy;
    const hw = n.w/2 + 3, hh = n.h/2 + 3;
    const absDx = Math.abs(dx), absDy = Math.abs(dy);
    if (absDx === 0 && absDy === 0) return {x:cx, y:cy};
    if (absDx/hw > absDy/hh) {
      const s = dx > 0 ? 1 : -1;
      return {x: cx + s*hw, y: cy + dy * (hw/absDx)};
    } else {
      const s = dy > 0 ? 1 : -1;
      return {x: cx + dx * (hh/absDy), y: cy + s*hh};
    }
  }

  function drawArrow(x1,y1,x2,y2,col) {
    const angle = Math.atan2(y2-y1, x2-x1);
    const len = 8;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len*Math.cos(angle-0.4), y2 - len*Math.sin(angle-0.4));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - len*Math.cos(angle+0.4), y2 - len*Math.sin(angle+0.4));
    ctx.strokeStyle = col;
    ctx.lineWidth = 1.6;
    ctx.stroke();
  }

  function physics() {
    const REPEL = 6000;
    const SPRING_K = 0.008;
    const DAMP = 0.75;
    const CENTER = 0.002;
    const REST = 220;

    nodes.forEach((a,i) => {
      if (a.pinned || i === dragNode) return;
      let fx=0, fy=0;

      nodes.forEach((b,j) => {
        if (i===j) return;
        const dx=a.x-b.x, dy=a.y-b.y, d2=dx*dx+dy*dy+1;
        const f = REPEL/d2;
        fx+=dx*f; fy+=dy*f;
      });

      edges.forEach(([ia,ib]) => {
        if (ia!==i && ib!==i) return;
        const other=nodes[ia===i?ib:ia];
        const dx=other.x-a.x, dy=other.y-a.y;
        const d=Math.sqrt(dx*dx+dy*dy)||1;
        const stretch=(d-REST)*SPRING_K;
        fx+=dx/d*stretch; fy+=dy/d*stretch;
      });

      fx+=(W/2-a.x)*CENTER; fy+=(H/2-a.y)*CENTER;

      if (!prefersReducedMotion) {
        const driftAngle = Math.sin(Date.now() * 0.0003 + i * 1.7) * 0.15;
        fx += Math.cos(driftAngle) * 0.03;
        fy += Math.sin(driftAngle) * 0.03;
      }

      vx[i]=(vx[i]+fx)*DAMP;
      vy[i]=(vy[i]+fy)*DAMP;

      const speed = Math.sqrt(vx[i]*vx[i] + vy[i]*vy[i]);
      const MAX_SPEED = 1.2;
      if (speed > MAX_SPEED) {
        vx[i] = (vx[i]/speed) * MAX_SPEED;
        vy[i] = (vy[i]/speed) * MAX_SPEED;
      }

      a.x=Math.max(a.w/2+8, Math.min(W-a.w/2-8, a.x+vx[i]));
      a.y=Math.max(a.h/2+8, Math.min(H-a.h/2-8, a.y+vy[i]));
    });
  }

  function drawFrame() {
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle='#1e2430';
    ctx.fillRect(0,0,W,H);

    // Draw edges
    edges.forEach(([ia,ib,label,style]) => {
      const a=nodes[ia], b=nodes[ib];
      const p1=edgePoint(a,b.x,b.y), p2=edgePoint(b,a.x,a.y);
      const isActive=(hovered===ia||hovered===ib||selected===ia||selected===ib);
      const col=isActive ? EDGE_COLORS[style].replace(/[\d.]+\)$/, '0.9)') : EDGE_COLORS[style];

      const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
      const dx = p2.x-p1.x, dy = p2.y-p1.y;
      const len = Math.sqrt(dx*dx+dy*dy);
      const nx = -dy/len, ny = dx/len;
      const curveAmt = len * 0.06;
      const cpx = mx + nx * curveAmt, cpy = my + ny * curveAmt;

      ctx.beginPath();
      ctx.moveTo(p1.x,p1.y);
      ctx.quadraticCurveTo(cpx, cpy, p2.x,p2.y);
      ctx.strokeStyle=col;
      ctx.lineWidth=isActive?1.8:1;
      ctx.stroke();
      drawArrow(cpx,cpy,p2.x,p2.y,col);

      if (isActive) {
        ctx.font='11px JetBrains Mono,monospace';
        ctx.fillStyle='rgba(221,226,234,0.8)';
        ctx.textAlign='center';
        ctx.fillText(label, cpx, cpy-7);
      }
    });

    // Draw nodes
    nodes.forEach((n,i) => {
      const isHov=hovered===i, isSel=selected===i;
      const t=TYPES[n.type];
      const b=nb(n);
      const cornerR = 5;

      if (isHov||isSel) {
        ctx.shadowColor=t.color; ctx.shadowBlur=16;
      }

      ctx.fillStyle=isHov||isSel ? t.bg : '#1e2430';
      ctx.strokeStyle=t.color;
      ctx.lineWidth=isHov||isSel?2.2:1;
      ctx.beginPath();
      ctx.roundRect(b.x, b.y, b.w, b.h, cornerR);
      ctx.fill(); ctx.stroke();
      ctx.shadowBlur=0;

      ctx.fillStyle=t.color;
      ctx.beginPath();
      ctx.roundRect(b.x+5, b.y+7, 4, b.h-14, 2);
      ctx.fill();

      ctx.font=`${isSel?600:500} 14px JetBrains Mono,monospace`;
      ctx.fillStyle=isHov||isSel?'#edf0f4':t.color;
      ctx.textAlign='left';
      ctx.textBaseline='middle';
      ctx.fillText(n.label, b.x+16, b.y+(isSel&&n.sub?14:b.h/2));

      if (n.sub && (isHov||isSel)) {
        ctx.font='12px JetBrains Mono,monospace';
        ctx.fillStyle='rgba(205,212,223,0.75)';
        ctx.fillText(n.sub, b.x+16, b.y+b.h-11);
      }
    });

    // Legend
    const types = [['theory','framework'],['method','how I look'],['concept','key idea'],['practice','in the work'],['anchor','unit of analysis']];
    ctx.font='12px JetBrains Mono,monospace';
    const lx0 = W - 170, ly0 = 6;
    ctx.fillStyle = 'rgba(30, 36, 48, 0.7)';
    ctx.fillRect(lx0 - 6, ly0 - 2, 174, types.length * 18 + 8);
    types.forEach(([k,lbl],i) => {
      const lx=lx0, ly=ly0+4+i*18;
      ctx.fillStyle=TYPES[k].color;
      ctx.fillRect(lx,ly+1,10,10);
      ctx.fillStyle='rgba(205,212,223,0.6)';
      ctx.textAlign='left';
      ctx.textBaseline='middle';
      ctx.fillText(lbl, lx+16, ly+6);
    });

    physics();

    if (!prefersReducedMotion) {
      raf2 = requestAnimationFrame(drawFrame);
    }
  }

  function getMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (W / rect.width),
      y: (e.clientY - rect.top) * (H / rect.height)
    };
  }

  canvas.addEventListener('mousemove', e => {
    const {x,y} = getMousePos(e);
    hovered = hitTest(x,y);
    canvas.style.cursor = hovered >= 0 ? 'pointer' : 'default';
    if (dragNode >= 0) {
      nodes[dragNode].x = x - dragOffX;
      nodes[dragNode].y = y - dragOffY;
      nodes[dragNode].x = Math.max(nodes[dragNode].w/2+8, Math.min(W-nodes[dragNode].w/2-8, nodes[dragNode].x));
      nodes[dragNode].y = Math.max(nodes[dragNode].h/2+8, Math.min(H-nodes[dragNode].h/2-8, nodes[dragNode].y));
    }
  });
  canvas.addEventListener('mousedown', e => {
    const {x,y} = getMousePos(e);
    const hit = hitTest(x,y);
    if (hit >= 0) { dragNode = hit; dragOffX = x - nodes[hit].x; dragOffY = y - nodes[hit].y; }
  });
  canvas.addEventListener('mouseup', e => {
    if (dragNode >= 0 && Math.abs(dragOffX) < 3 && Math.abs(dragOffY) < 3) {
      selected = selected === dragNode ? -1 : dragNode;
    }
    dragNode = -1;
  });
  canvas.addEventListener('mouseleave', () => { hovered = -1; dragNode = -1; canvas.style.cursor = 'default'; });

  // Start
  drawFrame();
};
