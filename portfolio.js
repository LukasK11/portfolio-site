const activeLabel = document.querySelector('.menu-active-label');
const hoverLabel  = document.querySelector('.menu-hover-label');
const links       = document.querySelectorAll('.menu-link');

let animating = false;

function initLabel() {
    if (!activeLabel) return;
    const active = document.querySelector('.menu-link.active');
    if (active) {
        activeLabel.textContent = '/' + active.dataset.page.toUpperCase();
    } else {
        const pageData = document.body.dataset.page;
        if (pageData) activeLabel.textContent = '/' + pageData.toUpperCase();
    }
    activeLabel.style.opacity = '1';
}
initLabel();

function switchPage(page) {
    document.querySelectorAll('.page').forEach(s => s.classList.remove('active-page'));
    const next = document.getElementById('page-' + page);
    if (next) next.classList.add('active-page');
    if (page === 'projects') requestAnimationFrame(layoutProjects);
}

links.forEach(link => {
    link.addEventListener('click', () => {
        if (animating || link.classList.contains('active')) return;
        animating = true;

        const page       = link.dataset.page;
        const newText    = '/' + page.toUpperCase();
        const prevActive = document.querySelector('.menu-link.active');

        const fromRect = activeLabel.getBoundingClientRect();
        // If the link is hidden (arrow-only mode), fly from the arrow button instead
        const originEl = (link.offsetParent === null || link.getBoundingClientRect().width === 0)
            ? (nextBtn || link)
            : link;
        const linkRect = originEl.getBoundingClientRect();
        const dx = fromRect.left - linkRect.left;
        const dy = fromRect.top  - linkRect.top;

        // Snapshot positions of remaining links before reflow (FLIP)
        const otherLinks = [...links].filter(l => l !== link && !l.classList.contains('active'));
        const beforeRects = otherLinks.map(l => l.getBoundingClientRect());

        // Hide originals immediately — clones handle display during animation
        activeLabel.style.visibility = 'hidden';
        // Suppress hover label for the duration of the nav animation
        hoverLabel.classList.remove('visible');
        hoverLabel.textContent = '';
        hoverLabel.style.pointerEvents = 'none';
        // Remove clicked link from flow NOW so remaining options reflow right away
        link.style.display = 'none';

        // Measure after reflow, then animate each item from old position to new
        const afterRects = otherLinks.map(l => l.getBoundingClientRect());
        otherLinks.forEach((l, i) => {
            const shiftX = beforeRects[i].left - afterRects[i].left;
            if (Math.abs(shiftX) < 1) return;
            l.animate(
                [
                    { transform: `translateX(${shiftX}px)` },
                    { transform: 'translateX(0)' }
                ],
                { duration: 500, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
            );
        });

        // flyOut: current label fades in place
        const menuFontSize = getComputedStyle(document.querySelector('.menu-bar')).fontSize;
        const flyOut = document.createElement('span');
        flyOut.textContent = activeLabel.textContent;
        Object.assign(flyOut.style, {
            position: 'fixed', left: fromRect.left + 'px', top: fromRect.top + 'px',
            fontFamily: "'PP Neue Montreal Mono', monospace", fontSize: menuFontSize,
            color: '#3463FF', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: '9999',
        });
        document.body.appendChild(flyOut);

        // flyIn: new text travels from button to label slot, decelerating softly on arrival
        const flyIn = document.createElement('span');
        flyIn.textContent = newText;
        Object.assign(flyIn.style, {
            position: 'fixed', left: linkRect.left + 'px', top: linkRect.top + 'px',
            fontFamily: "'PP Neue Montreal Mono', monospace", fontSize: menuFontSize,
            color: '#3463FF', whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: '9999',
        });
        document.body.appendChild(flyIn);

        flyOut.animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration: 250, easing: 'ease', fill: 'forwards' }
        );

        flyIn.animate(
            [
                { transform: 'translate(0, 0)' },
                { transform: `translate(${dx}px, ${dy}px)` }
            ],
            { duration: 750, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
        ).finished.then(() => {
            flyOut.remove();
            flyIn.remove();

            // Update active state
            links.forEach(l => {
                l.classList.remove('active');
                l.style.display = '';
                l.style.visibility = '';
            });
            link.classList.add('active'); // gets display:none from CSS

            activeLabel.textContent = newText;
            activeLabel.style.visibility = '';
            hoverLabel.style.pointerEvents = '';

            // Fade in the previously-active link softly at the leftmost position
            if (prevActive) {
                const menuLinks = document.querySelector('.menu-links');
                // Move it to the start of the flex container so it appears leftmost
                menuLinks.insertBefore(prevActive, menuLinks.firstChild);
                prevActive.style.opacity = '0';
                requestAnimationFrame(() => {
                    prevActive.animate(
                        [{ opacity: 0 }, { opacity: 1 }],
                        { duration: 500, easing: 'ease', fill: 'forwards' }
                    ).finished.then(() => {
                        prevActive.style.opacity = '';
                    });
                });
            }

            switchPage(page);
            animating = false;
        });
    });
});

// > button: cycles pages or collapses expanded card
const pageOrder = ['projects', 'about', 'archive'];
const nextBtn = document.querySelector('.menu-next');
if (nextBtn) {
    nextBtn.addEventListener('click', () => {
        if (expandedCard) {
            collapseCard();
            return;
        }
        if (animating) return;
        const currentActive = document.querySelector('.menu-link.active');
        const currentPage   = currentActive ? currentActive.dataset.page : 'projects';
        const currentIndex  = pageOrder.indexOf(currentPage);
        const nextPage      = pageOrder[(currentIndex + 1) % pageOrder.length];
        const nextLink      = [...links].find(l => l.dataset.page === nextPage);
        if (nextLink) nextLink.click();
    });

    let flashRaf = null;
    nextBtn.addEventListener('mouseenter', () => {
        const target = expandedCard ? activeLabel : activeLabel;
        let start = null;
        function flashFrame(ts) {
            if (!start) start = ts;
            const t = ((ts - start) / 1200) % 1;
            // cubic-ease in-out approximation for smooth pulse
            const opacity = 0.3 + 0.7 * (0.5 - 0.5 * Math.cos(t * 2 * Math.PI));
            target.style.opacity = opacity;
            flashRaf = requestAnimationFrame(flashFrame);
        }
        flashRaf = requestAnimationFrame(flashFrame);
    });
    nextBtn.addEventListener('mouseleave', () => {
        if (flashRaf) { cancelAnimationFrame(flashRaf); flashRaf = null; }
        activeLabel.style.opacity = '1';
    });
}

// Project hover: show /TITLE/TAG in menu bar
document.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        if (animating) return;
        if (expandedCard) return; // active label already shows the title
        const title = card.dataset.title;
        const tag   = card.dataset.tag;
        if (!title || !hoverLabel) return;
        hoverLabel.textContent = '/' + title + '/' + tag;
        hoverLabel.classList.add('visible');
    });
    card.addEventListener('mouseleave', () => {
        hoverLabel.classList.remove('visible');
        hoverLabel.textContent = '';
    });
});

// Mobile scroll: show hover text for whichever card the menu bar overlaps
function updateMobileHoverLabel() {
    if (window.innerWidth >= 768) return;
    if (expandedCard || animating) return;
    const menuBar = document.querySelector('.menu-bar');
    if (!menuBar) return;
    const menuRect   = menuBar.getBoundingClientRect();
    const menuMidY   = menuRect.top + menuRect.height / 2;
    let matched = null;
    projectCards.forEach(card => {
        const rect = card.getBoundingClientRect();
        if (menuMidY >= rect.top && menuMidY <= rect.bottom) matched = card;
    });
    if (matched) {
        const title = matched.dataset.title;
        const tag   = matched.dataset.tag;
        if (title) {
            hoverLabel.textContent = '/' + title + '/' + tag;
            hoverLabel.classList.add('visible');
            return;
        }
    }
    hoverLabel.classList.remove('visible');
    hoverLabel.textContent = '';
}

window.addEventListener('scroll', updateMobileHoverLabel, { passive: true });

