const CANVAS_W = 1080;
const CANVAS_H = 2340; // 19.5:9 — modernes iPhone-Seitenverhältnis
const PADDING_X = 120;
const MAX_TEXT_W = CANVAS_W - PADDING_X * 2;
const HEADLINE_SIZE_START = 80;
const HEADLINE_SIZE_MIN = 28;
const HEADLINE_SIZE_MAX = 120;
const BODY_RATIO = 0.5; // entspricht 1rem / 2rem auf der Karte
const HEADLINE_LINE_HEIGHT = 1.35;
const BODY_LINE_HEIGHT = 1.75;
const HEADLINE_BODY_GAP = 1.25; // entspricht margin-bottom: 1.25rem auf der Karte

// Fonts vorladen damit der Click-Handler keinen await braucht
const fontsReady = Promise.all([
  new FontFace('DM Serif Display', 'url(/static/fonts/dm-serif-display-latin-400-normal.woff2)', { unicodeRange: 'U+0000-00FF' }),
  new FontFace('DM Serif Display', 'url(/static/fonts/dm-serif-display-latin-ext-400-normal.woff2)', { unicodeRange: 'U+0100-024F' }),
  new FontFace('DM Mono', 'url(/static/fonts/dm-mono-latin-400-normal.woff2)', { unicodeRange: 'U+0000-00FF' }),
  new FontFace('DM Mono', 'url(/static/fonts/dm-mono-latin-ext-400-normal.woff2)', { unicodeRange: 'U+0100-024F' }),
].map(f => f.load().then(loaded => { document.fonts.add(loaded); return loaded; }))).catch(() => {});

function wrapText(ctx, text, maxWidth) {
  const paragraphs = text.split('\n');
  const lines = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const words = paragraphs[i].split(' ').filter(w => w.length > 0);
    if (words.length === 0) {
      if (lines.length > 0) lines[lines.length - 1].paraEnd = true;
      continue;
    }
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push({ text: current, paraEnd: false });
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push({ text: current, paraEnd: false });
    if (lines.length > 0) lines[lines.length - 1].paraEnd = (i < paragraphs.length - 1);
  }
  return lines;
}

function blockHeight(lines, fontSize, lineHeight) {
  return lines.length * fontSize * lineHeight;
}

function wrapBody(ctx, text, maxWidth) {
  // Body: \n sind echte Zeilenumbrüche, kein extra Paragraph-Abstand
  const lines = [];
  for (const para of text.split('\n')) {
    const words = para.split(' ').filter(w => w.length > 0);
    if (words.length === 0) { lines.push(''); continue; }
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function getCardContent() {
  const card = document.querySelector('.card.in-view');
  if (!card) return null;
  const headline = card.querySelector('.card-headline')?.textContent?.trim() || '';
  const body = card.querySelector('.card-body')?.innerText?.trim() || '';
  return { headline, body };
}

function buildCanvas({ headline, body }) {
  const style = getComputedStyle(document.documentElement);
  const bgColor = style.getPropertyValue('--bg').trim();
  const fgColor = style.getPropertyValue('--fg').trim();
  const fgMuted = style.getPropertyValue('--fg-muted').trim();

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Schriftgröße anpassen bis alles passt
  let headlineSize = HEADLINE_SIZE_START;

  function computeLayout(size) {
    const bodySize = size * BODY_RATIO;
    ctx.font = `${size}px "DM Serif Display", Georgia, serif`;
    const hLines = wrapText(ctx, headline, MAX_TEXT_W);
    const hHeight = blockHeight(hLines, size, HEADLINE_LINE_HEIGHT);

    let bLines = [];
    let bHeight = 0;
    if (body) {
      ctx.font = `${bodySize}px "DM Mono", monospace`;
      bLines = wrapBody(ctx, body, MAX_TEXT_W);
      bHeight = blockHeight(bLines, bodySize, BODY_LINE_HEIGHT);
    }

    const gap = body ? size * HEADLINE_BODY_GAP : 0;
    const total = hHeight + gap + bHeight;
    return { hLines, bLines, hHeight, bHeight, gap, total, bodySize };
  }

  let layout = computeLayout(headlineSize);

  while (layout.total > CANVAS_H - PADDING_X * 2 && headlineSize > HEADLINE_SIZE_MIN) {
    headlineSize -= 4;
    layout = computeLayout(headlineSize);
  }

  if (!body) {
    while (layout.total < CANVAS_H * 0.2 && headlineSize < HEADLINE_SIZE_MAX) {
      headlineSize += 4;
      layout = computeLayout(headlineSize);
    }
  }

  const { hLines, bLines, hHeight, gap, bodySize } = layout;
  let y = (CANVAS_H - layout.total) / 2;

  // Headline zeichnen
  ctx.font = `${headlineSize}px "DM Serif Display", Georgia, serif`;
  ctx.fillStyle = fgColor;
  const hlh = headlineSize * HEADLINE_LINE_HEIGHT;
  for (const line of hLines) {
    ctx.fillText(line.text, PADDING_X, y);
    y += hlh;
  }

  // Body zeichnen
  if (body && bLines.length > 0) {
    y = (CANVAS_H - layout.total) / 2 + hHeight + gap;
    ctx.font = `${bodySize}px "DM Mono", monospace`;
    ctx.fillStyle = fgMuted;
    const blh = bodySize * BODY_LINE_HEIGHT;
    for (const line of bLines) {
      ctx.fillText(line, PADDING_X, y);
      y += blh;
    }
  }

  return canvas;
}

function canvasToBlob(canvas) {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function download(blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.download = 'smart-karte.png';
  a.href = url;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportWallpaper() {
  const content = getCardContent();
  if (!content || !content.headline) return;

  await fontsReady;

  const canvas = buildCanvas(content);
  const blob = await canvasToBlob(canvas);
  const file = new File([blob], 'smart-karte.png', { type: 'image/png' });

  if (navigator.share) {
    try {
      await navigator.share({ files: [file] });
    } catch (err) {
      if (err.name !== 'AbortError') {
        // share nicht unterstützt, Fallback
        download(blob);
      }
    }
  } else {
    download(blob);
  }
}

const wallpaperBtn = document.getElementById('wallpaper-btn');
if (wallpaperBtn) {
  wallpaperBtn.addEventListener('click', exportWallpaper);
}
