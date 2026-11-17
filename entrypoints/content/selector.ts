import type { SelectionPayload, TextHintSource } from '~/lib/types';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cssPath(el: Element): string {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts: string[] = [];
  let node: Element | null = el;
  while (node && node.nodeType === 1 && parts.length < 6) {
    const tag = node.tagName.toLowerCase();
    let part = tag;
    const parentElement: Element | null = node.parentElement;
    if (parentElement) {
      const siblings: Element[] = Array.from(parentElement.children);
      // tagName 在 HTML 里是大写，必须统一大小写再比，
      // 否则同标签兄弟永远数不出来，selector 不唯一（执行时可能点到别的元素）。
      const sameTag: Element[] = siblings.filter(
        (child: Element) => child.tagName.toLowerCase() === tag,
      );
      if (sameTag.length > 1) {
        const index = sameTag.indexOf(node as Element) + 1;
        part += `:nth-of-type(${index})`;
      }
    }
    parts.unshift(part);
    node = parentElement;
  }
  return parts.join(' > ');
}

function intersects(a: DOMRect, b: Rect): boolean {
  return a.right > b.x && a.left < b.x + b.w && a.bottom > b.y && a.top < b.y + b.h;
}

/** 从文件名里提取可读文案：`btn_checkin@2x.png` → `btn checkin`。 */
export function textFromUrl(raw: string): string {
  // 空串必须直接返回：new URL('', base) 会解析成当前页面自身，
  // 那样会把页面文件名当成按钮文案，导致执行阶段拿它去比对必然失败。
  if (!raw || !raw.trim()) return '';
  try {
    const path = new URL(raw, location.href).pathname;
    const base = path.slice(path.lastIndexOf('/') + 1);
    return base
      .replace(/\.[a-z0-9]+$/i, '')
      .replace(/[@_-]?\d+(\.\d+)?x$/i, '')
      .replace(/[-_+.]+/g, ' ')
      .trim();
  } catch {
    return '';
  }
}

/**
 * 元素自身的可见文案（只取直接文本节点）。
 * 不用 textContent：它会把所有后代文本拼起来，容器型按钮会因此拿到一大段无关文字，
 * 既污染 textHint，也会让执行阶段的文案校验必然失败。
 */
function ownText(el: Element): string {
  let out = '';
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType === 3) out += node.textContent ?? '';
  }
  return out.replace(/\s+/g, ' ').trim();
}

/**
 * 按钮文案。先取直接文本节点，再退到「后代文本但去掉嵌套的按钮/图片」——
 * `<button><span>签到</span></button>` 这种结构文字在 span 里，只取直接文本节点会漏。
 */