const feed         = document.querySelector('.projects-feed');
const projectCards = feed ? [...feed.querySelectorAll('.project-card')] : [];
const gifDecodeCache = new Map();
let gifuctModulePromise = null;
let apngModulePromise = null;

function isGifImage(img) {
    return /\.gif(?:$|[?#])/i.test(img.currentSrc || img.src || '');
}

function isPngImage(img) {
    return /\.png(?:$|[?#])/i.test(img.currentSrc || img.src || '');
}

function markGifPlaybackStart(img) {
    if (!isGifImage(img)) return;
    img._gifStartedAt = performance.now();
}

function syncGifCanvas(img) {
    const state = img._gifCanvasState;
    if (!state) return;
    state.canvas.style.top    = img.offsetTop  + 'px';
    state.canvas.style.left   = img.offsetLeft + 'px';
    state.canvas.style.width  = img.offsetWidth + 'px';
    state.canvas.style.height = img.offsetHeight + 'px';
}

function startPreviewCanvasSync(img) {
    const state = img._gifCanvasState;
    if (!state || state.syncRaf) return;
    function syncLoop() {
        syncGifCanvas(img);
        state.syncRaf = requestAnimationFrame(syncLoop);
    }
    state.syncRaf = requestAnimationFrame(syncLoop);
}

function setPreviewPlaybackPaused(img, paused) {
    const state = img && img._gifCanvasState;
    if (!state) return;
    if (paused) {
        if (typeof state.pause === 'function') state.pause();
        else state.paused = true;
    } else {
        if (typeof state.resume === 'function') state.resume();
        else state.paused = false;
    }
}

function getPreviewPixelSource(img) {
    return img && img._gifCanvasState ? img._gifCanvasState.canvas : img;
}

async function loadApng() {
    if (!apngModulePromise) apngModulePromise = import('https://esm.sh/apng-js@1.1.1?bundle');
    return apngModulePromise;
}

async function initApngPreviewCanvas(card, img) {
    if (!isPngImage(img) || img._gifCanvasState) return;
    if (window.innerWidth < 768) return; // skip heavy canvas decode on mobile
    try {
        const apngModule = await loadApng();
        const parseAPNG = apngModule.default || apngModule.parseAPNG;
        if (!parseAPNG) return;
        const buffer = await getGifBuffer(img);
        const apng = parseAPNG(buffer.slice(0));
        if (apng instanceof Error || !apng.frames || !apng.frames.length) return;
        await apng.createImages();

        const canvas = document.createElement('canvas');
        canvas.width = apng.width;
        canvas.height = apng.height;
        canvas.style.position = 'absolute';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '3';
        card.appendChild(canvas);
        syncGifCanvas(img);

        const ctx = canvas.getContext('2d');
        const player = await apng.getPlayer(ctx, false);
        const state = {
            canvas,
            player,
            syncRaf: null,
            pause() { player.pause(); },
            resume() { player.play(); },
        };
        img._gifCanvasState = state;
        syncGifCanvas(img);
        startPreviewCanvasSync(img);
        img.style.visibility = 'hidden';
        player.play();
    } catch (e) { /* keep native APNG if decoding fails */ }
}

async function initGifPreviewCanvas(card, img) {
    if (!isGifImage(img) || img._gifCanvasState) return;
    if (window.innerWidth < 768) return; // skip heavy canvas decode on mobile — native GIF is fine
    try {
        const gifuct = await loadGifuct();
        if (!gifuct || !gifuct.parseGIF || !gifuct.decompressFrames) return;
        const buffer = await getGifBuffer(img);
        const gif = gifuct.parseGIF(buffer.slice(0));
        const frames = gifuct.decompressFrames(gif, true);
        if (!frames.length) return;

        const logicalW = gif.lsd && gif.lsd.width ? gif.lsd.width : frames[0].dims.width;
        const logicalH = gif.lsd && gif.lsd.height ? gif.lsd.height : frames[0].dims.height;
        const canvas = document.createElement('canvas');
        canvas.width = logicalW;
        canvas.height = logicalH;
        canvas.style.position = 'absolute';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '3';
        card.appendChild(canvas);

        const frameCanvases = [];
        const composite = document.createElement('canvas');
        composite.width = logicalW;
        composite.height = logicalH;
        const compositeCtx = composite.getContext('2d');
        let previousFrame = null;
        let previousRestore = null;

        frames.forEach(frame => {
            if (previousFrame) {
                if (previousFrame.disposalType === 2) {
                    compositeCtx.clearRect(
                        previousFrame.dims.left,
                        previousFrame.dims.top,
                        previousFrame.dims.width,
                        previousFrame.dims.height
                    );
                } else if (previousFrame.disposalType === 3 && previousRestore) {
                    compositeCtx.clearRect(0, 0, logicalW, logicalH);
                    compositeCtx.drawImage(previousRestore, 0, 0);
                }
            }

            previousRestore = null;
            if (frame.disposalType === 3) {
                previousRestore = document.createElement('canvas');
                previousRestore.width = logicalW;
                previousRestore.height = logicalH;
                previousRestore.getContext('2d').drawImage(composite, 0, 0);
            }

            const existing = compositeCtx.getImageData(frame.dims.left, frame.dims.top, frame.dims.width, frame.dims.height);
            for (let i = 0; i < frame.patch.length; i += 4) {
                if (frame.patch[i + 3] === 0) continue;
                existing.data[i]     = frame.patch[i];
                existing.data[i + 1] = frame.patch[i + 1];
                existing.data[i + 2] = frame.patch[i + 2];
                existing.data[i + 3] = frame.patch[i + 3];
            }
            compositeCtx.putImageData(existing, frame.dims.left, frame.dims.top);

            const frameCanvas = document.createElement('canvas');
            frameCanvas.width = logicalW;
            frameCanvas.height = logicalH;
            frameCanvas.getContext('2d').drawImage(composite, 0, 0);
            frameCanvases.push(frameCanvas);
            previousFrame = frame;
        });

        const state = {
            canvas,
            ctx: canvas.getContext('2d'),
            frames: frameCanvases,
            delays: frames.map(frame => Math.max(20, frame.delay || 100)),
            index: 0,
            lastTs: null,
            elapsed: 0,
            paused: false,
            raf: null,
        };
        img._gifCanvasState = state;

        function drawFrame() {
            state.ctx.clearRect(0, 0, logicalW, logicalH);
            state.ctx.drawImage(state.frames[state.index], 0, 0);
        }

        function animate(ts) {
            syncGifCanvas(img);
            if (!state.paused) {
                if (state.lastTs === null) state.lastTs = ts;
                state.elapsed += ts - state.lastTs;
                state.lastTs = ts;
                while (state.elapsed >= state.delays[state.index]) {
                    state.elapsed -= state.delays[state.index];
                    state.index = (state.index + 1) % state.frames.length;
                }
                drawFrame();
            } else {
                state.lastTs = ts;
            }
            state.raf = requestAnimationFrame(animate);
        }

        // Draw the first frame into the canvas, then sync its CSS position/size to the
        // img, then hide the img and start animating — all in one rAF so the browser
        // paints the canvas and hides the img in the same frame (no flicker).
        drawFrame();
        requestAnimationFrame(() => {
            syncGifCanvas(img);
            img.style.visibility = 'hidden';
            state.raf = requestAnimationFrame(animate);
        });
    } catch (e) { /* keep native GIF if decoding fails */ }
}

projectCards.forEach(card => {
    const img = card.querySelector('img');
    if (!img) return;
    if (img.complete) {
        markGifPlaybackStart(img);
        initGifPreviewCanvas(card, img);
        initApngPreviewCanvas(card, img);
    } else {
        img.addEventListener('load', () => {
            markGifPlaybackStart(img);
            initGifPreviewCanvas(card, img);
            initApngPreviewCanvas(card, img);
        }, { once: true });
    }
});

const CARD_GAP = 40; // px between cards

// Declared early so layoutProjects (called immediately below) can reference them
let dragZ = 1;
let expandedCard = null;
let isCollapsing = false;
const collapsedState = new Map();

function layoutProjects() {
    if (!feed) return;

    const vw      = window.innerWidth;
    const vh      = window.innerHeight;
    const sidePad = vw * 0.05;
    const safeW   = vw - sidePad * 2;

    // Set image sizes in px first so offsetWidth is accurate when we measure it
    const isMobile  = vw < 768;
    const cardImgW  = Math.round(safeW * (isMobile ? 0.5 : 0.6667));
    projectCards.forEach(card => {
        if (card === expandedCard) return; // expanded card manages its own image size
        const img = card.querySelector('img');
        if (!img) return;
        if (card.classList.contains('horizontal')) {
            img.style.width  = cardImgW + 'px';
            img.style.height = 'auto';
        } else {
            if (isMobile) {
                img.style.width  = cardImgW + 'px';
                img.style.height = 'auto';
            } else {
                const aspect = parseFloat(getComputedStyle(card).getPropertyValue('--aspect')) || 1;
                const maxH   = vh * 0.9;
                const fromW  = (safeW - 14) * aspect;
                img.style.height = Math.round(Math.min(maxH, fromW)) + 'px';
                img.style.width  = 'auto';
            }
        }
    });

    // Force reflow so image size changes are committed before we measure card widths
    feed.getBoundingClientRect();

    let top = vh * 0.5 + 120;

    projectCards.forEach((card, i) => {
        // Don't reposition the expanded card — it manages its own position
        if (card === expandedCard) {
            const saved = collapsedState.get(card);
            top += (saved ? saved.cardOffsetH : card.offsetHeight) + CARD_GAP;
            return;
        }

        const w = card.offsetWidth;
        const h = card.offsetHeight;
        let x;

        if (isMobile) {
            x = Math.round((vw - w) / 2);
        } else {
            x = Math.round((vw - w) / 2);
        }

        card.style.left = Math.round(x) + 'px';
        card.style.top  = Math.round(top) + 'px';

        top += h + CARD_GAP;
    });

    const last = projectCards[projectCards.length - 1];
    if (last) {
        const lastH       = (last === expandedCard && collapsedState.get(last))
            ? collapsedState.get(last).cardOffsetH
            : last.offsetHeight;
        const bottomPad   = isMobile ? vh * 0.5 + 120 : 120;
        feed.style.height = (parseFloat(last.style.top) + lastH + bottomPad) + 'px';
    }
}

// Run immediately and after fonts/assets load
layoutProjects();
document.fonts.ready.then(() => { layoutProjects(); updateMobileHoverLabel(); });
window.addEventListener('load', () => { layoutProjects(); updateMobileHoverLabel(); });

// Re-layout each time an individual image finishes loading
// Also trigger blur-up sharpen effect
projectCards.forEach(card => {
    const img = card.querySelector(':scope > img');
    if (!img) return;
    const sharpen = () => img.classList.add('preview-loaded');
    if (img.complete) {
        sharpen();
    } else {
        img.addEventListener('load', () => { sharpen(); layoutProjects(); });
    }
});


// On resize: snap cards and images instantly so sizes and positions update atomically
let rafPending = false;
window.addEventListener('resize', () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
        // Freeze transitions for all non-expanded cards
        projectCards.forEach(c => {
            if (c === expandedCard) return;
            c.style.transition = 'none';
            const img = c.querySelector('img');
            if (img) img.style.transition = 'none';
        });

        layoutProjects();

        // If a card is expanded, re-apply its expanded dimensions to the new viewport
        if (expandedCard) {
            const card       = expandedCard;
            const isVertical = card.classList.contains('vertical');
            const vw2        = window.innerWidth;
            const isMobile2  = vw2 < 768;
            const sidePad2   = (!isMobile2 && !isVertical) ? vw2 * 0.10 : vw2 * 0.05;
            const cardPad2   = 10;
            const targetW2   = vw2 - sidePad2 * 2;
            const targetX2   = sidePad2;
            const menuBarEl2 = document.querySelector('.menu-bar');
            const menuBarH2  = menuBarEl2.offsetHeight;
            const topPad2    = 28;
            // Compute absolute top from feed rect so it stays just below the menu bar
            // regardless of current scroll position
            const feedTop2  = feed.getBoundingClientRect().top + window.scrollY;
            const absTop2   = feedTop2 - feed.getBoundingClientRect().top +
                              (topPad2 + menuBarH2 + topPad2) + window.scrollY;
            const img       = card.querySelector('img');

            // Freeze the expanded card's transitions during resize too
            card.style.transition = 'none';
            img.style.transition  = 'none';

            card.style.left  = targetX2 + 'px';
            card.style.top   = (topPad2 + menuBarH2 + topPad2) + window.scrollY + 'px';
            card.style.width = targetW2 + 'px';

            if (isVertical && !isMobile2) {
                img.style.width  = Math.round(targetW2 * 0.42) + 'px';
                img.style.height = 'auto';
            } else {
                img.style.width  = (targetW2 - cardPad2 - 3.6) + 'px';
                img.style.height = 'auto';
            }

            card.getBoundingClientRect(); // reflow

            // Keep freeze-frame canvas (if any) aligned to the new image dimensions
            refitFreezeCanvas(card);

            // Refit title to new dimensions
            const detail  = card.querySelector('.card-detail');
            const titleEl = card.querySelector('.card-title');
            if (titleEl && detail && detail.style.display !== 'none') {
                const fitW = (isVertical && !isMobile2) ? detail.offsetWidth - 6 : img.offsetWidth - 6;
                titleEl.style.fontSize = '100px';
                const naturalW = titleEl.scrollWidth;
                if (naturalW > 0) titleEl.style.fontSize = (100 * fitW / naturalW) + 'px';
            }

            // Refit videos to new card dimensions
            if (detail && detail.style.display !== 'none') {
                sizeDetailVideos(card, detail, isMobile2);
                // Also update feed height in case card grew/shrank
                const absTop3 = parseFloat(card.style.top);
                const cardBottom3 = absTop3 + card.offsetHeight;
                feed.style.height = (cardBottom3 + 120) + 'px';
            }

            // Redraw pixelation canvases on background cards
            projectCards.forEach(c => {
                if (c === card) return;
                const cImg   = c.querySelector('img');
                const canvas = c._pixelCanvas;
                if (!cImg || !canvas) return;
                drawPixelFrame(cImg, canvas, 20);
            });
        }

        // Re-enable transitions after the next paint (expanded card included)
        requestAnimationFrame(() => {
            projectCards.forEach(c => {
                c.style.transition = '';
                const img = c.querySelector('img');
                if (img) img.style.transition = '';
            });
            rafPending = false;
        });
    });
});

// Draggable + expandable project cards

const PIXELATE_DURATION = 1100; // matches card transition

function pixelEase(t) {
    // cubic-bezier(0.76, 0, 0.24, 1) approximation
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function drawPixelFrame(img, canvas, pixelSize) {
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    if (w === 0 || h === 0) return;
    const source = getPreviewPixelSource(img);
    if (!source) return;
    canvas.style.top    = img.offsetTop  + 'px';
    canvas.style.left   = img.offsetLeft + 'px';
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    if (pixelSize <= 1) { canvas.style.display = 'none'; return; }
    canvas.style.display = 'block';
    canvas.width  = Math.max(1, Math.floor(w / pixelSize));
    canvas.height = Math.max(1, Math.floor(h / pixelSize));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
}

function animatePixelation(card, direction) {
    const img = card.querySelector('img');
    if (!img) return;
    if (window.innerWidth < 768) {
        // Skip canvas pixelation on mobile — just pause/resume GIF playback
        if (direction === 'in') setPreviewPlaybackPaused(img, true);
        else setPreviewPlaybackPaused(img, false);
        return;
    }
    if (direction === 'in') setPreviewPlaybackPaused(img, true);
    if (card._pixelRaf) { cancelAnimationFrame(card._pixelRaf); card._pixelRaf = null; }
    let canvas = card._pixelCanvas;
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.style.position       = 'absolute';
        canvas.style.pointerEvents  = 'none';
        canvas.style.zIndex         = '4';
        canvas.style.imageRendering = 'pixelated';
        card.appendChild(canvas);
        card._pixelCanvas = canvas;
    }
    const MAX_PIXEL = 20;
    const start = performance.now();
    function frame(now) {
        const t      = Math.min((now - start) / PIXELATE_DURATION, 1);
        const eased  = pixelEase(direction === 'in' ? t : 1 - t);
        const pxSize = Math.max(1, Math.round(MAX_PIXEL * eased));
        drawPixelFrame(img, canvas, pxSize);
        if (t < 1) {
            card._pixelRaf = requestAnimationFrame(frame);
        } else {
            card._pixelRaf = null;
            if (direction === 'out') {
                canvas.style.display = 'none';
                setPreviewPlaybackPaused(img, false);
            }
        }
    }
    card._pixelRaf = requestAnimationFrame(frame);
}

const GLITCH_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_/+-.';

function glitchReveal(el, duration) {
    // Always resolve to the canonical text, not a mid-glitch snapshot
    if (!el._glitchOriginal) el._glitchOriginal = el.textContent;
    const original = el._glitchOriginal;
    const len      = original.length;
    // Cancel any in-flight animation on this element
    el._glitchCancel = (el._glitchCancel || 0) + 1;
    const token = el._glitchCancel;
    const start = performance.now();
    function frame(now) {
        if (el._glitchCancel !== token) return; // cancelled
        const progress = Math.min((now - start) / duration, 1);
        let result = '';
        for (let i = 0; i < len; i++) {
            if (original[i] === ' ' || original[i] === '\n') { result += original[i]; continue; }
            if (i < progress * len) {
                result += original[i];
            } else {
                result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            }
        }
        el.textContent = result;
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = original;
    }
    requestAnimationFrame(frame);
}

function glitchHide(el, duration) {
    if (!el._glitchOriginal) el._glitchOriginal = el.textContent;
    const original = el._glitchOriginal;
    const len      = original.length;
    el._glitchCancel = (el._glitchCancel || 0) + 1;
    const token = el._glitchCancel;
    const start = performance.now();
    function frame(now) {
        if (el._glitchCancel !== token) return; // cancelled
        const progress = Math.min((now - start) / duration, 1);
        let result = '';
        for (let i = 0; i < len; i++) {
            if (original[i] === ' ' || original[i] === '\n') { result += original[i]; continue; }
            if (i < progress * len) {
                result += GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
            } else {
                result += original[i];
            }
        }
        el.textContent = result;
        if (progress < 1) requestAnimationFrame(frame);
        else el.textContent = original;
    }
    requestAnimationFrame(frame);
}

function gifElapsedTime(img) {
    return performance.now() - (img._gifStartedAt || performance.now());
}

function frameIndexForElapsed(frames, elapsedMs) {
    const durations = frames.map(frame => Math.max(20, frame.delay || frame.duration || 100));
    const total = durations.reduce((sum, delay) => sum + delay, 0);
    if (!total) return 0;
    let t = elapsedMs % total;
    for (let i = 0; i < durations.length; i++) {
        if (t < durations[i]) return i;
        t -= durations[i];
    }
    return frames.length - 1;
}

async function getGifBuffer(img) {
    const src = img.currentSrc || img.src;
    if (!gifDecodeCache.has(src)) {
        gifDecodeCache.set(src, fetch(src).then(response => response.arrayBuffer()));
    }
    return gifDecodeCache.get(src);
}

async function loadGifuct() {
    if (window.gifuct || window.GIFuct) return window.gifuct || window.GIFuct;
    if (!gifuctModulePromise) gifuctModulePromise = import('https://esm.sh/gifuct-js@2.1.2?bundle');
    return gifuctModulePromise;
}

async function drawGifFrameWithImageDecoder(img, canvas, w, h) {
    if (typeof ImageDecoder !== 'function') return false;
    const buffer = await getGifBuffer(img);
    const decoder = new ImageDecoder({ data: buffer.slice(0), type: 'image/gif' });
    await decoder.tracks.ready;
    const track = decoder.tracks.selectedTrack;
    const frameCount = track && track.frameCount ? track.frameCount : 1;
    if (!Number.isFinite(frameCount) || frameCount < 1) {
        decoder.close();
        return false;
    }
    const frames = [];
    for (let i = 0; i < frameCount; i++) {
        const decoded = await decoder.decode({ frameIndex: i });
        frames.push({ duration: decoded.image.duration ? decoded.image.duration / 1000 : 100 });
        decoded.image.close();
    }
    const index = frameIndexForElapsed(frames, gifElapsedTime(img));
    const decoded = await decoder.decode({ frameIndex: index });
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(decoded.image, 0, 0, w, h);
    decoded.image.close();
    decoder.close();
    return true;
}

async function drawGifFrameWithGifuct(img, canvas, w, h) {
    const gifuct = await loadGifuct();
    if (!gifuct || !gifuct.parseGIF || !gifuct.decompressFrames) return false;
    const buffer = await getGifBuffer(img);
    const gif = gifuct.parseGIF(buffer.slice(0));
    const frames = gifuct.decompressFrames(gif, true);
    if (!frames.length) return false;
    const index = frameIndexForElapsed(frames, gifElapsedTime(img));
    const logicalW = gif.lsd && gif.lsd.width ? gif.lsd.width : frames[0].dims.width;
    const logicalH = gif.lsd && gif.lsd.height ? gif.lsd.height : frames[0].dims.height;
    const offscreen = document.createElement('canvas');
    offscreen.width = logicalW;
    offscreen.height = logicalH;
    const offCtx = offscreen.getContext('2d');
    let previousFrame = null;
    for (let i = 0; i <= index; i++) {
        if (previousFrame && previousFrame.disposalType === 2) {
            offCtx.clearRect(
                previousFrame.dims.left,
                previousFrame.dims.top,
                previousFrame.dims.width,
                previousFrame.dims.height
            );
        }
        const frame = frames[i];
        const imageData = offCtx.createImageData(frame.dims.width, frame.dims.height);
        imageData.data.set(frame.patch);
        offCtx.putImageData(imageData, frame.dims.left, frame.dims.top);
        previousFrame = frame;
    }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(offscreen, 0, 0, w, h);
    return true;
}

function freezeCardImage(card) {
    const img = card.querySelector('img');
    if (img && img._gifCanvasState) {
        if (typeof img._gifCanvasState.pause === 'function') img._gifCanvasState.pause();
        else img._gifCanvasState.paused = true;
        return;
    }
    if (!img || img._freezeCanvas) return;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    if (w === 0 || h === 0) return;
    const canvas = document.createElement('canvas');
    canvas.width  = w;
    canvas.height = h;
    canvas.style.position      = 'absolute';
    canvas.style.top           = img.offsetTop  + 'px';
    canvas.style.left          = img.offsetLeft + 'px';
    canvas.style.width         = w + 'px';
    canvas.style.height        = h + 'px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex        = '3';
    card.appendChild(canvas);
    img._freezeCanvas = canvas;

    const ua       = navigator.userAgent;
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);

    const finalise = () => {
        if (img._freezeCanvas !== canvas) return;
        img.style.visibility = 'hidden';
    };

    if (isSafari && typeof createImageBitmap === 'function') {
        createImageBitmap(img).then(bitmap => {
            if (img._freezeCanvas !== canvas) return;
            try {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0, w, h);
            } catch (e) { /* ignore */ }
            finalise();
        }).catch(() => {
            try {
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
            } catch (e) { /* ignore */ }
            finalise();
        });
    } else {
        const drawDecodedFrame = isGifImage(img)
            ? drawGifFrameWithImageDecoder(img, canvas, w, h).catch(() => false).then(success => success || drawGifFrameWithGifuct(img, canvas, w, h).catch(() => false))
            : Promise.resolve(false);
        drawDecodedFrame.then(success => {
            if (img._freezeCanvas !== canvas) return;
            if (!success) {
                try {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                } catch (e) { /* ignore */ }
            }
            finalise();
        });
    }
}

function unfreezeCardImage(card) {
    const img = card.querySelector('img');
    if (img && img._gifCanvasState) {
        if (typeof img._gifCanvasState.resume === 'function') img._gifCanvasState.resume();
        else img._gifCanvasState.paused = false;
        return;
    }
    if (!img || !img._freezeCanvas) return;
    img._freezeCanvas.remove();
    img._freezeCanvas = null;
    img.style.visibility = '';
}

function refitFreezeCanvas(card) {
    const img = card.querySelector('img');
    if (img && img._gifCanvasState) {
        syncGifCanvas(img);
        return;
    }
    if (!img || !img._freezeCanvas) return;
    const canvas = img._freezeCanvas;
    const w = img.offsetWidth;
    const h = img.offsetHeight;
    if (w === 0 || h === 0) return;
    canvas.style.top    = img.offsetTop  + 'px';
    canvas.style.left   = img.offsetLeft + 'px';
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    // Note: not redrawing — the underlying GIF has advanced, so keep the original frozen frame stretched
}

function sizeDetailVideos(card, detail, isMobile) {
    if (!detail) return;

    // Rotated video wrap (portrait iframe displayed as landscape via 90° rotation)
    const rotateWrap = detail.querySelector('.card-video-rotate-wrap');
    if (rotateWrap) {
        const rotatedIframe = rotateWrap.querySelector('.card-video--rotated');
        const portraitAspect = parseFloat(rotatedIframe?.dataset.aspect) || 1.775; // h/w
        const w = isMobile ? (card.offsetWidth - 10) : detail.offsetWidth;
        const containerH = Math.round(w / portraitAspect); // landscape height = w * (1/portraitAspect)
        rotateWrap.style.width = w + 'px';
        rotateWrap.style.height = containerH + 'px';
        if (isMobile) {
            const cardRect = card.getBoundingClientRect();
            const detailRect = detail.getBoundingClientRect();
            rotateWrap.style.marginLeft = (cardRect.left + 5 - detailRect.left) + 'px';
        } else {
            rotateWrap.style.marginLeft = '';
        }
        if (rotatedIframe) {
            // Before rotation: width = containerH, height = w
            // After rotate(90deg): visually appears as width=w, height=containerH
            rotatedIframe.style.width = containerH + 'px';
            rotatedIframe.style.height = w + 'px';
            rotatedIframe.style.left = Math.round((w - containerH) / 2) + 'px';
            rotatedIframe.style.top  = Math.round((containerH - w) / 2) + 'px';
        }
    }

    const videoPair = detail.querySelector('.card-video-pair');
    const horizVideo = detail.querySelector('.card-video:not(.card-video--vertical):not(.card-video-duo .card-video):not(.card-video--rotated)');
    const videoDuo = detail.querySelector('.card-video-duo');
    if (videoDuo) {
        const cardInnerW = card.offsetWidth - 10;
        if (isMobile) {
            const cardRect = card.getBoundingClientRect();
            const detailRect = detail.getBoundingClientRect();
            videoDuo.style.marginLeft = (cardRect.left + 5 - detailRect.left) + 'px';
            videoDuo.style.marginRight = '';
            videoDuo.style.width = cardInnerW + 'px';
            const maxVidHMobile = Math.round(window.innerHeight * 0.88);
            const videos = videoDuo.querySelectorAll('.card-video');
            const firstAspectMobile = parseFloat(videos[0]?.dataset.aspect) || 16 / 9;
            let firstHMobile = Math.round(cardInnerW * firstAspectMobile);
            let sharedWMobile = cardInnerW;
            if (firstHMobile > maxVidHMobile) { firstHMobile = maxVidHMobile; sharedWMobile = Math.round(firstHMobile / firstAspectMobile); }
            videoDuo.style.alignItems = 'center';
            videos.forEach(v => {
                const aspect = parseFloat(v.dataset.aspect) || 16 / 9;
                v.style.width = sharedWMobile + 'px';
                v.style.height = Math.round(sharedWMobile * aspect) + 'px';
            });
        } else {
            const rightPad = 8;
            const detailW = Math.max(1, detail.offsetWidth - rightPad);
            videoDuo.style.marginLeft = 'auto';
            videoDuo.style.marginRight = rightPad + 'px';
            videoDuo.style.width = detailW + 'px';
            const maxVidH = Math.round(window.innerHeight * 0.88);
            const videos = videoDuo.querySelectorAll('.card-video');
            const firstAspect = parseFloat(videos[0]?.dataset.aspect) || 16 / 9;
            let firstH = Math.round(detailW * firstAspect);
            let sharedW = detailW;
            if (firstH > maxVidH) { firstH = maxVidH; sharedW = Math.round(firstH / firstAspect); }
            videoDuo.style.alignItems = 'center';
            videos.forEach(v => {
                const aspect = parseFloat(v.dataset.aspect) || 16 / 9;
                v.style.width = sharedW + 'px';
                v.style.height = Math.round(sharedW * aspect) + 'px';
            });
        }
    }

    if (!horizVideo) return;

    if (!videoPair) {
        const aspect = parseFloat(horizVideo.dataset.aspect);
        const w = detail.offsetWidth;
        horizVideo.style.width = w + 'px';
        if (aspect) horizVideo.style.height = Math.round(w * aspect) + 'px';
        return;
    }

    const verticalVideos = [...videoPair.querySelectorAll('.card-video--vertical')];
    const verticalAspect = parseFloat(verticalVideos[0]?.dataset.aspect) || 426 / 190;
    const horizontalAspect = parseFloat(horizVideo.dataset.aspect) || 196 / 426;
    const gap = 8;

    if (isMobile) {
        const cardRect = card.getBoundingClientRect();
        const detailRect = detail.getBoundingClientRect();
        const fullW = card.offsetWidth - 10;
        const leftOffset = cardRect.left + 5 - detailRect.left;
        horizVideo.style.width = fullW + 'px';
        horizVideo.style.height = Math.round(fullW * horizontalAspect) + 'px';
        horizVideo.style.marginLeft = leftOffset + 'px';
        horizVideo.style.marginRight = '';
        horizVideo.style.marginTop = '0';
        videoPair.style.width = fullW + 'px';
        videoPair.style.marginLeft = leftOffset + 'px';
        videoPair.style.marginRight = '';
        videoPair.style.marginBottom = '';
        videoPair.style.flexDirection = 'column';
        videoPair.querySelectorAll('.card-video-pair-item').forEach(item => {
            item.style.width = fullW + 'px';
            item.style.height = Math.round(fullW * verticalAspect) + 'px';
        });
    } else {
        const rightPad = card.dataset.title === 'SCI_AM' ? 16 : 0;
        const targetW = Math.max(1, detail.offsetWidth - rightPad);
        const itemW = Math.round((targetW - gap) / 2);
        const itemH = Math.round(itemW * verticalAspect);
        horizVideo.style.width = targetW + 'px';
        horizVideo.style.height = Math.round(targetW * horizontalAspect) + 'px';
        horizVideo.style.marginLeft = '0';
        horizVideo.style.marginRight = rightPad + 'px';
        horizVideo.style.marginTop = '0';
        videoPair.style.width = targetW + 'px';
        videoPair.style.marginLeft = '0';
        videoPair.style.marginRight = rightPad + 'px';
        videoPair.style.marginBottom = '';
        videoPair.style.flexDirection = '';
        videoPair.querySelectorAll('.card-video-pair-item').forEach(item => {
            item.style.width = itemW + 'px';
            item.style.height = itemH + 'px';
        });
    }
}