function visibleText(el: Element): string {
  const own = ownText(el);
  if (own) return own;
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('button, img, svg, canvas, input, select, textarea').forEach((n) => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/**
 * 按钮的可见文案。图片按钮没有 textContent，只能退到 alt / title / aria-label，
 * 最后用图片文件名兜底（`btn_checkin.png` 这种本身就说明了按钮用途）。
 * 同时返回来源，供执行阶段决定怎么校验——见 TextHintSource。
 */
export function describeButton(el: HTMLElement): { text: string; textHintSource: TextHintSource } {
  const text = visibleText(el);
  if (text) return { text, textHintSource: 'text' };

  const attr = (name: string) => (el.getAttribute(name) ?? '').trim();
  const ariaLabel = attr('aria-label');
  if (ariaLabel) return { text: ariaLabel, textHintSource: 'attr' };
  if (el.tagName === 'INPUT') {
    const value = (el as HTMLInputElement).value.trim();
    if (value) return { text: value, textHintSource: 'attr' };
  }
  const title = attr('title');
  if (title) return { text: title, textHintSource: 'attr' };

  // 按钮内部可能只有一个 <img>：文案在它身上，不在按钮上。
  const img = el.querySelector('img') ?? (el.tagName === 'IMG' ? (el as HTMLImageElement) : null);
  if (img) {
    const alt = (img.getAttribute('alt') ?? '').trim();
    if (alt) return { text: alt, textHintSource: 'attr' };
    const imgTitle = (img.getAttribute('title') ?? '').trim();
    if (imgTitle) return { text: imgTitle, textHintSource: 'attr' };
    const fromName = textFromUrl(img.getAttribute('src') ?? '');
    if (fromName) return { text: fromName, textHintSource: 'attr' };
  }

  const bg = getComputedStyle(el).backgroundImage;
  const bgMatch = /url\(["']?(.+?)["']?\)/.exec(bg ?? '');
  if (bgMatch) {
    const fromBg = textFromUrl(bgMatch[1]);
    if (fromBg) return { text: fromBg, textHintSource: 'attr' };
  }

  return { text: '', textHintSource: 'none' };
}

function elementsInRect(rect: Rect): HTMLElement[] {
  const all = Array.from(document.body.querySelectorAll('*')) as HTMLElement[];
  return all.filter((el) => {
    if (el.closest('.cm-sel-overlay')) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2 || !intersects(r, rect)) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export function extractPayload(rect: Rect): SelectionPayload {
  const els = elementsInRect(rect);
  const url = window.location.href;
  let site = window.location.hostname;
  try {
    site = new URL(url).hostname;
  } catch {
    // 保留 location.hostname
  }

  const buttonEls = els.filter((el) => {
    if (el.tagName === 'BUTTON' || el.tagName === 'A') return true;
    if (el.getAttribute('role') === 'button') return true;
    if (el.tagName === 'INPUT') {
      return ['button', 'submit'].includes((el as HTMLInputElement).type);
    }
    // 图片/画布按钮：没有语义标签，但确实是可点区域。保留为候选，
    // 由 describeButton 决定能拿到什么文案（可能为空）。
    if (el.tagName === 'CANVAS') return true;
    if (el.tagName === 'IMG') {
      return el.getAttribute('role') === 'button' || el.hasAttribute('onclick');
    }
    return false;
  });

  /** 取按钮真实的跳转地址：自身是 <a> 就用 href，否则往上找最近的 <a>。 */
  const hrefOf = (el: Element): string | undefined => {
    const anchor = el.tagName === 'A' ? el : el.closest('a');
    const href = anchor?.getAttribute('href')?.trim();
    if (!href || href === '#' || href.startsWith('javascript:')) return undefined;
    try {
      return new URL(href, location.href).href;
    } catch {
      return undefined;
    }
  };

  const buttons = buttonEls
    .slice(0, 12)
    .map((el) => {
      const { text, textHintSource } = describeButton(el);
      return { selector: cssPath(el), text: text.slice(0, 60), textHintSource, href: hrefOf(el) };
    })
    // 不再丢弃无文案的按钮：图片按钮的 selector 依然可用，
    // 只是执行阶段无法做文案校验（textHintSource === 'none'）。
    .filter((b) => b.selector.length > 0);

  // canvas / 自绘按钮常常没有语义标签，elementsInRect 未必能挑出来。
  // 用圈选区域中心点反查真实节点兜底：OCR 能给像素坐标，这里就是把坐标换回 DOM 的那一步。
  //
  // 注意：遮罩此时还在 DOM 里（extractPayload 先于 cleanup 执行）且会命中 pointer 事件，
  // 所以必须用 elementsFromPoint 取整摞元素并跳过遮罩，否则只能拿到遮罩自己。
  if (buttons.length === 0) {
    const cx = Math.min(window.innerWidth - 1, Math.max(0, rect.x + rect.w / 2));
    const cy = Math.min(window.innerHeight - 1, Math.max(0, rect.y + rect.h / 2));
    const stack = document.elementsFromPoint(cx, cy);
    const hit = stack.find((el) => !el.closest('.cm-sel-overlay'));
    const target = hit?.closest(
      'button, a, [role="button"], canvas, img, input[type="button"], input[type="submit"], [onclick]',
    );
    if (target instanceof HTMLElement) {
      const { text, textHintSource } = describeButton(target);
      buttons.push({
        selector: cssPath(target),
        text: text.slice(0, 60),
        textHintSource,
        href: hrefOf(target),
      });
    }
  }

  const texts = Array.from(
    new Set(
      els
        .filter((el) => el.children.length === 0)
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0 && t.length < 80),
    ),
  ).slice(0, 60);

  // 选区里最像标题的一行：优先找 h1-h4 / 大字重元素，取最短且有意义的文本。
  const headingEls = els
    .filter((el) => /^H[1-4]$/.test(el.tagName) || Number(getComputedStyle(el).fontWeight) >= 600)
    .map((el) => ({
      text: (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      size: Number.parseFloat(getComputedStyle(el).fontSize) || 0,
    }))
    .filter((x) => x.text.length >= 4 && x.text.length <= 80)
    .sort((a, b) => b.size - a.size);
  const heading = headingEls[0]?.text;

  const domSummary = els
    .slice(0, 120)
    .map((el) => {
      const cls =
        typeof el.className === 'string' && el.className.trim()
          ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`
          : '';
      const text = (el.textContent ?? '').trim().slice(0, 50);
      // 图片和画布没有 textContent，补上 alt / src 文件名，否则 AI 只能看到一行空串。
      let extra = '';
      if (el.tagName === 'IMG') {
        const alt = (el.getAttribute('alt') ?? '').trim();
        const src = textFromUrl(el.getAttribute('src') ?? '');
        extra = ` img[alt="${alt}" src~="${src}"]`;
      } else if (el.tagName === 'CANVAS') {
        extra = ' canvas(画布，文字需 OCR)';
      }
      return `${el.tagName.toLowerCase()}${cls}${el.id ? `#${el.id}` : ''}${extra} "${text}"`;
    })
    .join('\n');

  return {
    url,
    title: document.title,
    site,
    rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.w), h: Math.round(rect.h) },
    buttons,
    texts,
    domSummary,
    heading,
  };
}

/** 进入圈选模式。返回选区素材；取消时返回 null。 */
export function startSelection(): Promise<SelectionPayload | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'cm-sel-overlay';

    /* ── 全屏暗层：未框选时显示，框选后隐藏（改由选区巨影挖空） ── */
    const shade = document.createElement('div');
    shade.className = 'cm-sel-shade';
    overlay.appendChild(shade);

    /* ── 顶部说明：步骤序号 + 主标题 + 快捷键 ── */
    const bar = document.createElement('div');
    bar.className = 'cm-sel-bar';

    const barLeft = document.createElement('div');
    barLeft.className = 'cm-sel-bar-left';
    const step = document.createElement('span');
    step.className = 'cm-sel-step';
    step.textContent = '1';
    const title = document.createElement('span');
    title.className = 'cm-sel-title';
    title.textContent = '拖拽框选要自动签到的那一块';
    barLeft.append(step, title);

    const barRight = document.createElement('div');
    barRight.className = 'cm-sel-bar-right';
    const kbd = document.createElement('span');
    kbd.className = 'cm-sel-kbd';
    kbd.textContent = 'ESC 取消';
    barRight.appendChild(kbd);

    bar.append(barLeft, barRight);
    overlay.appendChild(bar);

    /* ── 中央引导（拖拽前） ── */
    const hint = document.createElement('div');
    hint.className = 'cm-sel-hint';

    const hintIcon = document.createElement('div');
    hintIcon.className = 'cm-sel-hint-icon';
    hintIcon.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#b23a1f" stroke-width="2" aria-hidden="true">' +
      '<path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3"/>' +
      '</svg>';

    const hintMain = document.createElement('div');
    hintMain.className = 'cm-sel-hint-main';
    hintMain.textContent = '按住鼠标左键，拖拽出一个矩形';

    const hintSub = document.createElement('div');
    hintSub.className = 'cm-sel-hint-sub';
    hintSub.textContent = '把「签到按钮」和它周围的文字一起框进来，识别更准';

    hint.append(hintIcon, hintMain, hintSub);
    overlay.appendChild(hint);

    /* ── 选区 ── */
    const box = document.createElement('div');
    box.className = 'cm-sel-box';
    box.style.display = 'none';
    overlay.appendChild(box);

    const label = document.createElement('div');
    label.className = 'cm-sel-label';
    box.appendChild(label);

    const size = document.createElement('div');
    size.className = 'cm-sel-size';
    box.appendChild(size);

    for (const cls of ['tl', 'tr', 'bl', 'br'] as const) {
      const handle = document.createElement('i');
      handle.className = 'cm-sel-handle';
      if (cls === 'tl') handle.style.cssText = 'left:-6px;top:-6px';
      if (cls === 'tr') handle.style.cssText = 'right:-6px;top:-6px';
      if (cls === 'bl') handle.style.cssText = 'left:-6px;bottom:-6px';
      if (cls === 'br') handle.style.cssText = 'right:-6px;bottom:-6px';
      box.appendChild(handle);
    }

    /* ── 底部操作条：框选完成后才出现，固定在视口底部中央 ── */
    const actions = document.createElement('div');
    actions.className = 'cm-sel-actions';

    const readout = document.createElement('div');
    readout.className = 'cm-sel-readout';
    const readoutSize = document.createElement('span');
    readoutSize.className = 'cm-sel-readout-size';
    const readoutNote = document.createElement('span');
    readoutNote.className = 'cm-sel-readout-note';
    readout.append(readoutSize, readoutNote);

    const redo = document.createElement('button');
    redo.className = 'cm-sel-btn';
    redo.type = 'button';
    redo.textContent = '重选';

    const confirm = document.createElement('button');
    confirm.className = 'cm-sel-btn-primary';
    confirm.type = 'button';
    confirm.innerHTML =
      '识别这块' +
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

    actions.append(readout, redo, confirm);
    overlay.appendChild(actions);

    document.body.appendChild(overlay);

    let startX = 0;
    let startY = 0;
    let dragging = false;
    let current: Rect | null = null;
    let settled = false;

    const cleanup = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('keydown', onKey);
      overlay.remove();
    };

    const finish = (payload: SelectionPayload | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(payload);
    };

    const MIN_SIZE = 20;

    const resetBox = () => {
      box.style.display = 'none';
      actions.classList.remove('is-visible');
      shade.classList.remove('is-hidden');
      hint.style.display = '';
      current = null;
    };

    /** 选区内的可点元素数量：让用户在点「识别」前就知道框对了没有。 */
    const describeSelection = (rect: Rect) => {
      const els = elementsInRect(rect);
      const clickable = els.filter(
        (el) =>
          el.tagName === 'BUTTON' ||
          el.tagName === 'A' ||
          el.getAttribute('role') === 'button' ||
          (el.tagName === 'INPUT' &&
            ['button', 'submit'].includes((el as HTMLInputElement).type)),
      ).length;
      const texts = els.filter((el) => el.children.length === 0 && (el.textContent ?? '').trim())
        .length;
      return { clickable, texts };
    };

    const renderBox = (rect: Rect) => {
      box.style.display = 'block';
      box.style.left = `${rect.x}px`;
      box.style.top = `${rect.y}px`;
      box.style.width = `${rect.w}px`;
      box.style.height = `${rect.h}px`;
      label.textContent = `选区 X${Math.round(rect.x)} Y${Math.round(rect.y)}`;
      size.textContent = `${Math.round(rect.w)} × ${Math.round(rect.h)}`;
      hint.style.display = 'none';
      readoutSize.textContent = `${Math.round(rect.w)} × ${Math.round(rect.h)}`;
    };

    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.cm-sel-actions') || target.closest('.cm-sel-bar')) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      current = { x: startX, y: startY, w: 0, h: 0 };
      actions.classList.remove('is-visible');
      shade.classList.add('is-hidden');
      renderBox(current);
    };

    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const rect: Rect = {
        x: Math.min(startX, e.clientX),
        y: Math.min(startY, e.clientY),
        w: Math.abs(e.clientX - startX),
        h: Math.abs(e.clientY - startY),
      };
      current = rect;
      renderBox(rect);
    };

    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      if (!current || current.w < MIN_SIZE || current.h < MIN_SIZE) {
        resetBox();
        return;
      }
      const { clickable, texts } = describeSelection(current);
      readoutNote.textContent = clickable
        ? `已框入 ${clickable} 个可点元素 / ${texts} 段文字`
        : texts
          ? `只框到 ${texts} 段文字，没找到按钮——可以重选，把按钮框进来`
          : '这块区域看起来是空的，换个位置试试';
      actions.classList.add('is-visible');
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish(null);
      if (e.key === 'Enter' && current && current.w >= MIN_SIZE) {
        finish(extractPayload(current));
      }
    };

    overlay.addEventListener('mousedown', onDown);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('keydown', onKey);

    redo.addEventListener('click', (e) => {
      e.stopPropagation();
      resetBox();
    });

    confirm.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!current || current.w < MIN_SIZE || current.h < MIN_SIZE) return;
      finish(extractPayload(current));
    });
  });
}