function expandCard(card) {
    if (expandedCard || isCollapsing) return;
    expandedCard = card;

    projectCards.forEach(c => { if (c !== card) animatePixelation(c, 'in'); });
    projectCards.forEach(c => { if (c !== card) c.classList.add('bg-faded'); });
    hoverLabel.classList.remove('visible');
    hoverLabel.textContent = '';

    const img        = card.querySelector('img');
    const detail     = card.querySelector('.card-detail');
    const titleEl    = card.querySelector('.card-title');
    const isVertical = card.classList.contains('vertical');
    const savedLeft     = card.style.left;
    const savedTop      = card.style.top;
    const savedImgW     = img.style.width;   // e.g. '800px' set by layout engine
    const savedImgH     = img.style.height;  // e.g. 'auto' or px
    const savedImgWpx   = img.offsetWidth;
    const savedImgHpx   = img.offsetHeight;
    const savedCardW    = card.offsetWidth;
    const savedCardH    = card.offsetHeight;
    const currentRect   = card.getBoundingClientRect();

    collapsedState.set(card, {
        left:        savedLeft,
        top:         savedTop,
        imgWidth:    savedImgW,
        imgHeight:   savedImgH,
        imgWidthPx:  savedImgWpx,
        imgHeightPx: savedImgHpx,
        cardOffsetW: savedCardW,
        cardOffsetH: savedCardH,
    });

    const vw        = window.innerWidth;
    const isMobile  = vw < 768;
    const sidePad   = (!isMobile && !isVertical) ? vw * 0.10 : vw * 0.05;
    const cardPad   = 10;
    const targetW   = vw - sidePad * 2;
    const targetX   = sidePad;
    const menuBarEl = document.querySelector('.menu-bar');
    const menuBarH  = menuBarEl.offsetHeight;
    const topPad    = 28;
    const targetY   = topPad + menuBarH + topPad;


    // Freeze, snap to fixed at current position
    card.style.transition = 'none';
    img.style.transition  = 'none';
    card.style.position   = 'fixed';
    card.style.left       = currentRect.left + 'px';
    card.style.top        = currentRect.top  + 'px';
    card.style.width      = currentRect.width + 'px';
    img.style.width       = savedImgWpx + 'px';
    img.style.height      = savedImgHpx + 'px';
    syncGifCanvas(img);
    card.getBoundingClientRect(); // force reflow

    // Re-enable transitions and animate to expanded target
    card.style.transition = '';
    img.style.transition  = '';
    card.classList.add('expanded');
    card.style.left   = targetX + 'px';
    card.style.top    = targetY + 'px';
    card.style.zIndex = 9998;
    card.style.width  = targetW + 'px';

    if (!isVertical || isMobile) {
        const targetImgW = targetW - cardPad - 3.6;
        const targetImgH = savedImgHpx * (targetImgW / savedImgWpx); // maintain current visual aspect ratio
        img.style.width  = targetImgW + 'px';
        img.style.height = targetImgH + 'px';
        syncGifCanvas(img);
    }
    // Vertical on desktop: image keeps its natural size; detail fills flex row beside it

    // After animation settle: switch fixed→absolute, clear img height lock, show detail
    card.addEventListener('transitionend', function onExpanded(e) {
        if (e.propertyName !== 'left') return;
        card.removeEventListener('transitionend', onExpanded);

        const isMobileNow = window.innerWidth < 768;
        const absTop = targetY + window.scrollY;
        card.style.transition = 'none';
        card.style.position   = 'absolute';
        card.style.top        = absTop + 'px';
        img.style.transition  = 'none';
        img.style.height = 'auto';
        syncGifCanvas(img);

        if (isMobileNow) {
            // On mobile all cards are column layout — image fills full card width
            img.style.width = (targetW - cardPad - 3.6) + 'px';
            syncGifCanvas(img);
        } else if (isVertical) {
            // Desktop vertical: image keeps natural size, detail sits beside it
            // Width was never set during animation so just clear height lock
        }
        // Force reflow so dimensions are settled before we measure
        card.getBoundingClientRect();
        card.style.transition = '';
        img.style.transition  = '';

        if (detail) {
            const beforeH = card.offsetHeight;
            detail.style.display = 'block';
            if (titleEl) {
                const fitW = (isVertical && !isMobileNow) ? detail.offsetWidth - 6 : img.offsetWidth - 6;
                titleEl.style.fontSize = '100px';
                const naturalW = titleEl.scrollWidth;
                if (naturalW > 0) titleEl.style.fontSize = (100 * fitW / naturalW) + 'px';
            }
            const afterH = card.offsetHeight;
            card.style.height     = beforeH + 'px';
            card.style.transition = 'none';
            card.getBoundingClientRect();
            card.style.transition = 'height 0.45s cubic-bezier(0.76, 0, 0.24, 1)';
            card.style.height     = afterH  + 'px';
            setTimeout(() => {
                card.style.transition = '';
                card.style.height     = '';
                const cardBottom = absTop + card.offsetHeight;
                if (cardBottom + 120 > parseFloat(feed.style.height) || 0) {
                    feed.style.height = (cardBottom + 120) + 'px';
                }
                detail.getBoundingClientRect();
                detail.classList.add('visible');
                if (titleEl) glitchReveal(titleEl, 550);
                // Load all lazy videos — horizontal plays immediately, verticals load without autoplay
                detail.querySelectorAll('.card-video').forEach(v => {
                    if (!v.dataset.vimeoSrc) return;
                    if (v.classList.contains('card-video--vertical')) {
                        v.src = v.dataset.vimeoSrc.replace('autoplay=1', 'autoplay=0');
                    } else {
                        v.src = v.dataset.vimeoSrc;
                    }
                });
                sizeDetailVideos(card, detail, isMobileNow);
                card.style.height = '';  // ensure card auto-sizes to new video heights
                if (card.dataset.title === 'SCI_AM' && !isMobileNow) {
                    const pair = detail.querySelector('.card-video-pair');
                    if (pair) pair.style.marginBottom = '40px';
                }
                // Recalculate feed height now that videos are sized
                const cardBottomFinal = absTop + card.offsetHeight;
                feed.style.height = (cardBottomFinal + 240) + 'px';

                // Freeze preview image on the frame currently showing
                freezeCardImage(card);

            }, 450);
        }
    });

    menuBarEl.classList.add('project-open');
    document.querySelectorAll('.corner-nav').forEach(el => el.classList.add('card-open'));
    const title = card.dataset.title;
    const tag   = card.dataset.tag;
    activeLabel.textContent = '/' + (title || '') + '/' + (tag || '');
    activeLabel.style.opacity = '1';
    if (nextBtn) nextBtn.textContent = '<';
}

function collapseCard() {
    if (!expandedCard) return;
    isCollapsing = true;
    const card       = expandedCard;
    unfreezeCardImage(card);
    expandedCard     = null;
    const img        = card.querySelector('img');
    const saved      = collapsedState.get(card);
    const isVertical = card.classList.contains('vertical');
    const detail     = card.querySelector('.card-detail');
    const titleEl    = detail ? detail.querySelector('.card-title') : null;

    const FADE_DURATION = 450;

    function doCollapse() {
        // Start depixelating background cards in sync with the collapse animation
        projectCards.forEach(c => { if (c !== card) animatePixelation(c, 'out'); });
        projectCards.forEach(c => { if (c !== card) c.classList.remove('bg-faded'); });

        // Update menu bar in sync with the card animation start
        const menuBar = document.querySelector('.menu-bar');
        menuBar.classList.remove('project-open');
        document.querySelectorAll('.corner-nav').forEach(el => el.classList.remove('card-open'));
        const active = document.querySelector('.menu-link.active');
        if (active) {
            activeLabel.textContent = '/' + active.dataset.page.toUpperCase();
        } else {
            const pageData = document.body.dataset.page;
            if (pageData) activeLabel.textContent = '/' + pageData.toUpperCase();
        }
        activeLabel.style.opacity = '1';
        if (nextBtn) nextBtn.textContent = '>';

        // Stop videos and reset inline video styles
        if (detail) {
            detail.querySelectorAll('.card-video').forEach(v => { v.src = ''; });
            const rotateWrap = detail.querySelector('.card-video-rotate-wrap');
            if (rotateWrap) {
                rotateWrap.style.width = '';
                rotateWrap.style.height = '';
                rotateWrap.style.marginLeft = '';
                const ri = rotateWrap.querySelector('.card-video--rotated');
                if (ri) { ri.style.width = ''; ri.style.height = ''; ri.style.left = ''; ri.style.top = ''; }
            }
            const videoPair = detail.querySelector('.card-video-pair');
            const horizVideo = detail.querySelector('.card-video:not(.card-video--vertical):not(.card-video-duo .card-video)');
            if (horizVideo) { horizVideo.style.width = ''; horizVideo.style.height = ''; horizVideo.style.marginLeft = ''; horizVideo.style.marginRight = ''; horizVideo.style.marginTop = ''; }
            const videoDuo = detail.querySelector('.card-video-duo');
            if (videoDuo) {
                videoDuo.style.marginLeft = '';
                videoDuo.style.marginRight = '';
                videoDuo.style.width = '';
                videoDuo.querySelectorAll('.card-video').forEach(v => { v.style.width = ''; v.style.height = ''; });
            }
            if (videoPair) {
                videoPair.style.width = '';
                videoPair.style.marginLeft = '';
                videoPair.style.marginRight = '';
                videoPair.style.marginBottom = '';
                videoPair.style.flexDirection = '';
                videoPair.querySelectorAll('.card-video-pair-item').forEach(item => {
                    item.style.width = '';
                    item.style.height = '';
                });
            }
        }

        // --- Step 1: freeze all transitions, measure current visual state ---
        card.style.transition = 'none';
        img.style.transition  = 'none';
        const liveRect = card.getBoundingClientRect();
        const liveImgW = img.offsetWidth;
        const liveImgH = img.offsetHeight;

        // --- Step 2: snap to fixed at exact current position (decouples from scroll) ---
        card.style.position = 'fixed';
        card.style.left     = liveRect.left   + 'px';
        card.style.top      = liveRect.top    + 'px';
        card.style.width    = liveRect.width  + 'px';
        card.style.height   = liveRect.height + 'px'; // lock height so hiding detail won't jump
        img.style.width     = liveImgW + 'px';
        img.style.height    = liveImgH + 'px';
        syncGifCanvas(img);
        card.getBoundingClientRect(); // force reflow

        // --- Step 3: hide detail and restore feed height (safe — card is now fixed) ---
        if (detail) {
            detail.style.display = 'none';
            if (titleEl) titleEl.style.fontSize = '';
        }
        const lastCard = projectCards[projectCards.length - 1];
        if (lastCard) {
            const ls = collapsedState.get(lastCard);
            const lastTop = ls ? parseFloat(ls.top) : parseFloat(lastCard.style.top);
            const lastH   = ls ? ls.cardOffsetH : lastCard.offsetHeight;
            feed.style.height = (lastTop + lastH + 120) + 'px';
        }

        // --- Step 4: restore feed height to collapsed size so the page behind
        //     doesn't extend past its normal bounds while the card animates out ---
        const feedRect        = feed.getBoundingClientRect();
        const targetFixedLeft = feedRect.left + parseFloat(saved.left);
        const targetFixedTop  = feedRect.top  + parseFloat(saved.top);
        const targetH         = saved.cardOffsetH; // collapsed card height

        // --- Step 5: force reflow so height lock is registered, then enable transitions ---
        card.getBoundingClientRect();
        card.style.transition = '';
        img.style.transition  = '';

        // --- Step 6: animate everything simultaneously back to collapsed state.
        //     If the target is above the viewport (user was scrolled into the card),
        //     the card will animate off-screen — scroll position never changes. ---
        card.style.left   = targetFixedLeft + 'px';
        card.style.top    = targetFixedTop  + 'px';
        card.style.width  = saved.cardOffsetW + 'px';
        card.style.height = targetH + 'px';
        img.style.width   = saved.imgWidthPx  + 'px';
        img.style.height  = saved.imgHeightPx + 'px';
        syncGifCanvas(img);

        let settled = false;
        function onSettled() {
            if (settled) return;
            settled = true;
            isCollapsing = false;
            card.removeEventListener('transitionend', onDone);
            card.style.transition = 'none';
            img.style.transition  = 'none';
            card.classList.remove('expanded');
            card.style.position   = 'absolute';
            card.style.left       = saved.left;
            card.style.top        = saved.top;
            card.style.width      = '';
            card.style.height     = '';
            card.style.zIndex     = ++dragZ;
            img.style.width       = saved.imgWidth;
            img.style.height      = saved.imgHeight;
            syncGifCanvas(img);
            card.getBoundingClientRect();
            card.style.transition = '';
            img.style.transition  = '';
            projectCards.forEach(c => {
                c.style.transition = 'none';
                const ci = c.querySelector('img'); if (ci) ci.style.transition = 'none';
            });
            layoutProjects();
            updateMobileHoverLabel();
            requestAnimationFrame(() => {
                projectCards.forEach(c => {
                    c.style.transition = '';
                    const ci = c.querySelector('img'); if (ci) ci.style.transition = '';
                });
            });
        }
        function onDone(e) {
            if (e.propertyName !== 'left') return;
            onSettled();
        }
        card.addEventListener('transitionend', onDone);
        setTimeout(onSettled, PIXELATE_DURATION + 100);
    }

    if (detail && detail.classList.contains('visible')) {
        if (titleEl) glitchHide(titleEl, Math.round(FADE_DURATION * 0.75));
        detail.classList.remove('visible');
        setTimeout(() => {
            doCollapse();
        }, FADE_DURATION);
    } else {
        if (detail) {
            detail.classList.remove('visible');
            detail.style.display = 'none';
            if (titleEl) titleEl.style.fontSize = '';
        }
        doCollapse();
    }
}

// Escape key or click anywhere to close
window.addEventListener('keydown', e => {
    if (e.key === 'Escape') collapseCard();
});

let ignoreNextWindowClick = false;
window.addEventListener('click', () => {
    if (ignoreNextWindowClick) { ignoreNextWindowClick = false; return; }
    if (expandedCard) collapseCard();
});

projectCards.forEach(card => {
    let mouseDownX, mouseDownY;
    let recentTouch = false; // suppress synthetic mouse events after touch

    card.addEventListener('mousedown', e => {
        if (recentTouch) return;
        if (e.button !== 0) return;
        mouseDownX = e.clientX;
        mouseDownY = e.clientY;
    });

    card.addEventListener('mouseup', e => {
        if (recentTouch) return;
        if (e.button !== 0) return;
        const moved = Math.abs(e.clientX - mouseDownX) + Math.abs(e.clientY - mouseDownY);
        if (moved < 5 && !expandedCard) {
            ignoreNextWindowClick = true;
            expandCard(card);
        }
    });

    // Touch support
    card.addEventListener('touchstart', e => {
        recentTouch = true;
        const t     = e.touches[0];
        mouseDownX  = t.clientX;
        mouseDownY  = t.clientY;
    }, { passive: true });

    card.addEventListener('touchend', e => {
        setTimeout(() => { recentTouch = false; }, 500);
        const t     = e.changedTouches[0];
        const moved = Math.abs(t.clientX - mouseDownX) + Math.abs(t.clientY - mouseDownY);
        if (moved < 10 && !expandedCard) {
            ignoreNextWindowClick = true;
            expandCard(card);
        } else if (moved < 10 && expandedCard === card) {
            ignoreNextWindowClick = true;
            collapseCard();
        }
    });
});

// ── Hover-image pixelation for .hover-img-trigger ──────────────────────────
(function () {
    // Discrete pixel levels and how long to hold each before jumping to the next
    const PX_STEPS = [32, 12, 5, 1];   // very → moderate → slight → clear
    const PX_HOLDS = [160, 140, 120, 0]; // ms to hold each level

    function runHoverPixelation(img, canvas) {
        if (img._hoverPxRaf) { cancelAnimationFrame(img._hoverPxRaf); img._hoverPxRaf = null; }
        let stepIndex = 0;
        let stepStart = performance.now();

        function drawStep(pxSize) {
            const w = img.offsetWidth;
            const h = img.offsetHeight;
            if (w === 0 || h === 0) return;
            canvas.style.width  = w + 'px';
            canvas.style.height = h + 'px';
            if (pxSize <= 1) {
                canvas.style.display = 'none';
            } else {
                canvas.style.display = 'block';
                canvas.width  = Math.max(1, Math.floor(w / pxSize));
                canvas.height = Math.max(1, Math.floor(h / pxSize));
                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            }
        }

        function frame(now) {
            if (stepIndex >= PX_STEPS.length) { img._hoverPxRaf = null; return; }
            const elapsed = now - stepStart;
            drawStep(PX_STEPS[stepIndex]);
            if (elapsed >= PX_HOLDS[stepIndex]) {
                stepIndex++;
                stepStart = now;
            }
            if (stepIndex < PX_STEPS.length) {
                img._hoverPxRaf = requestAnimationFrame(frame);
            } else {
                img._hoverPxRaf = null;
            }
        }
        img._hoverPxRaf = requestAnimationFrame(frame);
    }

    document.querySelectorAll('.hover-img-trigger').forEach(trigger => {
        const img = trigger.querySelector('.hover-img-preview');
        if (!img) return;

        // Don't attach hover behaviour on touch-only devices
        if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

        // Build a canvas sibling that sits on top of the img
        const canvas = document.createElement('canvas');
        canvas.style.position       = 'absolute';
        canvas.style.pointerEvents  = 'none';
        canvas.style.zIndex         = '1000';
        canvas.style.imageRendering = 'pixelated';
        canvas.style.display        = 'none';
        // Insert canvas inside trigger, after img
        trigger.appendChild(canvas);
        // Position canvas relative to trigger (which is already position:relative)
        // Mirror the img's own offset so they overlap
        function syncCanvasPos() {
            canvas.style.bottom    = 'calc(100% + 10px)';
            canvas.style.left      = '50%';
            canvas.style.transform = 'translateX(-50%)';
        }

        trigger.addEventListener('mouseenter', () => {
            img.style.display = 'block';
            syncCanvasPos();
            runHoverPixelation(img, canvas);
        });

        trigger.addEventListener('mouseleave', () => {
            img.style.display = 'none';
            canvas.style.display = 'none';
            if (img._hoverPxRaf) { cancelAnimationFrame(img._hoverPxRaf); img._hoverPxRaf = null; }
        });
    });
}());

// ── Archive page init ──────────────────────────────────────────────────────
(function () {
    const archiveFeed = document.querySelector('.archive-feed');
    if (!archiveFeed) return;

    const cornerLeft  = document.querySelector('.corner-left');
    const cornerRight = document.querySelector('.corner-right');

    // Flatten items directly into feed (no column wrappers needed)
    const archiveItems = Array.from(archiveFeed.querySelectorAll('.archive-item'));
    if (!archiveItems.length) return;

    archiveFeed.innerHTML = '';
    archiveItems.forEach(item => archiveFeed.appendChild(item));

    const ITEM_W        = 300;
    const ITEM_W_MOBILE = 200; // px on mobile
    const TOP_OFFSET    = 80;   // px from top before items start (desktop)
    const COL_GAP       = 24;   // horizontal gap between columns
    const ROW_GAP       = 24;   // vertical gap between items

    // Fisher-Yates shuffle — produces new array, doesn't mutate
    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    function layoutArchive() {
        const vw       = window.innerWidth;
        const vh       = window.innerHeight;
        const isMobile = vw < 768;
        const itemW    = isMobile ? ITEM_W_MOBILE : ITEM_W;
        const topStart = isMobile ? Math.round(vh * 0.5 + 120) : TOP_OFFSET;

        // Determine usable horizontal range
        const edgeGap = 80;
        const lRect   = cornerLeft  ? cornerLeft.getBoundingClientRect()  : { right: 36 };
        const rRect   = cornerRight ? cornerRight.getBoundingClientRect() : { left: vw - 36 };
        const areaX   = isMobile ? Math.round(vw * 0.1)       : Math.round(lRect.right + edgeGap);
        const areaW   = isMobile ? Math.round(vw * 0.8)       : Math.round(rRect.left - edgeGap - areaX);

        // How many columns fit?
        const numCols = Math.max(1, Math.floor((areaW + COL_GAP) / (itemW + COL_GAP)));
        // Centre the column grid within areaW
        const gridW   = numCols * itemW + (numCols - 1) * COL_GAP;
        const gridX   = areaX + Math.round((areaW - gridW) / 2);

        // Column x positions
        const colXs     = Array.from({ length: numCols }, (_, i) => gridX + i * (itemW + COL_GAP));
        const colTops   = new Array(numCols).fill(topStart); // current fill height per column

        // Size all items to correct width first so heights are accurate
        archiveItems.forEach(item => {
            item.style.width = itemW + 'px';
            const iframe = item.querySelector('.archive-video');
            if (!iframe) return;
            const aspect = parseFloat(iframe.dataset.aspect) || 1;
            const innerW = item.clientWidth - 10; // clientWidth excludes border, so padding is symmetric
            iframe.style.width  = innerW + 'px';
            iframe.style.height = Math.round(innerW * aspect) + 'px';
        });

        // Force a reflow so the browser commits all size changes before we measure
        archiveFeed.getBoundingClientRect();

        // Build a reliable height map: for images use naturalWidth/naturalHeight ratio
        // so we get the correct height even before the image has painted
        function getItemHeight(item) {
            const h = item.offsetHeight;
            if (h > 0) return h;
            // Fallback for unloaded images
            const img = item.querySelector('img');
            if (img && img.naturalWidth && img.naturalHeight) {
                const innerW = itemW - 10; // 5px padding each side
                return Math.round(innerW * img.naturalHeight / img.naturalWidth) + 10;
            }
            // Fallback for iframes (should already have explicit height set above)
            const iframe = item.querySelector('.archive-video');
            if (iframe) {
                const aspect = parseFloat(iframe.dataset.aspect) || 1;
                return Math.round((itemW - 10) * aspect) + 10;
            }
            return 300; // absolute last resort
        }

        // Shuffle order for visual randomness, then place into shortest column
        const shuffled = shuffle(archiveItems);
        shuffled.forEach(item => {
            const col = colTops.indexOf(Math.min(...colTops));
            item.style.left = colXs[col] + 'px';
            item.style.top  = colTops[col] + 'px';
            colTops[col] += getItemHeight(item) + ROW_GAP;
        });

        archiveFeed.style.height = (Math.max(...colTops) + 60) + 'px';

        // Only autoplay the video whose item sits highest on the page
        const videoItems = archiveItems.filter(item => item.querySelector('.archive-video'));
        if (videoItems.length) {
            const topItem = videoItems.reduce((a, b) =>
                parseInt(a.style.top) <= parseInt(b.style.top) ? a : b
            );
            videoItems.forEach(item => {
                const iframe = item.querySelector('.archive-video');
                const base   = iframe.dataset.vimeoSrc || '';
                iframe.src   = item === topItem
                    ? base                                      // autoplay=1 already in src
                    : base.replace('autoplay=1', 'autoplay=0');
            });
        }
    }

    // Debounce resize so layout only runs once viewport stops changing
    let resizeTimer = null;
    function onResize() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(layoutArchive, 150);
    }

    layoutArchive();
    window.addEventListener('resize', onResize);

    // Re-layout once each image finishes loading in case it was unloaded on first pass
    archiveItems.forEach(item => {
        const img = item.querySelector('img');
        if (img && !img.complete) {
            img.addEventListener('load', layoutArchive, { once: true });
        }
    });

    // Hover label — show item title in menu bar
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (canHover && hoverLabel) {
        archiveItems.forEach(item => {
            const title = item.dataset.title || '';
            item.addEventListener('mouseenter', () => {
                hoverLabel.textContent = '/' + title;
            });
            item.addEventListener('mouseleave', () => {
                hoverLabel.textContent = '';
            });
        });
    }
}());

// ── About page init ────────────────────────────────────────────────────────
(function () {
    if (document.body.dataset.page !== 'about') return;
    const aboutText   = document.querySelector('.about-text');
    const aboutFooter = document.querySelector('.about-footer');
    const menuBar     = document.querySelector('.menu-bar');
    if (!menuBar) return;

    function syncWidths() {
        // Menu bar text sits 1.5em inside each edge — match that inner width
        const menuFontSize = parseFloat(getComputedStyle(menuBar).fontSize);
        const innerW = menuBar.offsetWidth - 2 * menuFontSize * 1.5;
        if (aboutText)   aboutText.style.maxWidth = Math.round(innerW) + 'px';
        if (aboutFooter) aboutFooter.style.width  = '';
    }

    syncWidths();
    window.addEventListener('resize', syncWidths);
    document.fonts.ready.then(syncWidths);
}());
