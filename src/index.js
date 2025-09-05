/* cSpell:disable */

import { CONFIG } from './config.js';
import { ThemeManager } from './theme.js';
import { translationManager, t } from './translations.js';

(async () => {
    // GLOBAL STATE
    const state = {
        running: false,
        imageLoaded: false,
        processing: false,
        totalPixels: 0,
        paintedPixels: 0,
        availableColors: [],
        activeColorPalette: [], // User-selected colors for conversion
        paintWhitePixels: true, // Default to ON
        fullChargeData: null,
        fullChargeInterval: null,
        paintTransparentPixels: false, // Default to OFF
        displayCharges: 0,
        preciseCurrentCharges: 0,
        maxCharges: 1, // Default max charges
        cooldown: CONFIG.COOLDOWN_DEFAULT,
        imageData: null,
        stopFlag: false,
        colorsChecked: false,
        startPosition: null,
        selectingPosition: false,
        region: null,
        minimized: false,
        lastPosition: { x: 0, y: 0 },
        estimatedTime: 0,
        language: 'en',
        paintingSpeed: CONFIG.PAINTING_SPEED.DEFAULT, // pixels batch size
        batchMode: CONFIG.BATCH_MODE, // "normal" or "random"
        randomBatchMin: CONFIG.RANDOM_BATCH_RANGE.MIN, // Random range minimum
        randomBatchMax: CONFIG.RANDOM_BATCH_RANGE.MAX, // Random range maximum
        cooldownChargeThreshold: CONFIG.COOLDOWN_CHARGE_THRESHOLD,
        chargesThresholdInterval: null,
        tokenSource: CONFIG.TOKEN_SOURCE, // "generator" or "manual"
        initialSetupComplete: false, // Track if initial startup setup is complete (only happens once)
        overlayOpacity: CONFIG.OVERLAY.OPACITY_DEFAULT,
        blueMarbleEnabled: CONFIG.OVERLAY.BLUE_MARBLE_DEFAULT,
        ditheringEnabled: true,
        // Advanced color matching settings
        colorMatchingAlgorithm: 'lab',
        enableChromaPenalty: true,
        chromaPenaltyWeight: 0.15,
        customTransparencyThreshold: CONFIG.TRANSPARENCY_THRESHOLD,
        customWhiteThreshold: CONFIG.WHITE_THRESHOLD,
        originalImage: null,
        paintUnavailablePixels: CONFIG.PAINT_UNAVAILABLE,
        // Coordinate generation settings
        coordinateMode: CONFIG.COORDINATE_MODE,
        coordinateDirection: CONFIG.COORDINATE_DIRECTION,
        coordinateSnake: CONFIG.COORDINATE_SNAKE,
        blockWidth: CONFIG.COORDINATE_BLOCK_WIDTH,
        blockHeight: CONFIG.COORDINATE_BLOCK_HEIGHT,
        // Smart save tracking
        _lastSavePixelCount: 0,
        _lastSaveTime: 0,
        _saveInProgress: false,
        paintedMap: null,
    };

    // --- OVERLAY UPDATE: Optimized OverlayManager class with performance improvements ---
    class OverlayManager {
        constructor() {
            this.isEnabled = false;
            this.startCoords = null; // { region: {x, y}, pixel: {x, y} }
            this.imageBitmap = null;
            this.chunkedTiles = new Map(); // Map<"tileX,tileY", ImageBitmap>
            this.originalTiles = new Map(); // Map<"tileX,tileY", ImageBitmap> store latest original tile bitmaps
            this.originalTilesData = new Map(); // Map<"tileX,tileY", {w,h,data:Uint8ClampedArray}> cache full ImageData for fast pixel reads
            this.tileSize = 1000;
            this.processPromise = null; // Track ongoing processing
            this.lastProcessedHash = null; // Cache invalidation
            this.workerPool = null; // Web worker pool for heavy processing
        }

        toggle() {
            this.isEnabled = !this.isEnabled;
            console.log(`Overlay ${this.isEnabled ? 'enabled' : 'disabled'}.`);
            return this.isEnabled;
        }

        enable() {
            this.isEnabled = true;
        }

        disable() {
            this.isEnabled = false;
        }

        clear() {
            this.disable();
            this.imageBitmap = null;
            this.chunkedTiles.clear();
            this.originalTiles.clear();
            this.originalTilesData.clear();
            this.lastProcessedHash = null;
            if (this.processPromise) {
                this.processPromise = null;
            }
        }

        async setImage(imageBitmap) {
            this.imageBitmap = imageBitmap;
            this.lastProcessedHash = null; // Invalidate cache
            if (this.imageBitmap && this.startCoords) {
                await this.processImageIntoChunks();
            }
        }

        async setPosition(startPosition, region) {
            if (!startPosition || !region) {
                this.startCoords = null;
                this.chunkedTiles.clear();
                this.lastProcessedHash = null;
                return;
            }
            this.startCoords = { region, pixel: startPosition };
            this.lastProcessedHash = null; // Invalidate cache
            if (this.imageBitmap) {
                await this.processImageIntoChunks();
            }
        }

        // Generate hash for cache invalidation
        _generateProcessHash() {
            if (!this.imageBitmap || !this.startCoords) return null;
            const { width, height } = this.imageBitmap;
            const { x: px, y: py } = this.startCoords.pixel;
            const { x: rx, y: ry } = this.startCoords.region;
            return `${width}x${height}_${px},${py}_${rx},${ry}_${state.blueMarbleEnabled}_${state.overlayOpacity}`;
        }

        // --- OVERLAY UPDATE: Optimized chunking with caching and batch processing ---
        async processImageIntoChunks() {
            if (!this.imageBitmap || !this.startCoords) return;

            // Check if we're already processing to avoid duplicate work
            if (this.processPromise) {
                return this.processPromise;
            }

            // Check cache validity
            const currentHash = this._generateProcessHash();
            if (this.lastProcessedHash === currentHash && this.chunkedTiles.size > 0) {
                console.log(`📦 Using cached overlay chunks (${this.chunkedTiles.size} tiles)`);
                return;
            }

            // Start processing
            this.processPromise = this._doProcessImageIntoChunks();
            try {
                await this.processPromise;
                this.lastProcessedHash = currentHash;
            } finally {
                this.processPromise = null;
            }
        }

        async _doProcessImageIntoChunks() {
            const startTime = performance.now();
            this.chunkedTiles.clear();

            const { width: imageWidth, height: imageHeight } = this.imageBitmap;
            const { x: startPixelX, y: startPixelY } = this.startCoords.pixel;
            const { x: startRegionX, y: startRegionY } = this.startCoords.region;

            const { startTileX, startTileY, endTileX, endTileY } = Utils.calculateTileRange(
                startRegionX,
                startRegionY,
                startPixelX,
                startPixelY,
                imageWidth,
                imageHeight,
                this.tileSize
            );

            const totalTiles = (endTileX - startTileX + 1) * (endTileY - startTileY + 1);
            console.log(`🔄 Processing ${totalTiles} overlay tiles...`);

            // Process tiles in batches to avoid blocking the main thread
            const batchSize = 4; // Process 4 tiles at a time
            const tilesToProcess = [];

            for (let ty = startTileY; ty <= endTileY; ty++) {
                for (let tx = startTileX; tx <= endTileX; tx++) {
                    tilesToProcess.push({ tx, ty });
                }
            }

            // Process tiles in batches with yielding
            for (let i = 0; i < tilesToProcess.length; i += batchSize) {
                const batch = tilesToProcess.slice(i, i + batchSize);

                await Promise.all(
                    batch.map(async ({ tx, ty }) => {
                        const tileKey = `${tx},${ty}`;
                        const chunkBitmap = await this._processTile(
                            tx,
                            ty,
                            imageWidth,
                            imageHeight,
                            startPixelX,
                            startPixelY,
                            startRegionX,
                            startRegionY
                        );
                        if (chunkBitmap) {
                            this.chunkedTiles.set(tileKey, chunkBitmap);
                        }
                    })
                );

                // Yield control to prevent blocking
                if (i + batchSize < tilesToProcess.length) {
                    await new Promise((resolve) => setTimeout(resolve, 0));
                }
            }

            const processingTime = performance.now() - startTime;
            console.log(`✅ Overlay processed ${this.chunkedTiles.size} tiles in ${Math.round(processingTime)}ms`);
        }

        async _processTile(tx, ty, imageWidth, imageHeight, startPixelX, startPixelY, startRegionX, startRegionY) {
            // Calculate the portion of the image that overlaps with this tile
            const imgStartX = (tx - startRegionX) * this.tileSize - startPixelX;
            const imgStartY = (ty - startRegionY) * this.tileSize - startPixelY;

            // Crop coordinates within the source image
            const sX = Math.max(0, imgStartX);
            const sY = Math.max(0, imgStartY);
            const sW = Math.min(imageWidth - sX, this.tileSize - (sX - imgStartX));
            const sH = Math.min(imageHeight - sY, this.tileSize - (sY - imgStartY));

            if (sW <= 0 || sH <= 0) return null;

            // Destination coordinates on the new chunk canvas
            const dX = Math.max(0, -imgStartX);
            const dY = Math.max(0, -imgStartY);

            const chunkCanvas = new OffscreenCanvas(this.tileSize, this.tileSize);
            const chunkCtx = chunkCanvas.getContext('2d');
            chunkCtx.imageSmoothingEnabled = false;

            chunkCtx.drawImage(this.imageBitmap, sX, sY, sW, sH, dX, dY, sW, sH);

            // --- OPTIMIZED: Blue marble effect with faster pixel manipulation ---
            if (state.blueMarbleEnabled) {
                const imageData = chunkCtx.getImageData(dX, dY, sW, sH);
                const data = imageData.data;

                // Faster pixel manipulation using typed arrays
                for (let i = 0; i < data.length; i += 4) {
                    const pixelIndex = i / 4;
                    const pixelY = Math.floor(pixelIndex / sW);
                    const pixelX = pixelIndex % sW;

                    if ((pixelX + pixelY) % 2 === 0 && data[i + 3] > 0) {
                        data[i + 3] = 0; // Set alpha to 0
                    }
                }

                chunkCtx.putImageData(imageData, dX, dY);
            }

            return await chunkCanvas.transferToImageBitmap();
        }

        // --- OVERLAY UPDATE: Optimized compositing with caching ---
        async processAndRespondToTileRequest(eventData) {
            const { endpoint, blobID, blobData } = eventData;

            let finalBlob = blobData;

            if (this.isEnabled && this.chunkedTiles.size > 0) {
                const tileMatch = endpoint.match(/(\d+)\/(\d+)\.png/);
                if (tileMatch) {
                    const tileX = parseInt(tileMatch[1], 10);
                    const tileY = parseInt(tileMatch[2], 10);
                    const tileKey = `${tileX},${tileY}`;

                    const chunkBitmap = this.chunkedTiles.get(tileKey);
                    // Also store the original tile bitmap for later pixel color checks
                    try {
                        const originalBitmap = await createImageBitmap(blobData);
                        this.originalTiles.set(tileKey, originalBitmap);
                        // Cache full ImageData for fast pixel access (avoid repeated drawImage/getImageData)
                        try {
                            let canvas, ctx;
                            if (typeof OffscreenCanvas !== 'undefined') {
                                canvas = new OffscreenCanvas(originalBitmap.width, originalBitmap.height);
                                ctx = canvas.getContext('2d');
                            } else {
                                canvas = document.createElement('canvas');
                                canvas.width = originalBitmap.width;
                                canvas.height = originalBitmap.height;
                                ctx = canvas.getContext('2d');
                            }
                            ctx.imageSmoothingEnabled = false;
                            ctx.drawImage(originalBitmap, 0, 0);
                            const imgData = ctx.getImageData(0, 0, originalBitmap.width, originalBitmap.height);
                            // Store typed array copy to avoid retaining large canvas
                            this.originalTilesData.set(tileKey, {
                                w: originalBitmap.width,
                                h: originalBitmap.height,
                                data: new Uint8ClampedArray(imgData.data),
                            });
                        } catch (e) {
                            // If ImageData extraction fails, still keep the bitmap as fallback
                            console.warn('OverlayManager: could not cache ImageData for', tileKey, e);
                        }
                    } catch (e) {
                        console.warn('OverlayManager: could not create original bitmap for', tileKey, e);
                    }
                    if (chunkBitmap) {
                        try {
                            // Use faster compositing for better performance
                            finalBlob = await this._compositeTileOptimized(blobData, chunkBitmap);
                        } catch (e) {
                            console.error('Error compositing overlay:', e);
                            // Fallback to original tile on error
                            finalBlob = blobData;
                        }
                    }
                }
            }

            // Send the (possibly modified) blob back to the injected script
            window.postMessage(
                {
                    source: 'auto-image-overlay',
                    blobID: blobID,
                    blobData: finalBlob,
                },
                '*'
            );
        }

        // Returns [r,g,b,a] for a pixel inside a region tile (tileX, tileY are region coords)
        async getTilePixelColor(tileX, tileY, pixelX, pixelY) {
            const tileKey = `${tileX},${tileY}`;
            const alphaThresh = state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;

            // 1. Prefer cached ImageData if available
            const cached = this.originalTilesData.get(tileKey);
            if (cached && cached.data && cached.w > 0 && cached.h > 0) {
                const x = Math.max(0, Math.min(cached.w - 1, pixelX));
                const y = Math.max(0, Math.min(cached.h - 1, pixelY));
                const idx = (y * cached.w + x) * 4;
                const d = cached.data;
                const a = d[idx + 3];

                if (!state.paintTransparentPixels && a < alphaThresh) {
                    // Treat as transparent / unavailable
                    // Lightweight debug: show when transparency causes skip (only if verbose enabled)
                    if (window._overlayDebug)
                        console.debug('OverlayManager: pixel transparent (cached), skipping', tileKey, x, y, a);
                    return null;
                }
                return [d[idx], d[idx + 1], d[idx + 2], a];
            }

            // 2. Fallback: use bitmap, with retry
            const maxRetries = 3;
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                const bitmap = this.originalTiles.get(tileKey);
                if (!bitmap) {
                    if (attempt === maxRetries) {
                        console.warn('OverlayManager: no bitmap for', tileKey, 'after', maxRetries, 'attempts');
                    } else {
                        await Utils.sleep(50 * attempt); // exponential delay
                    }
                    continue;
                }

                try {
                    let canvas, ctx;
                    if (typeof OffscreenCanvas !== 'undefined') {
                        canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
                        ctx = canvas.getContext('2d');
                    } else {
                        canvas = document.createElement('canvas');
                        canvas.width = bitmap.width;
                        canvas.height = bitmap.height;
                        ctx = canvas.getContext('2d');
                    }
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(bitmap, 0, 0);

                    const x = Math.max(0, Math.min(bitmap.width - 1, pixelX));
                    const y = Math.max(0, Math.min(bitmap.height - 1, pixelY));
                    const data = ctx.getImageData(x, y, 1, 1).data;
                    const a = data[3];

                    if (!state.paintTransparentPixels && a < alphaThresh) {
                        if (window._overlayDebug)
                            console.debug('OverlayManager: pixel transparent (fallback)', tileKey, x, y, a);
                        return null;
                    }

                    return [data[0], data[1], data[2], a];
                } catch (e) {
                    console.warn('OverlayManager: failed to read pixel (attempt', attempt, ')', tileKey, e);
                    if (attempt < maxRetries) {
                        await Utils.sleep(50 * attempt);
                    } else {
                        console.error('OverlayManager: failed to read pixel after', maxRetries, 'attempts', tileKey);
                    }
                }
            }

            // 3. If everything fails — you can return null or [0,0,0,0]
            // Prefer null — to avoid misleading
            return null;
        }

        async _compositeTileOptimized(originalBlob, overlayBitmap) {
            const originalBitmap = await createImageBitmap(originalBlob);
            const canvas = new OffscreenCanvas(originalBitmap.width, originalBitmap.height);
            const ctx = canvas.getContext('2d');

            // Disable anti-aliasing for pixel-perfect rendering
            ctx.imageSmoothingEnabled = false;

            // Draw original tile first
            ctx.drawImage(originalBitmap, 0, 0);

            // Set opacity and draw overlay with optimized blend mode
            ctx.globalAlpha = state.overlayOpacity;
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(overlayBitmap, 0, 0);

            // Use faster blob conversion with compression settings
            return await canvas.convertToBlob({
                type: 'image/png',
                quality: 0.95, // Slight compression for faster processing
            });
        }

        /**
         * Wait until all required tiles are loaded and cached
         * @param {number} startRegionX
         * @param {number} startRegionY
         * @param {number} pixelWidth
         * @param {number} pixelHeight
         * @param {number} startPixelX
         * @param {number} startPixelY
         * @param {number} timeoutMs
         * @returns {Promise<boolean>} true if tiles are ready
         */
        async waitForTiles(
            startRegionX,
            startRegionY,
            pixelWidth,
            pixelHeight,
            startPixelX = 0,
            startPixelY = 0,
            timeoutMs = 10000
        ) {
            const { startTileX, startTileY, endTileX, endTileY } = Utils.calculateTileRange(
                startRegionX,
                startRegionY,
                startPixelX,
                startPixelY,
                pixelWidth,
                pixelHeight,
                this.tileSize
            );

            const requiredTiles = [];
            for (let ty = startTileY; ty <= endTileY; ty++) {
                for (let tx = startTileX; tx <= endTileX; tx++) {
                    requiredTiles.push(`${tx},${ty}`);
                }
            }

            if (requiredTiles.length === 0) return true;

            const startTime = Date.now();

            while (Date.now() - startTime < timeoutMs) {
                if (state.stopFlag) {
                    console.log('waitForTiles: stopped by user');
                    return false;
                }

                const missing = requiredTiles.filter((key) => !this.originalTiles.has(key));
                if (missing.length === 0) {
                    console.log(`✅ All ${requiredTiles.length} required tiles are loaded`);
                    return true;
                }

                await Utils.sleep(100);
            }

            console.warn(`❌ Timeout waiting for tiles: ${requiredTiles.length} required, 
        ${requiredTiles.filter((k) => this.originalTiles.has(k)).length} loaded`);
            return false;
        }
    }

    const overlayManager = new OverlayManager();

    // Optimized Turnstile token handling with improved caching and retry logic
    let turnstileToken = null;
    let tokenExpiryTime = 0;
    let tokenGenerationInProgress = false;
    let _resolveToken = null;
    let tokenPromise = new Promise((resolve) => {
        _resolveToken = resolve;
    });
    const MAX_BATCH_RETRIES = 10; // Maximum attempts for batch sending
    const TOKEN_LIFETIME = 240000; // 4 minutes (tokens typically last 5 min, use 4 for safety)

    function setTurnstileToken(token) {
        if (_resolveToken) {
            _resolveToken(token);
            _resolveToken = null;
        }
        turnstileToken = token;
        tokenExpiryTime = Date.now() + TOKEN_LIFETIME;
        console.log('✅ Turnstile token set successfully');
    }

    function isTokenValid() {
        return turnstileToken && Date.now() < tokenExpiryTime;
    }

    function invalidateToken() {
        turnstileToken = null;
        tokenExpiryTime = 0;
        console.log('🗑️ Token invalidated, will force fresh generation');
    }

    async function ensureToken(forceRefresh = false) {
        // Return cached token if still valid and not forcing refresh
        if (isTokenValid() && !forceRefresh) {
            return turnstileToken;
        }

        // Invalidate token if forcing refresh
        if (forceRefresh) invalidateToken();

        // Avoid multiple simultaneous token generations
        if (tokenGenerationInProgress) {
            console.log('🔄 Token generation already in progress, waiting...');
            await Utils.sleep(2000);
            return isTokenValid() ? turnstileToken : null;
        }

        tokenGenerationInProgress = true;

        try {
            console.log('🔄 Token expired or missing, generating new one...');
            const token = await handleCaptchaWithRetry();
            if (token && token.length > 20) {
                setTurnstileToken(token);
                console.log('✅ Token captured and cached successfully');
                return token;
            }

            console.log('⚠️ Invisible Turnstile failed, forcing browser automation...');
            const fallbackToken = await handleCaptchaFallback();
            if (fallbackToken && fallbackToken.length > 20) {
                setTurnstileToken(fallbackToken);
                console.log('✅ Fallback token captured successfully');
                return fallbackToken;
            }

            console.log('❌ All token generation methods failed');
            return null;
        } finally {
            tokenGenerationInProgress = false;
        }
    }

    async function handleCaptchaWithRetry() {
        const startTime = performance.now();

        try {
            const { sitekey, token: preGeneratedToken } = await Utils.obtainSitekeyAndToken();

            if (!sitekey) {
                throw new Error('No valid sitekey found');
            }

            console.log('🔑 Using sitekey:', sitekey);

            if (typeof window !== 'undefined' && window.navigator) {
                console.log(
                    '🧭 UA:',
                    window.navigator.userAgent.substring(0, 50) + '...',
                    'Platform:',
                    window.navigator.platform
                );
            }

            let token = null;

            if (preGeneratedToken && typeof preGeneratedToken === 'string' && preGeneratedToken.length > 20) {
                console.log('♻️ Reusing pre-generated Turnstile token');
                token = preGeneratedToken;
            } else {
                if (isTokenValid()) {
                    console.log('♻️ Using existing cached token (from previous session)');
                    token = turnstileToken;
                } else {
                    console.log('🔐 Generating new token with executeTurnstile...');
                    token = await Utils.executeTurnstile(sitekey, 'paint');
                    if (token) setTurnstileToken(token);
                }
            }

            if (token && typeof token === 'string' && token.length > 20) {
                const elapsed = Math.round(performance.now() - startTime);
                console.log(`✅ Turnstile token generated successfully in ${elapsed}ms`);
                return token;
            } else {
                throw new Error(`Invalid or empty token received - Length: ${token?.length || 0}`);
            }
        } catch (error) {
            const elapsed = Math.round(performance.now() - startTime);
            console.error(`❌ Turnstile token generation failed after ${elapsed}ms:`, error);
            throw error;
        }
    }

    async function handleCaptchaFallback() {
        // Implementation for fallback token generation would go here
        // This is a placeholder for browser automation fallback
        console.log('🔄 Attempting fallback token generation...');
        return null;
    }

    function inject(callback) {
        const script = document.createElement('script');
        script.textContent = `(${callback})();`;
        document.documentElement?.appendChild(script);
        script.remove();
    }

    inject(() => {
        const fetchedBlobQueue = new Map();

        window.addEventListener('message', (event) => {
            const { source, blobID, blobData } = event.data;
            if (source === 'auto-image-overlay' && blobID && blobData) {
                const callback = fetchedBlobQueue.get(blobID);
                if (typeof callback === 'function') {
                    callback(blobData);
                }
                fetchedBlobQueue.delete(blobID);
            }
        });

        const originalFetch = window.fetch;
        window.fetch = async function (...args) {
            const response = await originalFetch.apply(this, args);
            const url = args[0] instanceof Request ? args[0].url : args[0];

            if (typeof url === 'string') {
                if (url.includes('https://backend.wplace.live/s0/pixel/')) {
                    try {
                        const payload = JSON.parse(args[1].body);
                        if (payload.t) {
                            // 📊 Debug log
                            console.log(
                                `🔍✅ Turnstile Token Captured - Type: ${typeof payload.t}, Value: ${
                                    payload.t
                                        ? typeof payload.t === 'string'
                                            ? payload.t.length > 50
                                                ? payload.t.substring(0, 50) + '...'
                                                : payload.t
                                            : JSON.stringify(payload.t)
                                        : 'null/undefined'
                                }, Length: ${payload.t?.length || 0}`
                            );
                            window.postMessage({ source: 'turnstile-capture', token: payload.t }, '*');
                        }
                    } catch (e) {
                        console.error('❌ Error capturing Turnstile token:', e);
                    }
                }

                const contentType = response.headers.get('content-type') || '';
                if (contentType.includes('image/png') && url.includes('.png')) {
                    const cloned = response.clone();
                    return new Promise((resolve) => {
                        const blobUUID = crypto.randomUUID();
                        cloned.blob().then((originalBlob) => {
                            fetchedBlobQueue.set(blobUUID, (processedBlob) => {
                                resolve(
                                    new Response(processedBlob, {
                                        headers: cloned.headers,
                                        status: cloned.status,
                                        statusText: cloned.statusText,
                                    })
                                );
                            });

                            window.postMessage(
                                {
                                    source: 'auto-image-tile',
                                    endpoint: url,
                                    blobID: blobUUID,
                                    blobData: originalBlob,
                                },
                                '*'
                            );
                        });
                    });
                }
            }

            return response;
        };
    });

    window.addEventListener('message', (event) => {
        const { source, endpoint, blobID, blobData, token } = event.data;

        if (source === 'auto-image-tile' && endpoint && blobID && blobData) {
            overlayManager.processAndRespondToTileRequest(event.data);
        }

        if (source === 'turnstile-capture' && token) {
            setTurnstileToken(token);
            if (document.querySelector('#statusText')?.textContent.includes('CAPTCHA')) {
                Utils.showAlert(t('tokenCapturedSuccess'), 'success');
                updateUI('colorsFound', 'success', { count: state.availableColors.length });
            }
        }
    });

    // UTILITY FUNCTIONS
    const Utils = {
        sleep: (ms) => new Promise((r) => setTimeout(r, ms)),

        dynamicSleep: async function (tickAndGetRemainingMs) {
            let remaining = Math.max(0, await tickAndGetRemainingMs());
            while (remaining > 0) {
                const interval = remaining > 5000 ? 2000 : remaining > 1000 ? 500 : 100;
                await this.sleep(Math.min(interval, remaining));
                remaining = Math.max(0, await tickAndGetRemainingMs());
            }
        },

        waitForSelector: async (selector, interval = 200, timeout = 5000) => {
            const start = Date.now();
            while (Date.now() - start < timeout) {
                const el = document.querySelector(selector);
                if (el) return el;
                await Utils.sleep(interval);
            }
            return null;
        },

        msToTimeText(ms) {
            const totalSeconds = Math.ceil(ms / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
            if (minutes > 0) return `${minutes}m ${seconds}s`;
            return `${seconds}s`;
        },

        // Debounced scroll-to-adjust handler for sliders
        createScrollToAdjust: (element, updateCallback, min, max, step = 1) => {
            let debounceTimer = null;

            const handleWheel = (e) => {
                // Only trigger when hovering over the slider
                if (e.target !== element) return;

                e.preventDefault();
                e.stopPropagation();

                // Clear existing debounce timer
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }

                // Debounce the adjustment to make it precise
                debounceTimer = setTimeout(() => {
                    const currentValue = parseInt(element.value) || 0;
                    const delta = e.deltaY > 0 ? -step : step;
                    const newValue = Math.max(min, Math.min(max, currentValue + delta));

                    if (newValue !== currentValue) {
                        element.value = newValue;
                        updateCallback(newValue);
                    }
                }, 50); // 50ms debounce for precise control
            };

            element.addEventListener('wheel', handleWheel, { passive: false });

            // Return cleanup function
            return () => {
                if (debounceTimer) clearTimeout(debounceTimer);
                element.removeEventListener('wheel', handleWheel);
            };
        },

        /**
         * Calculate the range of tile coordinates (in region space) that cover a given image area.
         * @param {number} startRegionX - Base region X
         * @param {number} startRegionY - Base region Y
         * @param {number} startPixelX - Starting pixel X within the region grid
         * @param {number} startPixelY - Starting pixel Y within the region grid
         * @param {number} width - Image width in pixels
         * @param {number} height - Image height in pixels
         * @param {number} tileSize - Size of a tile (default 1000)
         * @returns {{ startTileX: number, startTileY: number, endTileX: number, endTileY: number }}
         */
        calculateTileRange(startRegionX, startRegionY, startPixelX, startPixelY, width, height, tileSize = 1000) {
            const endPixelX = startPixelX + width;
            const endPixelY = startPixelY + height;

            return {
                startTileX: startRegionX + Math.floor(startPixelX / tileSize),
                startTileY: startRegionY + Math.floor(startPixelY / tileSize),
                endTileX: startRegionX + Math.floor((endPixelX - 1) / tileSize),
                endTileY: startRegionY + Math.floor((endPixelY - 1) / tileSize),
            };
        }, // Turnstile Generator Integration - Optimized with widget reuse and proper cleanup
        turnstileLoaded: false,
        _turnstileContainer: null,
        _turnstileOverlay: null,
        _turnstileWidgetId: null,
        _lastSitekey: null,

        async loadTurnstile() {
            // If Turnstile is already present, just resolve.
            if (window.turnstile) {
                this.turnstileLoaded = true;
                return Promise.resolve();
            }

            return new Promise((resolve, reject) => {
                // Avoid adding the script twice
                if (document.querySelector('script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]')) {
                    const checkReady = () => {
                        if (window.turnstile) {
                            this.turnstileLoaded = true;
                            resolve();
                        } else {
                            setTimeout(checkReady, 100);
                        }
                    };
                    return checkReady();
                }

                const script = document.createElement('script');
                script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
                script.async = true;
                script.defer = true;
                script.onload = () => {
                    this.turnstileLoaded = true;
                    console.log('✅ Turnstile script loaded successfully');
                    resolve();
                };
                script.onerror = () => {
                    console.error('❌ Failed to load Turnstile script');
                    reject(new Error('Failed to load Turnstile'));
                };
                document.head.appendChild(script);
            });
        },

        // Create or reuse the turnstile container - completely hidden for token generation
        ensureTurnstileContainer() {
            if (!this._turnstileContainer || !document.body.contains(this._turnstileContainer)) {
                // Clean up old container if it exists
                if (this._turnstileContainer) {
                    this._turnstileContainer.remove();
                }

                this._turnstileContainer = document.createElement('div');
                this._turnstileContainer.className = 'wplace-turnstile-hidden';
                this._turnstileContainer.setAttribute('aria-hidden', 'true');
                this._turnstileContainer.id = 'turnstile-widget-container';
                document.body.appendChild(this._turnstileContainer);
            }
            return this._turnstileContainer;
        },

        // Interactive overlay container for visible widgets when needed
        ensureTurnstileOverlayContainer() {
            if (this._turnstileOverlay && document.body.contains(this._turnstileOverlay)) {
                return this._turnstileOverlay;
            }

            const overlay = document.createElement('div');
            overlay.id = 'turnstile-overlay-container';
            overlay.className = 'wplace-turnstile-overlay wplace-overlay-hidden';

            const title = document.createElement('div');
            title.textContent = t('turnstileInstructions');
            title.className = 'wplace-turnstile-title';

            const host = document.createElement('div');
            host.id = 'turnstile-overlay-host';
            host.className = 'wplace-turnstile-host';

            const hideBtn = document.createElement('button');
            hideBtn.textContent = t('hideTurnstileBtn');
            hideBtn.className = 'wplace-turnstile-hide-btn';
            hideBtn.addEventListener('click', () => overlay.remove());

            overlay.appendChild(title);
            overlay.appendChild(host);
            overlay.appendChild(hideBtn);
            document.body.appendChild(overlay);

            this._turnstileOverlay = overlay;
            return overlay;
        },

        async executeTurnstile(sitekey, action = 'paint') {
            await this.loadTurnstile();

            // Try reusing existing widget first if sitekey matches
            if (this._turnstileWidgetId && this._lastSitekey === sitekey && window.turnstile?.execute) {
                try {
                    console.log('🔄 Reusing existing Turnstile widget...');
                    const token = await Promise.race([
                        window.turnstile.execute(this._turnstileWidgetId, { action }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Execute timeout')), 15000)),
                    ]);
                    if (token && token.length > 20) {
                        console.log('✅ Token generated via widget reuse');
                        return token;
                    }
                } catch (error) {
                    console.log('� Widget reuse failed, will create a fresh widget:', error.message);
                }
            }

            // Try invisible widget first
            const invisibleToken = await this.createTurnstileWidget(sitekey, action);
            if (invisibleToken && invisibleToken.length > 20) {
                return invisibleToken;
            }

            console.log('� Falling back to interactive Turnstile (visible).');
            return await this.createTurnstileWidgetInteractive(sitekey, action);
        },

        async createTurnstileWidget(sitekey, action) {
            return new Promise((resolve) => {
                try {
                    // Force cleanup of any existing widget
                    if (this._turnstileWidgetId && window.turnstile?.remove) {
                        try {
                            window.turnstile.remove(this._turnstileWidgetId);
                            console.log('🧹 Cleaned up existing Turnstile widget');
                        } catch (e) {
                            console.warn('⚠️ Widget cleanup warning:', e.message);
                        }
                    }

                    const container = this.ensureTurnstileContainer();
                    container.innerHTML = '';

                    // Verify Turnstile is available
                    if (!window.turnstile?.render) {
                        console.error('❌ Turnstile not available for rendering');
                        resolve(null);
                        return;
                    }

                    console.log('🔧 Creating invisible Turnstile widget...');
                    const widgetId = window.turnstile.render(container, {
                        sitekey,
                        action,
                        size: 'invisible',
                        retry: 'auto',
                        'retry-interval': 8000,
                        callback: (token) => {
                            console.log('✅ Invisible Turnstile callback');
                            resolve(token);
                        },
                        'error-callback': () => resolve(null),
                        'timeout-callback': () => resolve(null),
                    });

                    this._turnstileWidgetId = widgetId;
                    this._lastSitekey = sitekey;

                    if (!widgetId) {
                        return resolve(null);
                    }

                    // Execute the widget and race with timeout
                    Promise.race([
                        window.turnstile.execute(widgetId, { action }),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Invisible execute timeout')), 12000)
                        ),
                    ])
                        .then(resolve)
                        .catch(() => resolve(null));
                } catch (e) {
                    console.error('❌ Invisible Turnstile creation failed:', e);
                    resolve(null);
                }
            });
        },

        async createTurnstileWidgetInteractive(sitekey, action) {
            // Create a visible widget that users can interact with if needed
            console.log('🔄 Creating interactive Turnstile widget (visible)');

            return new Promise((resolve) => {
                try {
                    // Force cleanup of any existing widget
                    if (this._turnstileWidgetId && window.turnstile?.remove) {
                        try {
                            window.turnstile.remove(this._turnstileWidgetId);
                        } catch (e) {
                            console.warn('⚠️ Widget cleanup warning:', e.message);
                        }
                    }

                    const overlay = this.ensureTurnstileOverlayContainer();
                    overlay.classList.remove('wplace-overlay-hidden');
                    overlay.style.display = 'block';

                    const host = overlay.querySelector('#turnstile-overlay-host');
                    host.innerHTML = '';

                    // Set a timeout for interactive mode
                    const timeout = setTimeout(() => {
                        console.warn('⏰ Interactive Turnstile widget timeout');
                        overlay.classList.add('wplace-overlay-hidden');
                        overlay.style.display = 'none';
                        resolve(null);
                    }, 60000); // 60 seconds for user interaction

                    const widgetId = window.turnstile.render(host, {
                        sitekey,
                        action,
                        size: 'normal',
                        theme: 'light',
                        callback: (token) => {
                            clearTimeout(timeout);
                            overlay.classList.add('wplace-overlay-hidden');
                            overlay.style.display = 'none';
                            console.log('✅ Interactive Turnstile completed successfully');

                            if (typeof token === 'string' && token.length > 20) {
                                resolve(token);
                            } else {
                                console.warn('❌ Invalid token from interactive widget');
                                resolve(null);
                            }
                        },
                        'error-callback': (error) => {
                            clearTimeout(timeout);
                            overlay.classList.add('wplace-overlay-hidden');
                            overlay.style.display = 'none';
                            console.warn('❌ Interactive Turnstile error:', error);
                            resolve(null);
                        },
                    });

                    this._turnstileWidgetId = widgetId;
                    this._lastSitekey = sitekey;

                    if (!widgetId) {
                        clearTimeout(timeout);
                        overlay.classList.add('wplace-overlay-hidden');
                        overlay.style.display = 'none';
                        console.warn('❌ Failed to create interactive Turnstile widget');
                        resolve(null);
                    } else {
                        console.log('✅ Interactive Turnstile widget created, waiting for user interaction...');
                    }
                } catch (e) {
                    console.error('❌ Interactive Turnstile creation failed:', e);
                    resolve(null);
                }
            });
        },

        // Cleanup method for when the script is disabled/reloaded
        cleanupTurnstile() {
            if (this._turnstileWidgetId && window.turnstile?.remove) {
                try {
                    window.turnstile.remove(this._turnstileWidgetId);
                } catch (e) {
                    console.warn('Failed to cleanup Turnstile widget:', e);
                }
            }

            if (this._turnstileContainer && document.body.contains(this._turnstileContainer)) {
                this._turnstileContainer.remove();
            }

            if (this._turnstileOverlay && document.body.contains(this._turnstileOverlay)) {
                this._turnstileOverlay.remove();
            }

            this._turnstileWidgetId = null;
            this._turnstileContainer = null;
            this._turnstileOverlay = null;
            this._lastSitekey = null;
        },

        async obtainSitekeyAndToken(fallback = '0x4AAAAAABpqJe8FO0N84q0F') {
            // Cache sitekey to avoid repeated DOM queries
            if (this._cachedSitekey) {
                console.log('🔍 Using cached sitekey:', this._cachedSitekey);

                return isTokenValid()
                    ? {
                          sitekey: this._cachedSitekey,
                          token: turnstileToken,
                      }
                    : { sitekey: this._cachedSitekey, token: null };
            }

            // List of potential sitekeys to try
            const potentialSitekeys = [
                '0x4AAAAAABpqJe8FO0N84q0F', // WPlace common sitekey
                '0x4AAAAAAAJ7xjKAp6Mt_7zw', // Alternative WPlace sitekey
                '0x4AAAAAADm5QWx6Ov2LNF2g', // Another common sitekey
            ];
            const trySitekey = async (sitekey, source) => {
                if (!sitekey || sitekey.length < 10) return null;

                console.log(`🔍 Testing sitekey from ${source}:`, sitekey);
                const token = await this.executeTurnstile(sitekey);

                if (token && token.length >= 20) {
                    console.log(`✅ Valid token generated from ${source} sitekey`);
                    setTurnstileToken(token);
                    this._cachedSitekey = sitekey;
                    return { sitekey, token };
                } else {
                    console.log(`❌ Failed to get token from ${source} sitekey`);
                    return null;
                }
            };

            try {
                // 1️⃣ data-sitekey attribute
                const sitekeySel = document.querySelector('[data-sitekey]');
                if (sitekeySel) {
                    const sitekey = sitekeySel.getAttribute('data-sitekey');
                    const result = await trySitekey(sitekey, 'data attribute');
                    if (result) {
                        return result;
                    }
                }

                // 2️⃣ Turnstile element
                const turnstileEl = document.querySelector('.cf-turnstile');
                if (turnstileEl?.dataset?.sitekey) {
                    const sitekey = turnstileEl.dataset.sitekey;
                    const result = await trySitekey(sitekey, 'turnstile element');
                    if (result) {
                        return result;
                    }
                }

                // 3️⃣ Meta tags
                const metaTags = document.querySelectorAll('meta[name*="turnstile"], meta[property*="turnstile"]');
                for (const meta of metaTags) {
                    const content = meta.getAttribute('content');
                    const result = await trySitekey(content, 'meta tag');
                    if (result) {
                        return result;
                    }
                }

                // 4️⃣ Global variable
                if (window.__TURNSTILE_SITEKEY) {
                    const result = await trySitekey(window.__TURNSTILE_SITEKEY, 'global variable');
                    if (result) {
                        return result;
                    }
                }

                // 5️⃣ Script tags
                const scripts = document.querySelectorAll('script');
                for (const script of scripts) {
                    const content = script.textContent || script.innerHTML;
                    const match = content.match(/(?:sitekey|data-sitekey)['"\s[\]:=(]*['"]?([0-9a-zA-Z_-]{20,})['"]?/i);
                    if (match && match[1]) {
                        const extracted = match[1].replace(/['"]/g, '');
                        const result = await trySitekey(extracted, 'script content');
                        if (result) {
                            return result;
                        }
                    }
                }

                // 6️⃣ Known potential sitekeys
                console.log('🔍 Testing known potential sitekeys...');
                for (const testSitekey of potentialSitekeys) {
                    const result = await trySitekey(testSitekey, 'known list');
                    if (result) {
                        return result;
                    }
                }
            } catch (error) {
                console.warn('⚠️ Error during sitekey detection:', error);
            }

            // 7️⃣ Fallback
            console.log('🔧 Trying fallback sitekey:', fallback);
            const fallbackResult = await trySitekey(fallback, 'fallback');
            if (fallbackResult) {
                return fallbackResult;
            }

            console.error('❌ No working sitekey or token found.');
            return { sitekey: null, token: null };
        },

        createElement: (tag, props = {}, children = []) => {
            const element = document.createElement(tag);

            Object.entries(props).forEach(([key, value]) => {
                if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else if (key === 'className') {
                    element.className = value;
                } else if (key === 'innerHTML') {
                    element.innerHTML = value;
                } else {
                    element.setAttribute(key, value);
                }
            });

            if (typeof children === 'string') {
                element.textContent = children;
            } else if (Array.isArray(children)) {
                children.forEach((child) => {
                    if (typeof child === 'string') {
                        element.appendChild(document.createTextNode(child));
                    } else {
                        element.appendChild(child);
                    }
                });
            }

            return element;
        },

        createButton: (id, text, icon, onClick, style = CONFIG.CSS_CLASSES.BUTTON_PRIMARY) => {
            const button = Utils.createElement('button', {
                id: id,
                style: style,
                innerHTML: `${icon ? `<i class="${icon}"></i>` : ''}<span>${text}</span>`,
            });
            if (onClick) button.addEventListener('click', onClick);
            return button;
        },

        showAlert: (message, type = 'info') => {
            const alertDiv = document.createElement('div');
            alertDiv.className = `wplace-alert-base wplace-alert-${type}`;

            alertDiv.textContent = message;
            document.body.appendChild(alertDiv);

            setTimeout(() => {
                alertDiv.style.animation = 'slide-down 0.3s ease-out reverse';
                setTimeout(() => {
                    document.body.removeChild(alertDiv);
                }, 300);
            }, 4000);
        },

        colorDistance: (a, b) =>
            Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2)),
        _labCache: new Map(), // key: (r<<16)|(g<<8)|b  value: [L,a,b]
        _rgbToLab: (r, g, b) => {
            // sRGB -> linear
            const srgbToLinear = (v) => {
                v /= 255;
                return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            };
            const rl = srgbToLinear(r);
            const gl = srgbToLinear(g);
            const bl = srgbToLinear(b);
            let X = rl * 0.4124 + gl * 0.3576 + bl * 0.1805;
            let Y = rl * 0.2126 + gl * 0.7152 + bl * 0.0722;
            let Z = rl * 0.0193 + gl * 0.1192 + bl * 0.9505;
            X /= 0.95047;
            Y /= 1.0;
            Z /= 1.08883;
            const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
            const fX = f(X),
                fY = f(Y),
                fZ = f(Z);
            const L = 116 * fY - 16;
            const a = 500 * (fX - fY);
            const b2 = 200 * (fY - fZ);
            return [L, a, b2];
        },
        _lab: (r, g, b) => {
            const key = (r << 16) | (g << 8) | b;
            let v = Utils._labCache.get(key);
            if (!v) {
                v = Utils._rgbToLab(r, g, b);
                Utils._labCache.set(key, v);
            }
            return v;
        },
        findClosestPaletteColor: (r, g, b, palette) => {
            // Use provided palette or derive from COLOR_MAP
            if (!palette || palette.length === 0) {
                palette = Object.values(CONFIG.COLOR_MAP)
                    .filter((c) => c.rgb)
                    .map((c) => [c.rgb.r, c.rgb.g, c.rgb.b]);
            }
            if (state.colorMatchingAlgorithm === 'legacy') {
                let menorDist = Infinity;
                let cor = [0, 0, 0];
                for (let i = 0; i < palette.length; i++) {
                    const [pr, pg, pb] = palette[i];
                    const rmean = (pr + r) / 2;
                    const rdiff = pr - r;
                    const gdiff = pg - g;
                    const bdiff = pb - b;
                    const dist = Math.sqrt(
                        (((512 + rmean) * rdiff * rdiff) >> 8) +
                            4 * gdiff * gdiff +
                            (((767 - rmean) * bdiff * bdiff) >> 8)
                    );
                    if (dist < menorDist) {
                        menorDist = dist;
                        cor = [pr, pg, pb];
                    }
                }
                return cor;
            }
            // LAB algorithm
            const [Lt, at, bt] = Utils._lab(r, g, b);
            const targetChroma = Math.sqrt(at * at + bt * bt);
            let best = null;
            let bestDist = Infinity;
            for (let i = 0; i < palette.length; i++) {
                const [pr, pg, pb] = palette[i];
                const [Lp, ap, bp] = Utils._lab(pr, pg, pb);
                const dL = Lt - Lp;
                const da = at - ap;
                const db = bt - bp;
                let dist = dL * dL + da * da + db * db;
                if (state.enableChromaPenalty && targetChroma > 20) {
                    const candChroma = Math.sqrt(ap * ap + bp * bp);
                    if (candChroma < targetChroma) {
                        const chromaDiff = targetChroma - candChroma;
                        dist += chromaDiff * chromaDiff * state.chromaPenaltyWeight;
                    }
                }
                if (dist < bestDist) {
                    bestDist = dist;
                    best = palette[i];
                    if (bestDist === 0) break;
                }
            }
            return best || [0, 0, 0];
        },

        isWhitePixel: (r, g, b) => {
            const wt = state.customWhiteThreshold || CONFIG.WHITE_THRESHOLD;
            return r >= wt && g >= wt && b >= wt;
        },

        resolveColor(targetRgb, availableColors, exactMatch = false) {
            if (!availableColors || availableColors.length === 0) {
                return {
                    id: null,
                    rgb: targetRgb,
                };
            }

            const cacheKey = `${targetRgb[0]},${targetRgb[1]},${targetRgb[2]}|${
                state.colorMatchingAlgorithm
            }|${state.enableChromaPenalty ? 'c' : 'nc'}|${state.chromaPenaltyWeight}|${
                exactMatch ? 'exact' : 'closest'
            }`;

            if (colorCache.has(cacheKey)) return colorCache.get(cacheKey);

            // Check for an exact color match in availableColors.
            // If found, return the matched color with its ID.
            // If not found, return the target color with null ID.
            // Cache the result for future lookups.
            if (exactMatch) {
                const match = availableColors.find(
                    (c) => c.rgb[0] === targetRgb[0] && c.rgb[1] === targetRgb[1] && c.rgb[2] === targetRgb[2]
                );
                const result = match ? { id: match.id, rgb: [...match.rgb] } : { id: null, rgb: targetRgb };
                colorCache.set(cacheKey, result);
                return result;
            }

            // check for white using threshold
            const whiteThreshold = state.customWhiteThreshold || CONFIG.WHITE_THRESHOLD;
            if (targetRgb[0] >= whiteThreshold && targetRgb[1] >= whiteThreshold && targetRgb[2] >= whiteThreshold) {
                const whiteEntry = availableColors.find(
                    (c) => c.rgb[0] >= whiteThreshold && c.rgb[1] >= whiteThreshold && c.rgb[2] >= whiteThreshold
                );
                if (whiteEntry) {
                    const result = { id: whiteEntry.id, rgb: [...whiteEntry.rgb] };
                    colorCache.set(cacheKey, result);
                    return result;
                }
            }

            // find nearest color
            let bestId = availableColors[0].id;
            let bestRgb = [...availableColors[0].rgb];
            let bestScore = Infinity;

            if (state.colorMatchingAlgorithm === 'legacy') {
                for (let i = 0; i < availableColors.length; i++) {
                    const c = availableColors[i];
                    const [r, g, b] = c.rgb;
                    const rmean = (r + targetRgb[0]) / 2;
                    const rdiff = r - targetRgb[0];
                    const gdiff = g - targetRgb[1];
                    const bdiff = b - targetRgb[2];
                    const dist = Math.sqrt(
                        (((512 + rmean) * rdiff * rdiff) >> 8) +
                            4 * gdiff * gdiff +
                            (((767 - rmean) * bdiff * bdiff) >> 8)
                    );
                    if (dist < bestScore) {
                        bestScore = dist;
                        bestId = c.id;
                        bestRgb = [...c.rgb];
                        if (dist === 0) break;
                    }
                }
            } else {
                const [Lt, at, bt] = Utils._lab(targetRgb[0], targetRgb[1], targetRgb[2]);
                const targetChroma = Math.sqrt(at * at + bt * bt);
                const penaltyWeight = state.enableChromaPenalty ? state.chromaPenaltyWeight || 0.15 : 0;

                for (let i = 0; i < availableColors.length; i++) {
                    const c = availableColors[i];
                    const [r, g, b] = c.rgb;
                    const [L2, a2, b2] = Utils._lab(r, g, b);
                    const dL = Lt - L2,
                        da = at - a2,
                        db = bt - b2;
                    let dist = dL * dL + da * da + db * db;

                    if (penaltyWeight > 0 && targetChroma > 20) {
                        const candChroma = Math.sqrt(a2 * a2 + b2 * b2);
                        if (candChroma < targetChroma) {
                            const cd = targetChroma - candChroma;
                            dist += cd * cd * penaltyWeight;
                        }
                    }

                    if (dist < bestScore) {
                        bestScore = dist;
                        bestId = c.id;
                        bestRgb = [...c.rgb];
                        if (dist === 0) break;
                    }
                }
            }

            const result = { id: bestId, rgb: bestRgb };
            colorCache.set(cacheKey, result);

            // limit the size of the cache
            if (colorCache.size > 15000) {
                const firstKey = colorCache.keys().next().value;
                colorCache.delete(firstKey);
            }

            return result;
        },

        createImageUploader: () =>
            new Promise((resolve) => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/png,image/jpeg';
                input.onchange = () => {
                    const fr = new FileReader();
                    fr.onload = () => resolve(fr.result);
                    fr.readAsDataURL(input.files[0]);
                };
                input.click();
            }),

        extractAvailableColors: () => {
            const colorElements = document.querySelectorAll('.tooltip button[id^="color-"]');
            if (colorElements.length === 0) {
                console.log('❌ No color elements found on page');
                return null;
            }
            // Separate available and unavailable colors
            const availableColors = [];
            const unavailableColors = [];

            Array.from(colorElements).forEach((el) => {
                const id = Number.parseInt(el.id.replace('color-', ''));
                if (id === 0) return; // Skip transparent color

                const rgbStr = el.style.backgroundColor.match(/\d+/g);
                if (!rgbStr || rgbStr.length < 3) {
                    console.warn(`Skipping color element ${el.id} — cannot parse RGB`);
                    return;
                }
                const rgb = rgbStr.map(Number);

                // Find color name from COLOR_MAP
                const colorInfo = Object.values(CONFIG.COLOR_MAP).find((color) => color.id === id);
                const name = colorInfo ? colorInfo.name : `Unknown Color ${id}`;

                const colorData = { id, name, rgb };

                // Check if color is available (no SVG overlay means available)
                if (!el.querySelector('svg')) {
                    availableColors.push(colorData);
                } else {
                    unavailableColors.push(colorData);
                }
            });

            // Console log detailed color information
            console.log('=== CAPTURED COLORS STATUS ===');
            console.log(`Total available colors: ${availableColors.length}`);
            console.log(`Total unavailable colors: ${unavailableColors.length}`);
            console.log(`Total colors scanned: ${availableColors.length + unavailableColors.length}`);

            if (availableColors.length > 0) {
                console.log('\n--- AVAILABLE COLORS ---');
                availableColors.forEach((color, index) => {
                    console.log(
                        `${index + 1}. ID: ${color.id}, Name: "${color.name}", RGB: (${color.rgb[0]}, ${
                            color.rgb[1]
                        }, ${color.rgb[2]})`
                    );
                });
            }

            if (unavailableColors.length > 0) {
                console.log('\n--- UNAVAILABLE COLORS ---');
                unavailableColors.forEach((color, index) => {
                    console.log(
                        `${index + 1}. ID: ${color.id}, Name: "${color.name}", RGB: (${color.rgb[0]}, ${
                            color.rgb[1]
                        }, ${color.rgb[2]}) [LOCKED]`
                    );
                });
            }

            console.log('=== END COLOR STATUS ===');

            return availableColors;
        },

        formatTime: (ms) => {
            const seconds = Math.floor((ms / 1000) % 60);
            const minutes = Math.floor((ms / (1000 * 60)) % 60);
            const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
            const days = Math.floor(ms / (1000 * 60 * 60 * 24));

            let result = '';
            if (days > 0) result += `${days}d `;
            if (hours > 0 || days > 0) result += `${hours}h `;
            if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
            result += `${seconds}s`;

            return result;
        },

        calculateEstimatedTime: (remainingPixels, charges, cooldown) => {
            if (remainingPixels <= 0) return 0;

            const paintingSpeedDelay = state.paintingSpeed > 0 ? 1000 / state.paintingSpeed : 1000;
            const timeFromSpeed = remainingPixels * paintingSpeedDelay;

            const cyclesNeeded = Math.ceil(remainingPixels / Math.max(charges, 1));
            const timeFromCharges = cyclesNeeded * cooldown;

            return timeFromSpeed + timeFromCharges; // combine instead of taking max
        },

        // --- Painted pixel tracking helpers ---
        initializePaintedMap: (width, height) => {
            if (!state.paintedMap || state.paintedMap.length !== height) {
                state.paintedMap = Array(height)
                    .fill()
                    .map(() => Array(width).fill(false));
                console.log(`📋 Initialized painted map: ${width}x${height}`);
            }
        },

        markPixelPainted: (x, y, regionX = 0, regionY = 0) => {
            const actualX = x + regionX;
            const actualY = y + regionY;

            if (
                state.paintedMap &&
                state.paintedMap[actualY] &&
                actualX >= 0 &&
                actualX < state.paintedMap[actualY].length
            ) {
                state.paintedMap[actualY][actualX] = true;
            }
        },

        isPixelPainted: (x, y, regionX = 0, regionY = 0) => {
            const actualX = x + regionX;
            const actualY = y + regionY;

            if (
                state.paintedMap &&
                state.paintedMap[actualY] &&
                actualX >= 0 &&
                actualX < state.paintedMap[actualY].length
            ) {
                return state.paintedMap[actualY][actualX];
            }
            return false;
        },

        // Smart save - only save if significant changes
        shouldAutoSave: () => {
            const now = Date.now();
            const pixelsSinceLastSave = state.paintedPixels - state._lastSavePixelCount;
            const timeSinceLastSave = now - state._lastSaveTime;

            // Save conditions:
            // 1. Every 25 pixels (reduced from 50 for more frequent saves)
            // 2. At least 30 seconds since last save (prevent spam)
            // 3. Not already saving
            return !state._saveInProgress && pixelsSinceLastSave >= 25 && timeSinceLastSave >= 30000;
        },

        performSmartSave: () => {
            if (!Utils.shouldAutoSave()) return false;

            state._saveInProgress = true;
            const success = Utils.saveProgress();

            if (success) {
                state._lastSavePixelCount = state.paintedPixels;
                state._lastSaveTime = Date.now();
                console.log(`💾 Auto-saved at ${state.paintedPixels} pixels`);
            }

            state._saveInProgress = false;
            return success;
        },

        // --- Data management helpers ---

        // Base64 compression helpers for efficient storage
        packPaintedMapToBase64: (paintedMap, width, height) => {
            if (!paintedMap || !width || !height) return null;
            const totalBits = width * height;
            const byteLen = Math.ceil(totalBits / 8);
            const bytes = new Uint8Array(byteLen);
            let bitIndex = 0;
            for (let y = 0; y < height; y++) {
                const row = paintedMap[y];
                for (let x = 0; x < width; x++) {
                    const bit = row && row[x] ? 1 : 0;
                    const b = bitIndex >> 3; // byte index
                    const o = bitIndex & 7; // bit offset
                    if (bit) bytes[b] |= 1 << o;
                    bitIndex++;
                }
            }
            let binary = '';
            const chunk = 0x8000;
            for (let i = 0; i < bytes.length; i += chunk) {
                binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + chunk, bytes.length)));
            }
            return btoa(binary);
        },

        unpackPaintedMapFromBase64: (base64, width, height) => {
            if (!base64 || !width || !height) return null;
            const binary = atob(base64);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const map = Array(height)
                .fill()
                .map(() => Array(width).fill(false));
            let bitIndex = 0;
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    const b = bitIndex >> 3;
                    const o = bitIndex & 7;
                    map[y][x] = ((bytes[b] >> o) & 1) === 1;
                    bitIndex++;
                }
            }
            return map;
        },

        buildPaintedMapPacked() {
            if (state.paintedMap && state.imageData) {
                const data = Utils.packPaintedMapToBase64(
                    state.paintedMap,
                    state.imageData.width,
                    state.imageData.height
                );
                if (data) {
                    return {
                        width: state.imageData.width,
                        height: state.imageData.height,
                        data: data,
                    };
                }
            }
            return null;
        },

        buildProgressData() {
            return {
                timestamp: Date.now(),
                version: '2.2',
                state: {
                    totalPixels: state.totalPixels,
                    paintedPixels: state.paintedPixels,
                    lastPosition: state.lastPosition,
                    startPosition: state.startPosition,
                    region: state.region,
                    imageLoaded: state.imageLoaded,
                    colorsChecked: state.colorsChecked,
                    coordinateMode: state.coordinateMode,
                    coordinateDirection: state.coordinateDirection,
                    coordinateSnake: state.coordinateSnake,
                    blockWidth: state.blockWidth,
                    blockHeight: state.blockHeight,
                    availableColors: state.availableColors,
                },
                imageData: state.imageData
                    ? {
                          width: state.imageData.width,
                          height: state.imageData.height,
                          pixels: Array.from(state.imageData.pixels),
                          totalPixels: state.imageData.totalPixels,
                      }
                    : null,
                paintedMapPacked: Utils.buildPaintedMapPacked(),
            };
        },

        saveProgress: () => {
            try {
                const progressData = Utils.buildProgressData(state);

                localStorage.setItem('wplace-bot-progress', JSON.stringify(progressData));
                return true;
            } catch (error) {
                console.error('Error saving progress:', error);
                return false;
            }
        },

        loadProgress: () => {
            try {
                const saved = localStorage.getItem('wplace-bot-progress');
                if (!saved) return null;
                return JSON.parse(saved);
            } catch (error) {
                console.error('Error loading progress:', error);
                return null;
            }
        },

        clearProgress: () => {
            try {
                localStorage.removeItem('wplace-bot-progress');
                // Also clear painted map from memory
                state.paintedMap = null;
                state._lastSavePixelCount = 0;
                state._lastSaveTime = 0;
                // Reset coordinate generation settings to their default values
                state.coordinateMode = CONFIG.COORDINATE_MODE;
                state.coordinateDirection = CONFIG.COORDINATE_DIRECTION;
                state.coordinateSnake = CONFIG.COORDINATE_SNAKE;
                state.blockWidth = CONFIG.COORDINATE_BLOCK_WIDTH;
                state.blockHeight = CONFIG.COORDINATE_BLOCK_HEIGHT;
                console.log('📋 Progress and painted map cleared');
                return true;
            } catch (error) {
                console.error('Error clearing progress:', error);
                return false;
            }
        },

        restoreProgress: (savedData) => {
            try {
                Object.assign(state, savedData.state);

                // Restore coordinate generation settings
                if (savedData.state.coordinateMode) {
                    state.coordinateMode = savedData.state.coordinateMode;
                }
                if (savedData.state.coordinateDirection) {
                    state.coordinateDirection = savedData.state.coordinateDirection;
                }
                if (savedData.state.coordinateSnake !== undefined) {
                    state.coordinateSnake = savedData.state.coordinateSnake;
                }
                if (savedData.state.blockWidth) {
                    state.blockWidth = savedData.state.blockWidth;
                }
                if (savedData.state.blockHeight) {
                    state.blockHeight = savedData.state.blockHeight;
                }

                if (savedData.imageData) {
                    state.imageData = {
                        ...savedData.imageData,
                        pixels: new Uint8ClampedArray(savedData.imageData.pixels),
                    };

                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = state.imageData.width;
                        canvas.height = state.imageData.height;
                        const ctx = canvas.getContext('2d');
                        const imageData = new ImageData(
                            state.imageData.pixels,
                            state.imageData.width,
                            state.imageData.height
                        );
                        ctx.putImageData(imageData, 0, 0);
                        const proc = new ImageProcessor('');
                        proc.img = canvas;
                        proc.canvas = canvas;
                        proc.ctx = ctx;
                        state.imageData.processor = proc;
                    } catch (e) {
                        console.warn('Could not rebuild processor from saved image data:', e);
                    }
                }

                // Prefer packed form if available; fallback to legacy paintedMap array for backward compatibility
                if (savedData.paintedMapPacked && savedData.paintedMapPacked.data) {
                    const { width, height, data } = savedData.paintedMapPacked;
                    state.paintedMap = Utils.unpackPaintedMapFromBase64(data, width, height);
                } else if (savedData.paintedMap) {
                    state.paintedMap = savedData.paintedMap.map((row) => Array.from(row));
                }

                return true;
            } catch (error) {
                console.error('Error restoring progress:', error);
                return false;
            }
        },

        // Helper function to restore overlay from loaded data
        restoreOverlayFromData: async () => {
            if (!state.imageLoaded || !state.imageData || !state.startPosition || !state.region) {
                return false;
            }

            try {
                // Recreate ImageBitmap from loaded pixel data
                const imageData = new ImageData(state.imageData.pixels, state.imageData.width, state.imageData.height);

                const canvas = new OffscreenCanvas(state.imageData.width, state.imageData.height);
                const ctx = canvas.getContext('2d');
                ctx.putImageData(imageData, 0, 0);
                const imageBitmap = await canvas.transferToImageBitmap();

                // Set up overlay with restored data
                await overlayManager.setImage(imageBitmap);
                await overlayManager.setPosition(state.startPosition, state.region);
                overlayManager.enable();

                // Update overlay button state
                const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
                if (toggleOverlayBtn) {
                    toggleOverlayBtn.disabled = false;
                    toggleOverlayBtn.classList.add('active');
                }

                console.log('Overlay restored from data');
                return true;
            } catch (error) {
                console.error('Failed to restore overlay from data:', error);
                return false;
            }
        },

        updateCoordinateUI({ mode, directionControls, snakeControls, blockControls }) {
            const isLinear = mode === 'rows' || mode === 'columns';
            const isBlock = mode === 'blocks' || mode === 'shuffle-blocks';

            if (directionControls) directionControls.style.display = isLinear ? 'block' : 'none';
            if (snakeControls) snakeControls.style.display = isLinear ? 'block' : 'none';
            if (blockControls) blockControls.style.display = isBlock ? 'block' : 'none';
        },
    };

    // IMAGE PROCESSOR CLASS
    class ImageProcessor {
        constructor(imageSrc) {
            this.imageSrc = imageSrc;
            this.img = null;
            this.canvas = null;
            this.ctx = null;
        }

        async load() {
            return new Promise((resolve, reject) => {
                this.img = new Image();
                this.img.crossOrigin = 'anonymous';
                this.img.onload = () => {
                    this.canvas = document.createElement('canvas');
                    this.ctx = this.canvas.getContext('2d');
                    this.canvas.width = this.img.width;
                    this.canvas.height = this.img.height;
                    this.ctx.drawImage(this.img, 0, 0);
                    resolve();
                };
                this.img.onerror = reject;
                this.img.src = this.imageSrc;
            });
        }

        getDimensions() {
            return {
                width: this.canvas.width,
                height: this.canvas.height,
            };
        }

        getPixelData() {
            return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
        }

        resize(newWidth, newHeight) {
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');

            tempCanvas.width = newWidth;
            tempCanvas.height = newHeight;

            tempCtx.imageSmoothingEnabled = false;
            tempCtx.drawImage(this.canvas, 0, 0, newWidth, newHeight);

            this.canvas.width = newWidth;
            this.canvas.height = newHeight;
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.drawImage(tempCanvas, 0, 0);

            return this.ctx.getImageData(0, 0, newWidth, newHeight).data;
        }

        generatePreview(width, height) {
            const previewCanvas = document.createElement('canvas');
            const previewCtx = previewCanvas.getContext('2d');

            previewCanvas.width = width;
            previewCanvas.height = height;

            previewCtx.imageSmoothingEnabled = false;
            previewCtx.drawImage(this.img, 0, 0, width, height);

            return previewCanvas.toDataURL();
        }
    }

    // WPLACE API SERVICE
    const WPlaceService = {
        async paintPixelInRegion(regionX, regionY, pixelX, pixelY, color) {
            try {
                await ensureToken();
                if (!turnstileToken) return 'token_error';
                const payload = {
                    coords: [pixelX, pixelY],
                    colors: [color],
                    t: turnstileToken,
                };
                const res = await fetch(`https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                });
                if (res.status === 403) {
                    console.error('❌ 403 Forbidden. Turnstile token might be invalid or expired.');
                    turnstileToken = null;
                    tokenPromise = new Promise((resolve) => {
                        _resolveToken = resolve;
                    });
                    return 'token_error';
                }
                const data = await res.json();
                return data?.painted === 1;
            } catch (e) {
                console.error('Paint request failed:', e);
                return false;
            }
        },

        async getCharges() {
            const defaultResult = {
                charges: 0,
                max: 1,
                cooldown: CONFIG.COOLDOWN_DEFAULT,
            };

            try {
                const res = await fetch('https://backend.wplace.live/me', {
                    credentials: 'include',
                });

                if (!res.ok) {
                    console.error(`Failed to get charges: HTTP ${res.status}`);
                    return defaultResult;
                }

                const data = await res.json();

                return {
                    charges: data.charges?.count ?? 0,
                    max: data.charges?.max ?? 1,
                    cooldown: data.charges?.cooldownMs ?? CONFIG.COOLDOWN_DEFAULT,
                };
            } catch (e) {
                console.error('Failed to get charges:', e);
                return defaultResult;
            }
        },
    };

    // COLOR MATCHING FUNCTION - Optimized with caching
    const colorCache = new Map();

    // UI UPDATE FUNCTIONS (declared early to avoid reference errors)
    let updateUI = () => {};
    let updateStats = () => {};
    let updateDataButtons = () => {};

    async function handleCaptcha() {
        const startTime = performance.now();

        // Check user's token source preference
        if (state.tokenSource === 'manual') {
            console.log('🎯 Manual token source selected - using pixel placement automation');
            return await handleCaptchaFallback();
        }

        // Generator mode (pure) or Hybrid mode - try generator first
        try {
            // Use optimized token generation with automatic sitekey detection
            const { sitekey, token: preGeneratedToken } = await Utils.obtainSitekeyAndToken();

            if (!sitekey) {
                throw new Error('No valid sitekey found');
            }

            console.log('🔑 Generating Turnstile token for sitekey:', sitekey);
            console.log('🧭 UA:', navigator.userAgent.substring(0, 50) + '...', 'Platform:', navigator.platform);

            // Add additional checks before token generation
            if (!window.turnstile) {
                await Utils.loadTurnstile();
            }

            let token = null;

            // ✅ Reuse pre-generated token if available and valid
            if (preGeneratedToken && typeof preGeneratedToken === 'string' && preGeneratedToken.length > 20) {
                console.log('♻️ Reusing pre-generated token from sitekey detection phase');
                token = preGeneratedToken;
            }
            // ✅ Or use globally cached token if still valid
            else if (isTokenValid()) {
                console.log('♻️ Using existing cached token (from previous operation)');
                token = turnstileToken;
            }
            // ✅ Otherwise generate a new one
            else {
                console.log('🔐 No valid pre-generated or cached token, creating new one...');
                token = await Utils.executeTurnstile(sitekey, 'paint');
                if (token) {
                    setTurnstileToken(token);
                }
            }

            // 📊 Debug log
            console.log(
                `🔍 Token received - Type: ${typeof token}, Value: ${
                    token
                        ? typeof token === 'string'
                            ? token.length > 50
                                ? token.substring(0, 50) + '...'
                                : token
                            : JSON.stringify(token)
                        : 'null/undefined'
                }, Length: ${token?.length || 0}`
            );

            // ✅ Final validation
            if (typeof token === 'string' && token.length > 20) {
                const duration = Math.round(performance.now() - startTime);
                console.log(`✅ Turnstile token generated successfully in ${duration}ms`);
                return token;
            } else {
                throw new Error(
                    `Invalid or empty token received - Type: ${typeof token}, Value: ${JSON.stringify(
                        token
                    )}, Length: ${token?.length || 0}`
                );
            }
        } catch (error) {
            const duration = Math.round(performance.now() - startTime);
            console.error(`❌ Turnstile token generation failed after ${duration}ms:`, error);

            // Fallback to manual pixel placement for hybrid mode
            if (state.tokenSource === 'hybrid') {
                console.log('🔄 Hybrid mode: Generator failed, automatically switching to manual pixel placement...');
                const fbToken = await handleCaptchaFallback();
                return fbToken;
            } else {
                // Pure generator mode - don't fallback, just fail
                throw error;
            }
        }
    }

    // Keep original method as fallback
    async function handleCaptchaFallback() {
        return new Promise(async (resolve, reject) => {
            try {
                // Ensure we have a fresh promise to await for a new token capture
                if (!_resolveToken) {
                    tokenPromise = new Promise((res) => {
                        _resolveToken = res;
                    });
                }
                const timeoutPromise = Utils.sleep(20000).then(() => reject(new Error('Auto-CAPTCHA timed out.')));

                const solvePromise = (async () => {
                    const mainPaintBtn = await Utils.waitForSelector(
                        'button.btn.btn-primary.btn-lg, button.btn-primary.sm\\:btn-xl',
                        200,
                        10000
                    );
                    if (!mainPaintBtn) throw new Error('Could not find the main paint button.');
                    mainPaintBtn.click();
                    await Utils.sleep(500);

                    const transBtn = await Utils.waitForSelector('button#color-0', 200, 5000);
                    if (!transBtn) throw new Error('Could not find the transparent color button.');
                    transBtn.click();
                    await Utils.sleep(500);

                    const canvas = await Utils.waitForSelector('canvas', 200, 5000);
                    if (!canvas) throw new Error('Could not find the canvas element.');

                    canvas.setAttribute('tabindex', '0');
                    canvas.focus();
                    const rect = canvas.getBoundingClientRect();
                    const centerX = Math.round(rect.left + rect.width / 2);
                    const centerY = Math.round(rect.top + rect.height / 2);

                    canvas.dispatchEvent(
                        new MouseEvent('mousemove', {
                            clientX: centerX,
                            clientY: centerY,
                            bubbles: true,
                        })
                    );
                    canvas.dispatchEvent(
                        new KeyboardEvent('keydown', {
                            key: ' ',
                            code: 'Space',
                            bubbles: true,
                        })
                    );
                    await Utils.sleep(50);
                    canvas.dispatchEvent(
                        new KeyboardEvent('keyup', {
                            key: ' ',
                            code: 'Space',
                            bubbles: true,
                        })
                    );
                    await Utils.sleep(500);

                    // 800ms delay before sending confirmation
                    await Utils.sleep(800);

                    // Keep confirming until token is captured
                    const confirmLoop = async () => {
                        while (!turnstileToken) {
                            let confirmBtn = await Utils.waitForSelector(
                                'button.btn.btn-primary.btn-lg, button.btn.btn-primary.sm\\:btn-xl'
                            );
                            if (!confirmBtn) {
                                const allPrimary = Array.from(document.querySelectorAll('button.btn-primary'));
                                confirmBtn = allPrimary.length ? allPrimary[allPrimary.length - 1] : null;
                            }
                            if (confirmBtn) {
                                confirmBtn.click();
                            }
                            await Utils.sleep(500); // 500ms delay between confirmation attempts
                        }
                    };

                    // Start confirmation loop and wait for token
                    confirmLoop();
                    const token = await tokenPromise;
                    await Utils.sleep(300); // small delay after token is captured
                    resolve(token);
                })();

                await Promise.race([solvePromise, timeoutPromise]);
            } catch (error) {
                console.error('Auto-CAPTCHA process failed:', error);
                reject(error);
            }
        });
    }

    async function createUI() {
        const existingContainer = document.getElementById('wplace-image-bot-container');
        const existingStats = document.getElementById('wplace-stats-container');
        const existingSettings = document.getElementById('wplace-settings-container');

        if (existingContainer) existingContainer.remove();
        if (existingStats) existingStats.remove();
        if (existingSettings) existingSettings.remove();

        await translationManager.initializeTranslations();

        ThemeManager.applyTheme();
        ThemeManager.loadThemeStyles();

        const container = document.createElement('div');
        container.id = 'wplace-image-bot-container';
        container.innerHTML = `
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-image"></i>
          <span>Auto-Image</span>
        </div>
        <div class="wplace-header-controls">
          <button id="settingsBtn" class="wplace-header-btn" title="Settings">
            <i class="fas fa-cog"></i>
          </button>
          <button id="statsBtn" class="wplace-header-btn" title="Show Stats">
            <i class="fas fa-chart-bar"></i>
          </button>
          <button id="compactBtn" class="wplace-header-btn" title="Compact Mode">
            <i class="fas fa-compress"></i>
          </button>
          <button id="minimizeBtn" class="wplace-header-btn" title="Minimize">
            <i class="fas fa-minus"></i>
          </button>
        </div>
      </div>
      <div class="wplace-content">
        <!-- Status Section - Always visible -->
        <div class="wplace-status-section">
          <div id="statusText" class="wplace-status status-default">
            Click 'Upload Image' to begin
          </div>
          <div class="wplace-progress">
            <div id="progressBar" class="wplace-progress-bar" style="width: 0%"></div>
          </div>
        </div>

        <!-- Image Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">🖼️ Image Management</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="uploadBtn" class="wplace-btn wplace-btn-upload" disabled title="🔄 Waiting for initial setup to complete...">
                <i class="fas fa-upload"></i>
                <span>Upload</span>
              </button>
            </div>
            <div class="wplace-row single">
              <button id="selectPosBtn" class="wplace-btn wplace-btn-select" disabled>
                <i class="fas fa-crosshairs"></i>
                <span>Select Position</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Control Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">🎮 Painting Control</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="startBtn" class="wplace-btn wplace-btn-start" disabled>
                <i class="fas fa-play"></i>
                <span>Start</span>
              </button>
              <button id="stopBtn" class="wplace-btn wplace-btn-stop" disabled>
                <i class="fas fa-stop"></i>
                <span>Stop</span>
              </button>
            </div>
            <div class="wplace-row single">
                <button id="toggleOverlayBtn" class="wplace-btn wplace-btn-overlay" disabled>
                    <i class="fas fa-eye"></i>
                    <span>Toggle Overlay</span>
                </button>
            </div>
          </div>
        </div>

        <!-- Cooldown Section -->
        <div class="wplace-section">
            <div class="wplace-section-title">⏱️ Cooldown Settings</div>
            <div class="wplace-cooldown-control">
                <label id="cooldownLabel">Wait until charges reach:</label>
                <div class="wplace-dual-control-compact">
                    <div class="wplace-slider-container-compact">
                        <input type="range" id="cooldownSlider" class="wplace-slider" min="1" max="1" value="${
                            state.cooldownChargeThreshold
                        }">
                    </div>
                    <div class="wplace-input-group-compact">
                        <button id="cooldownDecrease" class="wplace-input-btn-compact" type="button">-</button>
                        <input type="number" id="cooldownInput" class="wplace-number-input-compact" min="1" max="999" value="${
                            state.cooldownChargeThreshold
                        }">
                        <button id="cooldownIncrease" class="wplace-input-btn-compact" type="button">+</button>
                        <span id="cooldownValue" class="wplace-input-label-compact">Charges</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Data Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">💾 Data Management</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="saveBtn" class="wplace-btn wplace-btn-primary" disabled>
                <i class="fas fa-save"></i>
                <span>Save Progress</span>
              </button>
              <button id="loadBtn" class="wplace-btn wplace-btn-primary" disabled title="🔄 Waiting for token generator to initialize...">
                <i class="fas fa-folder-open"></i>
                <span>Load Progress</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

        // Stats Window - Separate UI
        const statsContainer = document.createElement('div');
        statsContainer.id = 'wplace-stats-container';
        statsContainer.style.display = 'none';
        statsContainer.innerHTML = `
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-chart-bar"></i>
          <span>Painting Stats</span>
        </div>
        <div class="wplace-header-controls">
          <button id="refreshChargesBtn" class="wplace-header-btn" title="Refresh Charges">
            <i class="fas fa-sync"></i>
          </button>
          <button id="closeStatsBtn" class="wplace-header-btn" title="Close Stats">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="wplace-content">
        <div class="wplace-stats">
          <div id="statsArea">
            <div class="wplace-stat-item">
              <div class="wplace-stat-label"><i class="fas fa-info-circle"></i> Click 'Upload Image' to begin</div>
            </div>
          </div>
        </div>
      </div>
    `;

        // Modern Settings Container with Theme Support
        // Use the theme variable already declared at the top of createUI function
        const settingsContainer = document.createElement('div');
        settingsContainer.id = 'wplace-settings-container';

        // Apply theme-based styling
        const themeBackground = `linear-gradient(135deg, ${CONFIG.THEME.primary} 0%, ${
            CONFIG.THEME.secondary || CONFIG.THEME.primary
        } 100%)`;

        settingsContainer.className = 'wplace-settings-container-base';
        // Apply theme-specific background
        settingsContainer.style.background = themeBackground;
        settingsContainer.style.cssText += `
      min-width: 420px;
      max-width: 480px;
      z-index: 99999;
      color: ${CONFIG.THEME.text};
      font-family: ${CONFIG.THEME.fontFamily};
      box-shadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1)';
      backdrop-filter: ${CONFIG.THEME.backdropFilter};
      overflow: hidden;
      animation: settings-slide-in 0.4s ease-out;
    `;

        // noinspection CssInvalidFunction
        settingsContainer.innerHTML = `
      <div class="wplace-settings-header">
        <div class="wplace-settings-title-wrapper">
          <h3 class="wplace-settings-title">
            <i class="fas fa-cog wplace-settings-icon"></i>
            Settings
          </h3>
          <button id="closeSettingsBtn" class="wplace-settings-close-btn">✕</button>
        </div>
      </div>

      <div class="wplace-settings-content">
        
        <!-- Token Source Selection -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-key wplace-icon-key"></i>
            Token Source
          </label>
          <div class="wplace-settings-section-wrapper">
            <select id="tokenSourceSelect" class="wplace-settings-select">
              <option value="generator" ${
                  state.tokenSource === 'generator' ? 'selected' : ''
              } class="wplace-settings-option">🤖 Automatic Token Generator (Recommended)</option>
              <option value="hybrid" ${
                  state.tokenSource === 'hybrid' ? 'selected' : ''
              } class="wplace-settings-option">🔄 Generator + Auto Fallback</option>
              <option value="manual" ${
                  state.tokenSource === 'manual' ? 'selected' : ''
              } class="wplace-settings-option">🎯 Manual Pixel Placement</option>
            </select>
            <p class="wplace-settings-description">
              Generator mode creates tokens automatically. Hybrid mode falls back to manual when generator fails. Manual mode only uses pixel placement.
            </p>
          </div>
        </div>

        <!-- Automation Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-robot wplace-icon-robot"></i>
            Automation
          </label>
          <!-- Token generator is always enabled - settings moved to Token Source above -->
        </div>

        <!-- Overlay Settings Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label" style="color: ${CONFIG.THEME.text || 'white'};">
            <i class="fas fa-eye wplace-icon-eye" style="color: ${CONFIG.THEME.highlight || '#48dbfb'};"></i>
            Overlay Settings
          </label>
          <div class="wplace-settings-section-wrapper wplace-overlay-wrapper" style="
            background: ${CONFIG.THEME.accent ? `${CONFIG.THEME.accent}20` : 'rgba(255,255,255,0.1)'}; 
            border-radius: ${CONFIG.THEME.borderRadius || '12px'}; 
            padding: 18px; 
            border: 1px solid ${CONFIG.THEME.accent || 'rgba(255,255,255,0.1)'};
          ">
              <!-- Opacity Slider -->
              <div class="wplace-overlay-opacity-control">
                <div class="wplace-overlay-opacity-header">
                   <span class="wplace-overlay-opacity-label" style="color: ${
                       CONFIG.THEME.text || 'white'
                   };">Overlay Opacity</span>
                   <div id="overlayOpacityValue" class="wplace-overlay-opacity-value" style="
                     background: ${CONFIG.THEME.secondary || 'rgba(0,0,0,0.2)'}; 
                     color: ${CONFIG.THEME.text || 'white'};
                     padding: 4px 8px; 
                     border-radius: ${CONFIG.THEME.borderRadius === '0' ? '0' : '6px'}; 
                     font-size: 12px;
                     border: 1px solid ${CONFIG.THEME.accent || 'transparent'};
                   ">${Math.round(state.overlayOpacity * 100)}%</div>
                </div>
                <input type="range" id="overlayOpacitySlider" min="0.1" max="1" step="0.05" value="${
                    state.overlayOpacity
                }" class="wplace-overlay-opacity-slider" style="
                  background: linear-gradient(to right, ${CONFIG.THEME.highlight || '#48dbfb'} 0%, '#d3a4ff' 100%); 
                  border-radius: ${CONFIG.THEME.borderRadius === '0' ? '0' : '4px'}; 
                ">
              </div>
              <!-- Blue Marble Toggle -->
              <label for="enableBlueMarbleToggle" class="wplace-settings-toggle">
                  <div>
                      <span class="wplace-settings-toggle-title" style="color: ${
                          CONFIG.THEME.text || 'white'
                      };">Blue Marble Effect</span>
                      <p class="wplace-settings-toggle-description" style="color: ${
                          CONFIG.THEME.text ? `${CONFIG.THEME.text}BB` : 'rgba(255,255,255,0.7)'
                      };">Renders a dithered "shredded" overlay.</p>
                  </div>
                  <input type="checkbox" id="enableBlueMarbleToggle" ${
                      state.blueMarbleEnabled ? 'checked' : ''
                  } class="wplace-settings-checkbox" style="
                    accent-color: ${CONFIG.THEME.highlight || '#48dbfb'};
                  "/>
              </label>
          </div>
        </div>

        <!-- Paint Options Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-paint-brush wplace-icon-paint"></i>
            Paint Options
          </label>
          <!-- Pixel Filter Toggles -->
          <div id="pixelFilterControls" class="wplace-settings-section-wrapper wplace-pixel-filter-controls">
            <!-- Paint White Pixels -->
            <label class="wplace-settings-toggle">
              <div>
                <span class="wplace-settings-toggle-title" style="color: ${CONFIG.THEME.text || 'white'};">
                  Paint White
                </span>
                <p class="wplace-settings-toggle-description" style="color: ${
                    CONFIG.THEME.text ? `${CONFIG.THEME.text}BB` : 'rgba(255,255,255,0.7)'
                };">
                  If enabled, template white pixels will be painted.
                </p>
              </div>
              <input type="checkbox" id="settingsPaintWhiteToggle" ${state.paintWhitePixels ? 'checked' : ''} 
                class="wplace-settings-checkbox"
                style="accent-color: ${CONFIG.THEME.highlight || '#48dbfb'};"/>
            </label>
            
            <!-- Paint Transparent Pixels -->
            <label class="wplace-settings-toggle">
              <div>
                <span class="wplace-settings-toggle-title" style="color: ${CONFIG.THEME.text || 'white'};">
                  Paint Transparent
                </span>
                <p class="wplace-settings-toggle-description" style="color: ${
                    CONFIG.THEME.text ? `${CONFIG.THEME.text}BB` : 'rgba(255,255,255,0.7)'
                };">
                  If enabled, template transparent pixels will be painted
                </p>
              </div>
              <input type="checkbox" id="settingsPaintTransparentToggle" ${
                  state.paintTransparentPixels ? 'checked' : ''
              } 
                class="wplace-settings-checkbox"
                style="accent-color: ${CONFIG.THEME.highlight || '#48dbfb'};"/>
            </label>
            <label class="wplace-settings-toggle">
              <div>
                <span class="wplace-settings-toggle-title" style="color: ${
                    CONFIG.THEME.text || 'white'
                };">Paint Unavailable</span>
                <p class="wplace-settings-toggle-description" style="color: ${
                    CONFIG.THEME.text ? `${CONFIG.THEME.text}BB` : 'rgba(255,255,255,0.7)'
                };">If enabled, template colors that are unavailable will be painted using the closest available color</p>
              </div>
              <input type="checkbox" id="paintUnavailablePixelsToggle" ${
                  state.paintUnavailablePixels ? 'checked' : ''
              } class="wplace-settings-checkbox" style="
                    accent-color: ${CONFIG.THEME.highlight || '#48dbfb'};
                  "/>
            </label>
          </div>
        </div>

        <!-- Speed Control Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-tachometer-alt wplace-icon-speed"></i>
            Painting Speed
          </label>
          
          <!-- Batch Mode Selection -->
          <div class="wplace-mode-selection">
            <label class="wplace-mode-label">
              <i class="fas fa-dice wplace-icon-dice"></i>
              Batch Mode
            </label>
            <select id="batchModeSelect" class="wplace-settings-select">
              <option value="normal" class="wplace-settings-option">📦 Normal (Fixed Size)</option>
              <option value="random" class="wplace-settings-option">🎲 Random (Range)</option>
            </select>
          </div>
          
          <!-- Normal Mode: Fixed Size Controls -->
          <div id="normalBatchControls" class="wplace-batch-controls wplace-normal-batch-controls">
            <div class="wplace-batch-size-header">
              <span class="wplace-batch-size-label">Batch size</span>
            </div>
            <div class="wplace-dual-control-compact">
                <div class="wplace-speed-slider-container-compact">
                  <input type="range" id="speedSlider" min="${CONFIG.PAINTING_SPEED.MIN}" max="${
                      CONFIG.PAINTING_SPEED.MAX
                  }" value="${CONFIG.PAINTING_SPEED.DEFAULT}" class="wplace-speed-slider">
                </div>
                <div class="wplace-speed-input-container-compact">
                  <div class="wplace-input-group-compact">
                    <button id="speedDecrease" class="wplace-input-btn-compact" type="button">-</button>
                    <input type="number" id="speedInput" class="wplace-number-input-compact" min="${
                        CONFIG.PAINTING_SPEED.MIN
                    }" max="${CONFIG.PAINTING_SPEED.MAX}" value="${CONFIG.PAINTING_SPEED.DEFAULT}">
                    <button id="speedIncrease" class="wplace-input-btn-compact" type="button">+</button>
                    <span id="speedValue" class="wplace-input-label-compact">pixels</span>
                  </div>
                </div>
            </div>
            <div class="wplace-speed-labels">
              <span class="wplace-speed-min"><i class="fas fa-turtle"></i> ${CONFIG.PAINTING_SPEED.MIN}</span>
              <span class="wplace-speed-max"><i class="fas fa-rabbit"></i> ${CONFIG.PAINTING_SPEED.MAX}</span>
            </div>
          </div>
          
          <!-- Random Mode: Range Controls -->
          <div id="randomBatchControls" class="wplace-batch-controls wplace-random-batch-controls">
            <div class="wplace-random-batch-grid">
              <div>
                <label class="wplace-random-batch-label">
                  <i class="fas fa-arrow-down wplace-icon-min"></i>
                  Minimum Batch Size
                </label>
                <input type="number" id="randomBatchMin" min="1" max="1000" value="${
                    CONFIG.RANDOM_BATCH_RANGE.MIN
                }" class="wplace-settings-number-input">
              </div>
              <div>
                <label class="wplace-random-batch-label">
                  <i class="fas fa-arrow-up wplace-icon-max"></i>
                  Maximum Batch Size
                </label>
                <input type="number" id="randomBatchMax" min="1" max="1000" value="${
                    CONFIG.RANDOM_BATCH_RANGE.MAX
                }" class="wplace-settings-number-input">
              </div>
            </div>
            <p class="wplace-random-batch-description">
              🎲 Random batch size between min and max values
            </p>
          </div>
          
          <!-- Speed Control Toggle -->
          <label class="wplace-speed-control-toggle">
            <input type="checkbox" id="enableSpeedToggle" ${
                CONFIG.PAINTING_SPEED_ENABLED ? 'checked' : ''
            } class="wplace-speed-checkbox"/>
            <span>Enable painting speed limit (batch size control)</span>
          </label>
        </div>
        
        <!-- Coordinate Generation Section -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-route wplace-icon-route"></i>
            Coordinate Generation
          </label>
          
          <!-- Mode Selection -->
          <div class="wplace-mode-selection">
            <label class="wplace-mode-label">
              <i class="fas fa-th wplace-icon-table"></i>
              Generation Mode
            </label>
            <select id="coordinateModeSelect" class="wplace-settings-select">
              <option value="rows" class="wplace-settings-option">📏 Rows (Horizontal Lines)</option>
              <option value="columns" class="wplace-settings-option">📐 Columns (Vertical Lines)</option>
              <option value="circle-out" class="wplace-settings-option">⭕ Circle Out (Center → Edges)</option>
              <option value="circle-in" class="wplace-settings-option">⭕ Circle In (Edges → Center)</option>
              <option value="blocks" class="wplace-settings-option">🟫 Blocks (Ordered)</option>
              <option value="shuffle-blocks" class="wplace-settings-option">🎲 Shuffle Blocks (Random)</option>
            </select>
          </div>
          
          <!-- Direction Selection (only for rows/columns) -->
          <div id="directionControls" class="wplace-mode-selection">
            <label class="wplace-mode-label">
              <i class="fas fa-compass wplace-icon-compass"></i>
              Starting Direction
            </label>
            <select id="coordinateDirectionSelect" class="wplace-settings-select">
              <option value="top-left" class="wplace-settings-option">↖️ Top-Left</option>
              <option value="top-right" class="wplace-settings-option">↗️ Top-Right</option>
              <option value="bottom-left" class="wplace-settings-option">↙️ Bottom-Left</option>
              <option value="bottom-right" class="wplace-settings-option">↘️ Bottom-Right</option>
            </select>
          </div>
          
          <!-- Snake Pattern Toggle (only for rows/columns) -->
          <div id="snakeControls" class="wplace-snake-pattern-controls wplace-settings-section-wrapper">
            <label class="wplace-settings-toggle">
              <div>
                <span class="wplace-settings-toggle-title" style="color: ${
                    CONFIG.THEME.text || 'white'
                };">Snake Pattern</span>
                <p class="wplace-settings-toggle-description" style="color: ${
                    CONFIG.THEME.text ? `${CONFIG.THEME.text}BB` : 'rgba(255,255,255,0.7)'
                };">Alternate direction for each row/column (zigzag pattern)</p>
              </div>
              <input type="checkbox" id="coordinateSnakeToggle" ${
                  state.coordinateSnake ? 'checked' : ''
              } class="wplace-settings-checkbox" style="
                    accent-color: ${CONFIG.THEME.highlight || '#48dbfb'};
                  "/>
            </label>
          </div>
          
          <!-- Block Size Controls (only for blocks/shuffle-blocks) -->
          <div id="blockControls" class="wplace-block-size-controls wplace-settings-section-wrapper wplace-shuffle-block-size-controls">
            <div class="wplace-block-size-grid">
              <div>
                <label class="wplace-block-size-label">
                  <i class="fas fa-arrows-alt-h wplace-icon-width"></i>
                  Block Width
                </label>
                <input type="number" id="blockWidthInput" min="1" max="50" value="6" class="wplace-settings-number-input">
              </div>
              <div>
                <label style="display: block; color: rgba(255,255,255,0.8); font-size: 12px; margin-bottom: 8px;">
                  <i class="fas fa-arrows-alt-v wplace-icon-height"></i>
                  Block Height
                </label>
                <input type="number" id="blockHeightInput" min="1" max="50" value="2" class="wplace-settings-number-input">
              </div>
            </div>
            <p class="wplace-block-size-description">
              🧱 Block dimensions for block-based generation modes
            </p>
          </div>
        </div>
      </div>

        <div class="wplace-settings-footer">
             <button id="applySettingsBtn" class="wplace-settings-apply-btn">
                 <i class="fas fa-check"></i> Apply Settings
          </button>
        </div>

      <style>
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes settings-slide-in {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes settings-fade-out {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
        }

        #speedSlider::-webkit-slider-thumb, #cooldownSlider::-webkit-slider-thumb, #overlayOpacitySlider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3), 0 0 0 2px #4facfe;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        #speedSlider::-webkit-slider-thumb:hover, #cooldownSlider::-webkit-slider-thumb:hover, #overlayOpacitySlider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 8px rgba(0,0,0,0.4), 0 0 0 3px #4facfe;
        }

        #speedSlider::-moz-range-thumb, #cooldownSlider::-moz-range-thumb, #overlayOpacitySlider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 3px 6px rgba(0,0,0,0.3), 0 0 0 2px #4facfe;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }

        .wplace-dragging {
          opacity: 0.9;
          box-shadow: 0 30px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.2);
          transition: none;
        }

        .wplace-settings-header:hover {
          background: rgba(255,255,255,0.15) !important;
        }

        .wplace-settings-header:active {
          background: rgba(255,255,255,0.2) !important;
        }

        /* Custom Scrollbar for Content Area */
        .wplace-content::-webkit-scrollbar {
          width: 6px;
        }

        .wplace-content::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
        }

        .wplace-content::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.3);
          border-radius: 3px;
        }

        .wplace-content::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.5);
        }
      </style>
    `;

        document.body.appendChild(container);
        document.body.appendChild(statsContainer);
        document.body.appendChild(settingsContainer);

        // Show the main container after all elements are appended
        container.style.display = 'block';

        const uploadBtn = container.querySelector('#uploadBtn');
        const selectPosBtn = container.querySelector('#selectPosBtn');
        const startBtn = container.querySelector('#startBtn');
        const stopBtn = container.querySelector('#stopBtn');
        const saveBtn = container.querySelector('#saveBtn');
        const loadBtn = container.querySelector('#loadBtn');

        container.querySelectorAll('.wplace-section-title').forEach((title) => {
            // Add a right-side arrow if it doesn't exist
            if (!title.querySelector('i.arrow')) {
                const arrow = document.createElement('i');
                arrow.className = 'fas fa-chevron-down arrow'; // FontAwesome down arrow
                title.appendChild(arrow);
            }

            // Click event to toggle collapse/expand of the section
            title.addEventListener('click', () => {
                const section = title.parentElement;
                section.classList.toggle('collapsed');
            });
        });

        // Disable load/upload buttons until initial setup is complete (startup only)
        if (loadBtn) {
            loadBtn.disabled = !state.initialSetupComplete;
            loadBtn.title = state.initialSetupComplete ? '' : '🔄 Waiting for initial setup to complete...';
        }
        if (uploadBtn) {
            uploadBtn.disabled = !state.initialSetupComplete;
            uploadBtn.title = state.initialSetupComplete ? '' : '🔄 Waiting for initial setup to complete...';
        }

        const minimizeBtn = container.querySelector('#minimizeBtn');
        const compactBtn = container.querySelector('#compactBtn');
        const statsBtn = container.querySelector('#statsBtn');
        const toggleOverlayBtn = container.querySelector('#toggleOverlayBtn');
        const statusText = container.querySelector('#statusText');
        const progressBar = container.querySelector('#progressBar');
        const statsArea = statsContainer.querySelector('#statsArea');
        const content = container.querySelector('.wplace-content');
        const closeStatsBtn = statsContainer.querySelector('#closeStatsBtn');
        const refreshChargesBtn = statsContainer.querySelector('#refreshChargesBtn');
        const cooldownSlider = container.querySelector('#cooldownSlider');
        const cooldownInput = container.querySelector('#cooldownInput');
        const cooldownDecrease = container.querySelector('#cooldownDecrease');
        const cooldownIncrease = container.querySelector('#cooldownIncrease');
        const cooldownValue = container.querySelector('#cooldownValue');

        if (!uploadBtn || !selectPosBtn || !startBtn || !stopBtn) {
            console.error('Some UI elements not found:', {
                uploadBtn: !!uploadBtn,
                selectPosBtn: !!selectPosBtn,
                startBtn: !!startBtn,
                stopBtn: !!stopBtn,
            });
        }

        if (!statsContainer || !statsArea || !closeStatsBtn) {
            // Note: base CSS now aligns with this layout: main panel at left:20px (width 280), stats at left:330px.
        }

        makeDraggable(container);

        function makeDraggable(element) {
            let pos1 = 0,
                pos2 = 0,
                pos3 = 0,
                pos4 = 0;
            let isDragging = false;
            const header = element.querySelector('.wplace-header') || element.querySelector('.wplace-settings-header');

            if (!header) {
                console.warn('No draggable header found for element:', element);
                return;
            }

            header.onmousedown = dragMouseDown;

            function dragMouseDown(e) {
                if (e.target.closest('.wplace-header-btn') || e.target.closest('button')) return;

                e.preventDefault();
                isDragging = true;

                const rect = element.getBoundingClientRect();

                element.style.transform = 'none';
                element.style.top = rect.top + 'px';
                element.style.left = rect.left + 'px';

                pos3 = e.clientX;
                pos4 = e.clientY;
                element.classList.add('wplace-dragging');
                document.onmouseup = closeDragElement;
                document.onmousemove = elementDrag;

                document.body.style.userSelect = 'none';
            }

            function elementDrag(e) {
                if (!isDragging) return;

                e.preventDefault();
                pos1 = pos3 - e.clientX;
                pos2 = pos4 - e.clientY;
                pos3 = e.clientX;
                pos4 = e.clientY;

                let newTop = element.offsetTop - pos2;
                let newLeft = element.offsetLeft - pos1;

                const rect = element.getBoundingClientRect();
                const maxTop = window.innerHeight - rect.height;
                const maxLeft = window.innerWidth - rect.width;

                newTop = Math.max(0, Math.min(newTop, maxTop));
                newLeft = Math.max(0, Math.min(newLeft, maxLeft));

                element.style.top = newTop + 'px';
                element.style.left = newLeft + 'px';
            }

            function closeDragElement() {
                isDragging = false;
                element.classList.remove('wplace-dragging');
                document.onmouseup = null;
                document.onmousemove = null;
                document.body.style.userSelect = '';
            }
        }

        makeDraggable(statsContainer);
        makeDraggable(container);

        if (statsBtn && closeStatsBtn) {
            statsBtn.addEventListener('click', () => {
                const isVisible = statsContainer.style.display !== 'none';
                if (isVisible) {
                    statsContainer.style.display = 'none';
                    statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
                    statsBtn.title = t('showStats');
                } else {
                    statsContainer.style.display = 'block';
                    statsBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
                    statsBtn.title = t('hideStats');
                }
            });

            closeStatsBtn.addEventListener('click', () => {
                statsContainer.style.display = 'none';
                statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
                statsBtn.title = t('showStats');
            });

            if (refreshChargesBtn) {
                refreshChargesBtn.addEventListener('click', async () => {
                    refreshChargesBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    refreshChargesBtn.disabled = true;

                    try {
                        await updateStats(true);
                    } catch (error) {
                        console.error('Error refreshing charges:', error);
                    } finally {
                        refreshChargesBtn.innerHTML = '<i class="fas fa-sync"></i>';
                        refreshChargesBtn.disabled = false;
                    }
                });
            }
        }
        if (statsContainer && statsBtn) {
            // Stats container starts hidden - user clicks button to show
            statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
            statsBtn.title = t('showStats');
        }

        const settingsBtn = container.querySelector('#settingsBtn');
        const closeSettingsBtn = settingsContainer.querySelector('#closeSettingsBtn');
        const applySettingsBtn = settingsContainer.querySelector('#applySettingsBtn');

        if (settingsBtn && closeSettingsBtn && applySettingsBtn) {
            settingsBtn.addEventListener('click', () => {
                const isVisible = settingsContainer.classList.contains('show');
                if (isVisible) {
                    settingsContainer.style.animation = 'settings-fade-out 0.3s ease-out forwards';
                    settingsContainer.classList.remove('show');
                    setTimeout(() => {
                        settingsContainer.style.animation = '';
                    }, 300);
                } else {
                    settingsContainer.style.top = '50%';
                    settingsContainer.style.left = '50%';
                    settingsContainer.style.transform = 'translate(-50%, -50%)';
                    settingsContainer.classList.add('show');
                    settingsContainer.style.animation = 'settings-slide-in 0.4s ease-out';
                }
            });

            closeSettingsBtn.addEventListener('click', () => {
                settingsContainer.style.animation = 'settings-fade-out 0.3s ease-out forwards';
                settingsContainer.classList.remove('show');
                setTimeout(() => {
                    settingsContainer.style.animation = '';
                    settingsContainer.style.top = '50%';
                    settingsContainer.style.left = '50%';
                    settingsContainer.style.transform = 'translate(-50%, -50%)';
                }, 300);
            });

            applySettingsBtn.addEventListener('click', () => {
                // Sync advanced settings before save
                const colorAlgorithmSelect = document.getElementById('colorAlgorithmSelect');
                if (colorAlgorithmSelect) state.colorMatchingAlgorithm = colorAlgorithmSelect.value;
                const enableChromaPenaltyToggle = document.getElementById('enableChromaPenaltyToggle');
                if (enableChromaPenaltyToggle) state.enableChromaPenalty = enableChromaPenaltyToggle.checked;
                const chromaPenaltyWeightSlider = document.getElementById('chromaPenaltyWeightSlider');
                if (chromaPenaltyWeightSlider)
                    state.chromaPenaltyWeight = parseFloat(chromaPenaltyWeightSlider.value) || 0.15;
                const transparencyThresholdInput = document.getElementById('transparencyThresholdInput');
                if (transparencyThresholdInput) {
                    const v = parseInt(transparencyThresholdInput.value, 10);
                    if (!isNaN(v) && v >= 0 && v <= 255) state.customTransparencyThreshold = v;
                }
                const whiteThresholdInput = document.getElementById('whiteThresholdInput');
                if (whiteThresholdInput) {
                    const v = parseInt(whiteThresholdInput.value, 10);
                    if (!isNaN(v) && v >= 200 && v <= 255) state.customWhiteThreshold = v;
                }
                // Update functional thresholds
                CONFIG.TRANSPARENCY_THRESHOLD = state.customTransparencyThreshold;
                CONFIG.WHITE_THRESHOLD = state.customWhiteThreshold;
                saveBotSettings();
                Utils.showAlert(t('settingsSaved'), 'success');
                closeSettingsBtn.click();
            });

            makeDraggable(settingsContainer);

            const tokenSourceSelect = settingsContainer.querySelector('#tokenSourceSelect');
            if (tokenSourceSelect) {
                tokenSourceSelect.addEventListener('change', (e) => {
                    state.tokenSource = e.target.value;
                    saveBotSettings();
                    console.log(`🔑 Token source changed to: ${state.tokenSource}`);
                    const sourceNames = {
                        generator: 'Automatic Generator',
                        hybrid: 'Generator + Auto Fallback',
                        manual: 'Manual Pixel Placement',
                    };
                    Utils.showAlert(t('tokenSourceSet', { source: sourceNames[state.tokenSource] }), 'success');
                });
            }

            // Batch mode controls
            const batchModeSelect = settingsContainer.querySelector('#batchModeSelect');
            const normalBatchControls = settingsContainer.querySelector('#normalBatchControls');
            const randomBatchControls = settingsContainer.querySelector('#randomBatchControls');
            const randomBatchMin = settingsContainer.querySelector('#randomBatchMin');
            const randomBatchMax = settingsContainer.querySelector('#randomBatchMax');

            if (batchModeSelect) {
                batchModeSelect.addEventListener('change', (e) => {
                    state.batchMode = e.target.value;

                    // Switch between normal and random controls
                    if (normalBatchControls && randomBatchControls) {
                        if (e.target.value === 'random') {
                            normalBatchControls.style.display = 'none';
                            randomBatchControls.style.display = 'block';
                        } else {
                            normalBatchControls.style.display = 'block';
                            randomBatchControls.style.display = 'none';
                        }
                    }

                    saveBotSettings();
                    console.log(`📦 Batch mode changed to: ${state.batchMode}`);
                    Utils.showAlert(
                        t('batchModeSet', {
                            mode: state.batchMode === 'random' ? t('randomRange') : t('normalFixedSize'),
                        }),
                        'success'
                    );
                });
            }

            if (randomBatchMin) {
                randomBatchMin.addEventListener('input', (e) => {
                    const min = parseInt(e.target.value);
                    if (min >= 1 && min <= 1000) {
                        state.randomBatchMin = min;
                        // Ensure min doesn't exceed max
                        if (randomBatchMax && min > state.randomBatchMax) {
                            state.randomBatchMax = min;
                            randomBatchMax.value = min;
                        }
                        saveBotSettings();
                    }
                });
            }

            if (randomBatchMax) {
                randomBatchMax.addEventListener('input', (e) => {
                    const max = parseInt(e.target.value);
                    if (max >= 1 && max <= 1000) {
                        state.randomBatchMax = max;
                        // Ensure max doesn't go below min
                        if (randomBatchMin && max < state.randomBatchMin) {
                            state.randomBatchMin = max;
                            randomBatchMin.value = max;
                        }
                        saveBotSettings();
                    }
                });
            }

            const overlayOpacitySlider = settingsContainer.querySelector('#overlayOpacitySlider');
            const overlayOpacityValue = settingsContainer.querySelector('#overlayOpacityValue');
            const enableBlueMarbleToggle = settingsContainer.querySelector('#enableBlueMarbleToggle');
            const settingsPaintWhiteToggle = settingsContainer.querySelector('#settingsPaintWhiteToggle');
            const settingsPaintTransparentToggle = settingsContainer.querySelector('#settingsPaintTransparentToggle');

            if (overlayOpacitySlider && overlayOpacityValue) {
                const updateOpacity = (newValue) => {
                    const opacity = parseFloat(newValue);
                    state.overlayOpacity = opacity;
                    overlayOpacitySlider.value = opacity;
                    overlayOpacityValue.textContent = `${Math.round(opacity * 100)}%`;
                };

                overlayOpacitySlider.addEventListener('input', (e) => {
                    updateOpacity(e.target.value);
                });

                // Add scroll-to-adjust for overlay opacity slider
                Utils.createScrollToAdjust(overlayOpacitySlider, updateOpacity, 0, 1, 0.05);
            }

            if (settingsPaintWhiteToggle) {
                settingsPaintWhiteToggle.checked = state.paintWhitePixels;
                settingsPaintWhiteToggle.addEventListener('change', (e) => {
                    state.paintWhitePixels = e.target.checked;
                    saveBotSettings();
                    console.log(`🎨 Paint white pixels: ${state.paintWhitePixels ? 'ON' : 'OFF'}`);
                    const statusText = state.paintWhitePixels
                        ? 'White pixels in the template will be painted'
                        : 'White pixels will be skipped';
                    Utils.showAlert(statusText, 'success');
                });
            }

            if (settingsPaintTransparentToggle) {
                settingsPaintTransparentToggle.checked = state.paintTransparentPixels;
                settingsPaintTransparentToggle.addEventListener('change', (e) => {
                    state.paintTransparentPixels = e.target.checked;
                    saveBotSettings();
                    console.log(`🎨 Paint transparent pixels: ${state.paintTransparentPixels ? 'ON' : 'OFF'}`);
                    const statusText = state.paintTransparentPixels
                        ? 'Transparent pixels in the template will be painted with the closest available color'
                        : 'Transparent pixels will be skipped';
                    Utils.showAlert(statusText, 'success');
                });
            }

            // Speed controls - both slider and input
            const speedSlider = settingsContainer.querySelector('#speedSlider');
            const speedInput = settingsContainer.querySelector('#speedInput');
            const speedDecrease = settingsContainer.querySelector('#speedDecrease');
            const speedIncrease = settingsContainer.querySelector('#speedIncrease');
            const speedValue = settingsContainer.querySelector('#speedValue');

            if (speedSlider && speedInput && speedValue && speedDecrease && speedIncrease) {
                const updateSpeed = (newValue) => {
                    const speed = Math.max(
                        CONFIG.PAINTING_SPEED.MIN,
                        Math.min(CONFIG.PAINTING_SPEED.MAX, parseInt(newValue))
                    );
                    state.paintingSpeed = speed;

                    // Update both controls (value shows in input, label shows unit only)
                    speedSlider.value = speed;
                    speedInput.value = speed;
                    speedValue.textContent = `pixels`;

                    saveBotSettings();
                };

                // Slider event listener
                speedSlider.addEventListener('input', (e) => {
                    updateSpeed(e.target.value);
                });

                // Number input event listener
                speedInput.addEventListener('input', (e) => {
                    updateSpeed(e.target.value);
                });

                // Decrease button
                speedDecrease.addEventListener('click', () => {
                    updateSpeed(parseInt(speedInput.value) - 1);
                });

                // Increase button
                speedIncrease.addEventListener('click', () => {
                    updateSpeed(parseInt(speedInput.value) + 1);
                });

                // Add scroll-to-adjust for speed slider
                Utils.createScrollToAdjust(
                    speedSlider,
                    updateSpeed,
                    CONFIG.PAINTING_SPEED.MIN,
                    CONFIG.PAINTING_SPEED.MAX,
                    1
                );
            }

            if (enableBlueMarbleToggle) {
                enableBlueMarbleToggle.addEventListener('click', async () => {
                    state.blueMarbleEnabled = enableBlueMarbleToggle.checked;
                    if (state.imageLoaded && overlayManager.imageBitmap) {
                        Utils.showAlert(t('reprocessingOverlay'), 'info');
                        await overlayManager.processImageIntoChunks();
                        Utils.showAlert(t('overlayUpdated'), 'success');
                    }
                });
            }

            // (Advanced color listeners moved outside to work with resize dialog)
        }

        // Coordinate generation controls with smart visibility
        const coordinateModeSelect = settingsContainer.querySelector('#coordinateModeSelect');
        const coordinateDirectionSelect = settingsContainer.querySelector('#coordinateDirectionSelect');
        const coordinateSnakeToggle = settingsContainer.querySelector('#coordinateSnakeToggle');
        const directionControls = settingsContainer.querySelector('#directionControls');
        const snakeControls = settingsContainer.querySelector('#snakeControls');
        const blockControls = settingsContainer.querySelector('#blockControls');
        const blockWidthInput = settingsContainer.querySelector('#blockWidthInput');
        const blockHeightInput = settingsContainer.querySelector('#blockHeightInput');
        const paintUnavailablePixelsToggle = settingsContainer.querySelector('#paintUnavailablePixelsToggle');

        if (paintUnavailablePixelsToggle) {
            paintUnavailablePixelsToggle.checked = state.paintUnavailablePixels;
            paintUnavailablePixelsToggle.addEventListener('change', (e) => {
                state.paintUnavailablePixels = e.target.checked;
                saveBotSettings();
                console.log(`🎨 Paint unavailable colors: ${state.paintUnavailablePixels ? 'ON' : 'OFF'}`);
                const statusText = state.paintUnavailablePixels
                    ? 'Unavailable template colors will be painted with the closest available color'
                    : 'Unavailable template colors will be skipped';
                Utils.showAlert(statusText, 'success');
            });
        }
        if (coordinateModeSelect) {
            coordinateModeSelect.value = state.coordinateMode;
            coordinateModeSelect.addEventListener('change', (e) => {
                state.coordinateMode = e.target.value;
                Utils.updateCoordinateUI({
                    mode: state.coordinateMode,
                    directionControls,
                    snakeControls,
                    blockControls,
                });
                saveBotSettings();
                console.log(`🔄 Coordinate mode changed to: ${state.coordinateMode}`);
                Utils.showAlert(`Coordinate mode set to: ${state.coordinateMode}`, 'success');
            });
        }

        if (coordinateDirectionSelect) {
            coordinateDirectionSelect.value = state.coordinateDirection;
            coordinateDirectionSelect.addEventListener('change', (e) => {
                state.coordinateDirection = e.target.value;
                saveBotSettings();
                console.log(`🧭 Coordinate direction changed to: ${state.coordinateDirection}`);
                Utils.showAlert(`Coordinate direction set to: ${state.coordinateDirection}`, 'success');
            });
        }

        if (coordinateSnakeToggle) {
            coordinateSnakeToggle.checked = state.coordinateSnake;
            coordinateSnakeToggle.addEventListener('change', (e) => {
                state.coordinateSnake = e.target.checked;
                saveBotSettings();
                console.log(`🐍 Snake pattern ${state.coordinateSnake ? 'enabled' : 'disabled'}`);
                Utils.showAlert(`Snake pattern ${state.coordinateSnake ? 'enabled' : 'disabled'}`, 'success');
            });
        }

        if (blockWidthInput) {
            blockWidthInput.value = state.blockWidth;
            blockWidthInput.addEventListener('input', (e) => {
                const width = parseInt(e.target.value);
                if (width >= 1 && width <= 50) {
                    state.blockWidth = width;
                    saveBotSettings();
                }
            });
        }

        if (blockHeightInput) {
            blockHeightInput.value = state.blockHeight;
            blockHeightInput.addEventListener('change', (e) => {
                const height = parseInt(e.target.value);
                if (height >= 1 && height <= 50) {
                    state.blockHeight = height;
                    saveBotSettings();
                }
            });
        }

        if (compactBtn) {
            compactBtn.addEventListener('click', () => {
                container.classList.toggle('wplace-compact');
                const isCompact = container.classList.contains('wplace-compact');

                if (isCompact) {
                    compactBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    compactBtn.title = t('expandMode');
                } else {
                    compactBtn.innerHTML = '<i class="fas fa-compress"></i>';
                    compactBtn.title = t('compactMode');
                }
            });
        }

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', () => {
                state.minimized = !state.minimized;
                if (state.minimized) {
                    container.classList.add('wplace-minimized');
                    content.classList.add('wplace-hidden');
                    minimizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    minimizeBtn.title = t('restore');
                } else {
                    container.classList.remove('wplace-minimized');
                    content.classList.remove('wplace-hidden');
                    minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
                    minimizeBtn.title = t('minimize');
                }
                saveBotSettings();
            });
        }

        if (toggleOverlayBtn) {
            toggleOverlayBtn.addEventListener('click', () => {
                const isEnabled = overlayManager.toggle();
                toggleOverlayBtn.classList.toggle('active', isEnabled);
                toggleOverlayBtn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
                Utils.showAlert(isEnabled ? t('overlayEnabled') : t('overlayDisabled'), 'info');
            });
        }

        if (state.minimized) {
            container.classList.add('wplace-minimized');
            content.classList.add('wplace-hidden');
            if (minimizeBtn) {
                minimizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
                minimizeBtn.title = t('restore');
            }
        } else {
            container.classList.remove('wplace-minimized');
            content.classList.remove('wplace-hidden');
            if (minimizeBtn) {
                minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
                minimizeBtn.title = t('minimize');
            }
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (!state.imageLoaded) {
                    Utils.showAlert(t('missingRequirements'), 'error');
                    return;
                }

                const success = Utils.saveProgress();
                if (success) {
                    updateUI('autoSaved', 'success');
                    Utils.showAlert(t('autoSaved'), 'success');
                } else {
                    Utils.showAlert(t('errorSavingProgress'), 'error');
                }
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                // Check if initial setup is complete
                if (!state.initialSetupComplete) {
                    Utils.showAlert(t('pleaseWaitInitialSetup'), 'warning');
                    return;
                }

                const savedData = Utils.loadProgress();
                if (!savedData) {
                    updateUI('noSavedData', 'warning');
                    Utils.showAlert(t('noSavedData'), 'warning');
                    return;
                }

                const confirmLoad = confirm(
                    `✅ Saved progress found! Load to continue?\n\n` +
                        `Saved: ${new Date(savedData.timestamp).toLocaleString()}\n` +
                        `Progress: ${savedData.state.paintedPixels}/${savedData.state.totalPixels} pixels`
                );

                if (confirmLoad) {
                    const success = Utils.restoreProgress(savedData);
                    if (success) {
                        updateUI('dataLoaded', 'success');
                        Utils.showAlert(t('dataLoaded'), 'success');
                        updateDataButtons();

                        updateStats();

                        // Restore overlay if image data was loaded from localStorage
                        Utils.restoreOverlayFromData().catch((error) => {
                            console.error('Failed to restore overlay from localStorage:', error);
                        });

                        if (!state.colorsChecked) {
                            uploadBtn.disabled = false;
                        } else {
                            uploadBtn.disabled = false;
                            selectPosBtn.disabled = false;
                        }

                        if (state.imageLoaded && state.startPosition && state.region && state.colorsChecked) {
                            startBtn.disabled = false;
                        }
                    } else {
                        Utils.showAlert(t('errorLoadingProgress'), 'error');
                    }
                }
            });
        }

        updateUI = (messageKey, type = 'default', params = {}, silent = false) => {
            const message = t(messageKey, params);
            statusText.textContent = message;
            statusText.className = `wplace-status status-${type}`;

            if (!silent) {
                // Trigger animation only when silent = false
                statusText.style.animation = 'none';
                void statusText.offsetWidth; // trick to restart the animation
                statusText.style.animation = 'slide-in 0.3s ease-out';
            }
        };

        function updateChargeStatsDisplay(intervalMs) {
            const currentChargesEl = document.getElementById('wplace-stat-charges-value');
            const fullChargeEl = document.getElementById('wplace-stat-fullcharge-value');
            if (!fullChargeEl && !currentChargesEl) return;
            if (!state.fullChargeData) {
                fullChargeEl.textContent = '--:--:--';
                return;
            }

            const { current, max, cooldownMs, startTime, spentSinceShot } = state.fullChargeData;
            const elapsed = Date.now() - startTime;

            // total charges including elapsed time and spent during painting since snapshot
            const chargesGained = elapsed / cooldownMs;
            const rawCharges = current + chargesGained - spentSinceShot;
            const cappedCharges = Math.min(rawCharges, max);

            // rounding with 0.95 threshold
            let displayCharges;
            const fraction = cappedCharges - Math.floor(cappedCharges);
            if (fraction >= 0.95) {
                displayCharges = Math.ceil(cappedCharges);
            } else {
                displayCharges = Math.floor(cappedCharges);
            }

            state.displayCharges = Math.max(0, displayCharges);
            state.preciseCurrentCharges = cappedCharges;

            const remainingMs = getMsToTargetCharges(cappedCharges, max, state.cooldown, intervalMs);
            const timeText = Utils.msToTimeText(remainingMs);

            if (currentChargesEl) {
                currentChargesEl.innerHTML = `${state.displayCharges} / ${state.maxCharges}`;
            }

            if (state.displayCharges < state.cooldownChargeThreshold && !state.stopFlag && state.running) {
                updateChargesThresholdUI(intervalMs);
            }

            if (fullChargeEl) {
                if (state.displayCharges >= max) {
                    fullChargeEl.innerHTML = `<span style="color:#10b981;">FULL</span>`;
                } else {
                    fullChargeEl.innerHTML = `
            <span style="color:#f59e0b;">${timeText}</span>
          `;
                }
            }
        }

        updateStats = async (isManualRefresh = false) => {
            const isForcedRefresh = isManualRefresh;
            const isFirstCheck = !state.fullChargeData?.startTime;

            const minUpdateInterval = 60_000;
            const maxUpdateInterval = 90_000;
            const randomUpdateThreshold = minUpdateInterval + Math.random() * (maxUpdateInterval - minUpdateInterval);
            const timeSinceLastUpdate = Date.now() - (state.fullChargeData?.startTime || 0);
            const isTimeToUpdate = timeSinceLastUpdate >= randomUpdateThreshold;

            const shouldCallApi = isForcedRefresh || isFirstCheck || isTimeToUpdate;

            if (shouldCallApi) {
                const { charges, max, cooldown } = await WPlaceService.getCharges();
                state.displayCharges = Math.floor(charges);
                state.preciseCurrentCharges = charges;
                state.cooldown = cooldown;
                state.maxCharges = Math.floor(max) > 1 ? Math.floor(max) : state.maxCharges;

                state.fullChargeData = {
                    current: charges,
                    max: max,
                    cooldownMs: cooldown,
                    startTime: Date.now(),
                    spentSinceShot: 0,
                };
            }

            if (state.fullChargeInterval) {
                clearInterval(state.fullChargeInterval);
                state.fullChargeInterval = null;
            }
            const intervalMs = 1000;
            state.fullChargeInterval = setInterval(() => updateChargeStatsDisplay(intervalMs), intervalMs);

            if (cooldownSlider && cooldownSlider.max !== state.maxCharges) {
                cooldownSlider.max = state.maxCharges;
            }
            if (cooldownInput && cooldownInput.max !== state.maxCharges) {
                cooldownInput.max = state.maxCharges;
            }

            let imageStatsHTML = '';
            if (state.imageLoaded) {
                const progress =
                    state.totalPixels > 0 ? Math.round((state.paintedPixels / state.totalPixels) * 100) : 0;
                const remainingPixels = state.totalPixels - state.paintedPixels;
                state.estimatedTime = Utils.calculateEstimatedTime(
                    remainingPixels,
                    state.displayCharges,
                    state.cooldown
                );
                progressBar.style.width = `${progress}%`;

                imageStatsHTML = `
          <div class="wplace-stat-item">
            <div class="wplace-stat-label"><i class="fas fa-image"></i> Progress</div>
            <div class="wplace-stat-value">${progress}%</div>
          </div>
          <div class="wplace-stat-item">
            <div class="wplace-stat-label"><i class="fas fa-paint-brush"></i> Pixels</div>
            <div class="wplace-stat-value">${state.paintedPixels}/${state.totalPixels}</div>
          </div>
          <div class="wplace-stat-item">
            <div class="wplace-stat-label"><i class="fas fa-clock"></i> Estimated time</div>
            <div class="wplace-stat-value">${Utils.formatTime(state.estimatedTime)}</div>
          </div>
        `;
            }

            let colorSwatchesHTML = '';
            state.availableColors = state.availableColors.filter(
                (c) => c.name !== 'Unknown CoIor NaN' && c.id !== null
            );

            const availableColors = Utils.extractAvailableColors();
            const newCount = Array.isArray(availableColors) ? availableColors.length : 0;

            if (newCount === 0 && isManualRefresh) {
                Utils.showAlert(t('noColorsFound'), 'warning');
            } else if (newCount > 0 && state.availableColors.length < newCount) {
                const oldCount = state.availableColors.length;

                Utils.showAlert(
                    t('colorsUpdated', {
                        oldCount,
                        newCount: newCount,
                        diffCount: newCount - oldCount,
                    }),
                    'success'
                );
                state.availableColors = availableColors;
            }
            if (state.colorsChecked) {
                colorSwatchesHTML = state.availableColors
                    .map((color) => {
                        const rgbString = `rgb(${color.rgb.join(',')})`;
                        return `<div class="wplace-stat-color-swatch" style="background-color: ${rgbString};" title="${t(
                            'colorTooltip',
                            { id: color.id, rgb: color.rgb.join(', ') }
                        )}"></div>`;
                    })
                    .join('');
            }

            statsArea.innerHTML = `
            ${imageStatsHTML}
            <div class="wplace-stat-item">
              <div class="wplace-stat-label">
                <i class="fas fa-bolt"></i> Charges
              </div>
              <div class="wplace-stat-value" id="wplace-stat-charges-value">
                ${state.displayCharges} / ${state.maxCharges}
              </div>
            </div>
            <div class="wplace-stat-item">
              <div class="wplace-stat-label">
                <i class="fas fa-battery-half"></i> Full Charge In
              </div>
              <div class="wplace-stat-value" id="wplace-stat-fullcharge-value">--:--:--</div>
            </div>
            ${
                state.colorsChecked
                    ? `
            <div class="wplace-colors-section">
                <div class="wplace-stat-label"><i class="fas fa-palette"></i> ${t('availableColors', {
                    count: state.availableColors.length,
                })}</div>
                <div class="wplace-stat-colors-grid">
                    ${colorSwatchesHTML}
                </div>
            </div>
            `
                    : ''
            }
        `;

            // should be after statsArea.innerHTML = '...'. todo make full stats ui update partial
            updateChargeStatsDisplay(intervalMs);
        };

        updateDataButtons = () => {
            const hasImageData = state.imageLoaded && state.imageData;
            saveBtn.disabled = !hasImageData;
        };

        updateDataButtons();

        if (uploadBtn) {
            uploadBtn.addEventListener('click', async () => {
                const availableColors = Utils.extractAvailableColors();
                if (availableColors === null || availableColors.length < 10) {
                    updateUI('noColorsFound', 'error');
                    Utils.showAlert(t('noColorsFound'), 'error');
                    return;
                }

                if (!state.colorsChecked) {
                    state.availableColors = availableColors;
                    state.colorsChecked = true;
                    updateUI('colorsFound', 'success', { count: availableColors.length });
                    updateStats();
                    selectPosBtn.disabled = false;
                }

                try {
                    updateUI('loadingImage', 'default');
                    const imageSrc = await Utils.createImageUploader();
                    if (!imageSrc) {
                        updateUI('colorsFound', 'success', {
                            count: state.availableColors.length,
                        });
                        return;
                    }

                    const processor = new ImageProcessor(imageSrc);
                    await processor.load();

                    const { width, height } = processor.getDimensions();
                    const pixels = processor.getPixelData();

                    let totalValidPixels = 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                        const isTransparent =
                            !state.paintTransparentPixels &&
                            pixels[i + 3] < (state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD);
                        const isWhiteAndSkipped =
                            !state.paintWhitePixels && Utils.isWhitePixel(pixels[i], pixels[i + 1], pixels[i + 2]);
                        if (!isTransparent && !isWhiteAndSkipped) {
                            totalValidPixels++;
                        }
                    }

                    state.imageData = {
                        width,
                        height,
                        pixels,
                        totalPixels: totalValidPixels,
                        processor,
                    };

                    state.totalPixels = totalValidPixels;
                    state.paintedPixels = 0;
                    state.imageLoaded = true;
                    state.lastPosition = { x: 0, y: 0 };

                    // Initialize painted map for tracking
                    Utils.initializePaintedMap(width, height);

                    // Save original image for this browser (dataUrl + dims)
                    state.originalImage = { dataUrl: imageSrc, width, height };
                    saveBotSettings();

                    // Use the original image for the overlay initially
                    const imageBitmap = await createImageBitmap(processor.img);
                    await overlayManager.setImage(imageBitmap);
                    overlayManager.enable();
                    toggleOverlayBtn.disabled = false;
                    toggleOverlayBtn.classList.add('active');
                    toggleOverlayBtn.setAttribute('aria-pressed', 'true');
                    saveBtn.disabled = false;

                    if (state.startPosition) {
                        startBtn.disabled = false;
                    }

                    updateStats();
                    updateDataButtons();
                    updateUI('imageLoaded', 'success', { count: totalValidPixels });
                } catch (error) {
                    console.error('Error processing image:', error);
                    updateUI('imageError', 'error');
                }
            });
        }

        if (selectPosBtn) {
            selectPosBtn.addEventListener('click', async () => {
                if (state.selectingPosition) return;

                state.selectingPosition = true;
                state.startPosition = null;
                state.region = null;
                startBtn.disabled = true;

                Utils.showAlert(t('selectPositionAlert'), 'info');
                updateUI('waitingPosition', 'default');

                const tempFetch = async (url, options) => {
                    if (
                        typeof url === 'string' &&
                        url.includes('https://backend.wplace.live/s0/pixel/') &&
                        options?.method?.toUpperCase() === 'POST'
                    ) {
                        try {
                            const response = await originalFetch(url, options);
                            const clonedResponse = response.clone();
                            const data = await clonedResponse.json();

                            if (data?.painted === 1) {
                                const regionMatch = url.match(/\/pixel\/(\d+)\/(\d+)/);
                                if (regionMatch && regionMatch.length >= 3) {
                                    state.region = {
                                        x: Number.parseInt(regionMatch[1]),
                                        y: Number.parseInt(regionMatch[2]),
                                    };
                                }

                                const payload = JSON.parse(options.body);
                                if (payload?.coords && Array.isArray(payload.coords)) {
                                    state.startPosition = {
                                        x: payload.coords[0],
                                        y: payload.coords[1],
                                    };
                                    state.lastPosition = { x: 0, y: 0 };

                                    await overlayManager.setPosition(state.startPosition, state.region);

                                    if (state.imageLoaded) {
                                        startBtn.disabled = false;
                                    }

                                    window.fetch = originalFetch;
                                    state.selectingPosition = false;
                                    updateUI('positionSet', 'success');
                                }
                            }

                            return response;
                        } catch {
                            return originalFetch(url, options);
                        }
                    }
                    return originalFetch(url, options);
                };

                const originalFetch = window.fetch;
                window.fetch = tempFetch;

                setTimeout(() => {
                    if (state.selectingPosition) {
                        window.fetch = originalFetch;
                        state.selectingPosition = false;
                        updateUI('positionTimeout', 'error');
                        Utils.showAlert(t('positionTimeout'), 'error');
                    }
                }, 120000);
            });
        }

        async function startPainting() {
            if (!state.imageLoaded || !state.startPosition || !state.region) {
                updateUI('missingRequirements', 'error');
                return;
            }
            await ensureToken();
            if (!turnstileToken) return;

            state.running = true;
            state.stopFlag = false;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            uploadBtn.disabled = true;
            selectPosBtn.disabled = true;
            saveBtn.disabled = true;
            toggleOverlayBtn.disabled = true;

            updateUI('startPaintingMsg', 'success');

            try {
                await processImage();
            } catch (e) {
                console.error('Unexpected error:', e);
                updateUI('paintingError', 'error');
            } finally {
                state.running = false;
                stopBtn.disabled = true;
                saveBtn.disabled = false;

                if (state.stopFlag) {
                    startBtn.disabled = false;
                } else {
                    startBtn.disabled = true;
                    uploadBtn.disabled = false;
                    selectPosBtn.disabled = false;
                }
                toggleOverlayBtn.disabled = false;
            }
        }

        if (startBtn) {
            startBtn.addEventListener('click', startPainting);
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', () => {
                state.stopFlag = true;
                state.running = false;
                stopBtn.disabled = true;
                updateUI('paintingStoppedByUser', 'warning');

                if (state.imageLoaded && state.paintedPixels > 0) {
                    Utils.saveProgress();
                    Utils.showAlert(t('autoSaved'), 'success');
                }
            });
        }

        const checkSavedProgress = () => {
            const savedData = Utils.loadProgress();
            if (savedData && savedData.state.paintedPixels > 0) {
                const savedDate = new Date(savedData.timestamp).toLocaleString();
                const progress = Math.round((savedData.state.paintedPixels / savedData.state.totalPixels) * 100);

                Utils.showAlert(
                    `✅ Saved progress found! Load to continue?\n\n` +
                        `Saved: ${savedDate}\n` +
                        `Progress: ${savedData.state.paintedPixels}/${savedData.state.totalPixels} pixels (${progress}%)\n` +
                        `Click 'Load Progress' to continue.`,
                    'info'
                );
            }
        };

        setTimeout(checkSavedProgress, 1000);

        if (cooldownSlider && cooldownInput && cooldownValue && cooldownDecrease && cooldownIncrease) {
            const updateCooldown = (newValue) => {
                const threshold = Math.max(1, Math.min(state.maxCharges || 999, parseInt(newValue)));
                state.cooldownChargeThreshold = threshold;

                // Update both controls (value shows in input, label shows unit only)
                cooldownSlider.value = threshold;
                cooldownInput.value = threshold;
                cooldownValue.textContent = 'Charges';

                saveBotSettings();
            };

            // Slider event listener
            cooldownSlider.addEventListener('input', (e) => {
                updateCooldown(e.target.value);
            });

            // Number input event listener
            cooldownInput.addEventListener('input', (e) => {
                updateCooldown(e.target.value);
            });

            // Decrease button
            cooldownDecrease.addEventListener('click', () => {
                updateCooldown(parseInt(cooldownInput.value) - 1);
            });

            // Increase button
            cooldownIncrease.addEventListener('click', () => {
                updateCooldown(parseInt(cooldownInput.value) + 1);
            });

            // Add scroll-to-adjust for cooldown slider
            Utils.createScrollToAdjust(cooldownSlider, updateCooldown, 1, state.maxCharges, 1);
        }

        loadBotSettings();
    }

    function getMsToTargetCharges(current, target, cooldown, intervalMs = 0) {
        const remainingCharges = target - current;
        return Math.max(0, remainingCharges * cooldown - intervalMs);
    }

    function updateChargesThresholdUI(intervalMs) {
        if (state.stopFlag) return;

        const threshold = state.cooldownChargeThreshold;
        const remainingMs = getMsToTargetCharges(state.preciseCurrentCharges, threshold, state.cooldown, intervalMs);
        const timeText = Utils.msToTimeText(remainingMs);

        updateUI(
            'noChargesThreshold',
            'warning',
            {
                threshold,
                current: state.displayCharges,
                time: timeText,
            },
            true
        );
    }

    function generateCoordinates(width, height, mode, direction, snake, blockWidth, blockHeight) {
        const coords = [];
        console.log(
            'Generating coordinates with \n  mode:',
            mode,
            '\n  direction:',
            direction,
            '\n  snake:',
            snake,
            '\n  blockWidth:',
            blockWidth,
            '\n  blockHeight:',
            blockHeight
        );
        // --------- Standard 4 corners traversal ----------
        let xStart, xEnd, xStep;
        let yStart, yEnd, yStep;
        switch (direction) {
            case 'top-left':
                xStart = 0;
                xEnd = width;
                xStep = 1;
                yStart = 0;
                yEnd = height;
                yStep = 1;
                break;
            case 'top-right':
                xStart = width - 1;
                xEnd = -1;
                xStep = -1;
                yStart = 0;
                yEnd = height;
                yStep = 1;
                break;
            case 'bottom-left':
                xStart = 0;
                xEnd = width;
                xStep = 1;
                yStart = height - 1;
                yEnd = -1;
                yStep = -1;
                break;
            case 'bottom-right':
                xStart = width - 1;
                xEnd = -1;
                xStep = -1;
                yStart = height - 1;
                yEnd = -1;
                yStep = -1;
                break;
            default:
                throw new Error(`Unknown direction: ${direction}`);
        }

        // --------- Traversal modes ----------
        if (mode === 'rows') {
            for (let y = yStart; y !== yEnd; y += yStep) {
                if (snake && (y - yStart) % 2 !== 0) {
                    for (let x = xEnd - xStep; x !== xStart - xStep; x -= xStep) {
                        coords.push([x, y]);
                    }
                } else {
                    for (let x = xStart; x !== xEnd; x += xStep) {
                        coords.push([x, y]);
                    }
                }
            }
        } else if (mode === 'columns') {
            for (let x = xStart; x !== xEnd; x += xStep) {
                if (snake && (x - xStart) % 2 !== 0) {
                    for (let y = yEnd - yStep; y !== yStart - yStep; y -= yStep) {
                        coords.push([x, y]);
                    }
                } else {
                    for (let y = yStart; y !== yEnd; y += yStep) {
                        coords.push([x, y]);
                    }
                }
            }
        } else if (mode === 'circle-out') {
            const cx = Math.floor(width / 2);
            const cy = Math.floor(height / 2);
            const maxRadius = Math.ceil(Math.sqrt(cx * cx + cy * cy));

            for (let r = 0; r <= maxRadius; r++) {
                for (let y = cy - r; y <= cy + r; y++) {
                    for (let x = cx - r; x <= cx + r; x++) {
                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            const dist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
                            if (dist === r) coords.push([x, y]);
                        }
                    }
                }
            }
        } else if (mode === 'circle-in') {
            const cx = Math.floor(width / 2);
            const cy = Math.floor(height / 2);
            const maxRadius = Math.ceil(Math.sqrt(cx * cx + cy * cy));

            for (let r = maxRadius; r >= 0; r--) {
                for (let y = cy - r; y <= cy + r; y++) {
                    for (let x = cx - r; x <= cx + r; x++) {
                        if (x >= 0 && x < width && y >= 0 && y < height) {
                            const dist = Math.max(Math.abs(x - cx), Math.abs(y - cy));
                            if (dist === r) coords.push([x, y]);
                        }
                    }
                }
            }
        } else if (mode === 'blocks' || mode === 'shuffle-blocks') {
            const blocks = [];
            for (let by = 0; by < height; by += blockHeight) {
                for (let bx = 0; bx < width; bx += blockWidth) {
                    const block = [];
                    for (let y = by; y < Math.min(by + blockHeight, height); y++) {
                        for (let x = bx; x < Math.min(bx + blockWidth, width); x++) {
                            block.push([x, y]);
                        }
                    }
                    blocks.push(block);
                }
            }

            if (mode === 'shuffle-blocks') {
                // Simple Fisher-Yates shuffle
                for (let i = blocks.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
                }
            }

            // Concatenate all blocks
            for (const block of blocks) {
                coords.push(...block);
            }
        } else {
            throw new Error(`Unknown mode: ${mode}`);
        }

        return coords;
    }

    async function flushPixelBatch(pixelBatch) {
        if (!pixelBatch || pixelBatch.pixels.length === 0) return true;

        const batchSize = pixelBatch.pixels.length;
        console.log(`📦 Sending batch with ${batchSize} pixels (region: ${pixelBatch.regionX},${pixelBatch.regionY})`);
        const success = await sendBatchWithRetry(pixelBatch.pixels, pixelBatch.regionX, pixelBatch.regionY);
        if (success) {
            pixelBatch.pixels.forEach((p) => {
                state.paintedPixels++;
                Utils.markPixelPainted(p.x, p.y, pixelBatch.regionX, pixelBatch.regionY);
            });
            state.fullChargeData = {
                ...state.fullChargeData,
                spentSinceShot: state.fullChargeData.spentSinceShot + batchSize,
            };
            updateStats();
            updateUI('paintingProgress', 'default', {
                painted: state.paintedPixels,
                total: state.totalPixels,
            });
            Utils.performSmartSave();

            if (CONFIG.PAINTING_SPEED_ENABLED && state.paintingSpeed > 0 && batchSize > 0) {
                const delayPerPixel = 1000 / state.paintingSpeed;
                const totalDelay = Math.max(100, delayPerPixel * batchSize);
                await Utils.sleep(totalDelay);
            }
        } else {
            console.error(`❌ Batch failed permanently after retries. Stopping painting.`);
            state.stopFlag = true;
            updateUI('paintingBatchFailed', 'error');
        }

        pixelBatch.pixels = [];
        return success;
    }

    async function processImage() {
        const { width, height, pixels } = state.imageData;
        const { x: startX, y: startY } = state.startPosition;
        const { x: regionX, y: regionY } = state.region;

        // todo force load tiles
        const tilesReady = await overlayManager.waitForTiles(
            regionX,
            regionY,
            width,
            height,
            startX,
            startY,
            10000 // timeout 10s
        );

        if (!tilesReady) {
            updateUI('overlayTilesNotLoaded', 'error');
            state.stopFlag = true;
            return;
        }

        let pixelBatch = null;
        let skippedPixels = {
            transparent: 0,
            white: 0,
            alreadyPainted: 0,
            colorUnavailable: 0,
        };

        const transparencyThreshold = state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;

        function checkPixelEligibility(x, y) {
            const idx = (y * width + x) * 4;
            const r = pixels[idx],
                g = pixels[idx + 1],
                b = pixels[idx + 2],
                a = pixels[idx + 3];

            if (!state.paintTransparentPixels && a < transparencyThreshold)
                return {
                    eligible: false,
                    reason: 'transparent',
                };
            if (!state.paintWhitePixels && Utils.isWhitePixel(r, g, b))
                return {
                    eligible: false,
                    reason: 'white',
                };

            let targetRgb = Utils.isWhitePixel(r, g, b)
                ? [255, 255, 255]
                : Utils.findClosestPaletteColor(r, g, b, state.activeColorPalette);

            // Template color ID, normalized/mapped to the nearest available color in our palette.
            // Example: template requires "Slate", but we only have "Dark Gray" available
            // → mappedTargetColorId = ID of Dark Gray.
            //
            // If `state.paintUnavailablePixels` is enabled, the painting would stop earlier
            // because "Slate" was not found (null returned).
            //
            // Else, the template "Slate" is mapped to the closest available color (e.g., "Dark Gray"),
            // and we proceed with painting using that mapped color.
            //
            // In this case, if the canvas pixel is already Slate (mapped to available Dark Gray),
            // we skip painting, since template and canvas both resolve to the same available color (Dark Gray).
            const mappedTargetColorId = Utils.resolveColor(
                targetRgb,
                state.availableColors,
                !state.paintUnavailablePixels
            );

            // Technically, checking only `!mappedTargetColorId.id` would be enough,
            // but combined with `state.paintUnavailablePixels` it makes the logic explicit:
            // we only skip when the template color cannot be mapped AND strict mode is on.
            if (!state.paintUnavailablePixels && !mappedTargetColorId.id) {
                return {
                    eligible: false,
                    reason: 'colorUnavailable',
                    r,
                    g,
                    b,
                    a,
                    mappedColorId: mappedTargetColorId.id,
                };
            }
            return { eligible: true, r, g, b, a, mappedColorId: mappedTargetColorId.id };
        }

        function skipPixel(reason, id, rgb, x, y) {
            if (reason !== 'transparent') {
                console.log(`Skipped pixel for ${reason} (id: ${id}, (${rgb.join(', ')})) at (${x}, ${y})`);
            }
            skippedPixels[reason]++;
        }

        try {
            const coords = generateCoordinates(
                width,
                height,
                state.coordinateMode,
                state.coordinateDirection,
                state.coordinateSnake,
                state.blockWidth,
                state.blockHeight
            );

            outerLoop: for (const [x, y] of coords) {
                if (state.stopFlag) {
                    if (pixelBatch && pixelBatch.pixels.length > 0) {
                        console.log(`🎯 Sending last batch before stop with ${pixelBatch.pixels.length} pixels`);
                        await flushPixelBatch(pixelBatch);
                    }
                    state.lastPosition = { x, y };
                    updateUI('paintingPaused', 'warning', { x, y });
                    // noinspection UnnecessaryLabelOnBreakStatementJS
                    break outerLoop;
                }

                const targetPixelInfo = checkPixelEligibility(x, y);
                let absX = startX + x;
                let absY = startY + y;

                let adderX = Math.floor(absX / 1000);
                let adderY = Math.floor(absY / 1000);
                let pixelX = absX % 1000;
                let pixelY = absY % 1000;

                // Template color ID, normalized/mapped to the nearest available color in our palette.
                // Example: template requires "Slate", but we only have "Dark Gray" available
                // → mappedTargetColorId = ID of Dark Gray.
                //
                // If `state.paintUnavailablePixels` is enabled, the painting would stop earlier
                // because "Slate" was not found (null returned).
                //
                // Else, the template "Slate" is mapped to the closest available color (e.g., "Dark Gray"),
                // and we proceed with painting using that mapped color.
                //
                // In this case, if the canvas pixel is already Slate (mapped to available Dark Gray),
                // we skip painting, since template and canvas both resolve to the same available color (Dark Gray).
                const targetMappedColorId = targetPixelInfo.mappedColorId;

                if (!targetPixelInfo.eligible) {
                    skipPixel(
                        targetPixelInfo.reason,
                        targetMappedColorId,
                        [targetPixelInfo.r, targetPixelInfo.g, targetPixelInfo.b],
                        pixelX,
                        pixelY
                    );
                    continue;
                }

                // console.log(`[DEBUG] Pixel at (${pixelX}, ${pixelY}) eligible: RGB=${targetPixelInfo.r}, ${targetPixelInfo.g}, ${targetPixelInfo.b},
                //  alpha=${targetPixelInfo.a}, mappedColorId=${targetMappedColorId}`);

                if (!pixelBatch || pixelBatch.regionX !== regionX + adderX || pixelBatch.regionY !== regionY + adderY) {
                    if (pixelBatch && pixelBatch.pixels.length > 0) {
                        console.log(
                            `🌍 Sending region-change batch with ${
                                pixelBatch.pixels.length
                            } pixels (switching to region ${regionX + adderX},${regionY + adderY})`
                        );
                        const success = await flushPixelBatch(pixelBatch);

                        if (success) {
                            if (
                                CONFIG.PAINTING_SPEED_ENABLED &&
                                state.paintingSpeed > 0 &&
                                pixelBatch.pixels.length > 0
                            ) {
                                const batchDelayFactor = Math.max(1, 100 / state.paintingSpeed);
                                const totalDelay = Math.max(100, batchDelayFactor * pixelBatch.pixels.length);
                                await Utils.sleep(totalDelay);
                            }
                            updateStats();
                        } else {
                            console.error(`❌ Batch failed permanently after retries. Stopping painting.`);
                            state.stopFlag = true;
                            updateUI('paintingBatchFailed', 'error');
                            // noinspection UnnecessaryLabelOnBreakStatementJS
                            break outerLoop;
                        }
                    }

                    pixelBatch = {
                        regionX: regionX + adderX,
                        regionY: regionY + adderY,
                        pixels: [],
                    };
                }

                try {
                    const tileKeyParts = [pixelBatch.regionX, pixelBatch.regionY];

                    const tilePixelRGBA = await overlayManager.getTilePixelColor(
                        tileKeyParts[0],
                        tileKeyParts[1],
                        pixelX,
                        pixelY
                    );

                    if (tilePixelRGBA && Array.isArray(tilePixelRGBA)) {
                        // Resolve the actual canvas pixel color to the closest available color.
                        // (The raw canvas RGB [er, eg, eb] is mapped into state.availableColors)
                        // so that comparison is consistent with targetMappedColorId.
                        const mappedCanvasColor = Utils.resolveColor(tilePixelRGBA.slice(0, 3), state.availableColors);
                        const isMatch = mappedCanvasColor.id === targetMappedColorId;
                        if (isMatch) {
                            skipPixel(
                                'alreadyPainted',
                                targetMappedColorId,
                                [targetPixelInfo.r, targetPixelInfo.g, targetPixelInfo.b],
                                pixelX,
                                pixelY
                            );
                            continue;
                        }
                        console.debug(
                            `[COMPARE] Pixel at 📍 (${pixelX}, ${pixelY}) in region (${regionX + adderX}, ${
                                regionY + adderY
                            })\n` +
                                `  ├── Current color: rgb(${tilePixelRGBA.slice(0, 3).join(', ')}) (id: ${
                                    mappedCanvasColor.id
                                })\n` +
                                `  ├── Target color:  rgb(${targetPixelInfo.r}, ${targetPixelInfo.g}, ${targetPixelInfo.b}) (id: ${targetMappedColorId})\n` +
                                `  └── Status: ${isMatch ? '✅ Already painted → SKIP' : '🔴 Needs paint → PAINT'}\n`
                        );
                    }
                } catch (e) {
                    console.error(`[DEBUG] Error checking existing pixel at (${pixelX}, ${pixelY}):`, e);
                    updateUI('paintingPixelCheckFailed', 'error', { x: pixelX, y: pixelY });
                    state.stopFlag = true;
                    // noinspection UnnecessaryLabelOnBreakStatementJS
                    break outerLoop;
                }

                pixelBatch.pixels.push({
                    x: pixelX,
                    y: pixelY,
                    color: targetMappedColorId,
                    localX: x,
                    localY: y,
                });

                const maxBatchSize = calculateBatchSize();
                if (pixelBatch.pixels.length >= maxBatchSize) {
                    const modeText =
                        state.batchMode === 'random'
                            ? `random (${state.randomBatchMin}-${state.randomBatchMax})`
                            : 'normal';
                    console.log(
                        `📦 Sending batch with ${pixelBatch.pixels.length} pixels (mode: ${modeText}, target: ${maxBatchSize})`
                    );
                    const success = await flushPixelBatch(pixelBatch);
                    if (!success) {
                        console.error(`❌ Batch failed permanently after retries. Stopping painting.`);
                        state.stopFlag = true;
                        updateUI('paintingBatchFailed', 'error');
                        // noinspection UnnecessaryLabelOnBreakStatementJS
                        break outerLoop;
                    }

                    pixelBatch.pixels = [];
                }

                if (state.displayCharges < state.cooldownChargeThreshold && !state.stopFlag) {
                    await Utils.dynamicSleep(() => {
                        if (state.displayCharges >= state.cooldownChargeThreshold) {
                            return 0;
                        }
                        if (state.stopFlag) return 0;
                        return getMsToTargetCharges(
                            state.preciseCurrentCharges,
                            state.cooldownChargeThreshold,
                            state.cooldown
                        );
                    });
                }

                if (state.stopFlag) {
                    // noinspection UnnecessaryLabelOnBreakStatementJS
                    break outerLoop;
                }
            }

            if (pixelBatch && pixelBatch.pixels.length > 0 && !state.stopFlag) {
                console.log(`🏁 Sending final batch with ${pixelBatch.pixels.length} pixels`);
                const success = await flushPixelBatch(pixelBatch);
                if (!success) {
                    console.warn(`⚠️ Final batch failed with ${pixelBatch.pixels.length} pixels after all retries.`);
                }
            }
        } finally {
            if (window._chargesInterval) clearInterval(window._chargesInterval);
            window._chargesInterval = null;
        }

        if (state.stopFlag) {
            // Save progress when stopped to preserve painted map
            Utils.saveProgress();
        } else {
            updateUI('paintingComplete', 'success', { count: state.paintedPixels });
            state.lastPosition = { x: 0, y: 0 };
            // Keep painted map until user starts new project
            // state.paintedMap = null  // Commented out to preserve data
            Utils.saveProgress(); // Save final complete state
            overlayManager.clear();
            const toggleOverlayBtn = document.getElementById('toggleOverlayBtn');
            if (toggleOverlayBtn) {
                toggleOverlayBtn.classList.remove('active');
                toggleOverlayBtn.disabled = true;
            }
        }

        // Log skip statistics
        console.log(`📊 Pixel Statistics:`);
        console.log(`   Painted: ${state.paintedPixels}`);
        console.log(`   Skipped - Transparent: ${skippedPixels.transparent}`);
        console.log(`   Skipped - White (disabled): ${skippedPixels.white}`);
        console.log(`   Skipped - Already painted: ${skippedPixels.alreadyPainted}`);
        console.log(`   Skipped - Color Unavailable: ${skippedPixels.colorUnavailable}`);
        console.log(
            `   Total processed: ${
                state.paintedPixels +
                skippedPixels.transparent +
                skippedPixels.white +
                skippedPixels.alreadyPainted +
                skippedPixels.colorUnavailable
            }`
        );

        updateStats();
    }

    // Helper function to calculate batch size based on mode
    function calculateBatchSize() {
        let targetBatchSize;

        if (state.batchMode === 'random') {
            // Generate random batch size within the specified range
            const min = Math.max(1, state.randomBatchMin);
            const max = Math.max(min, state.randomBatchMax);
            targetBatchSize = Math.floor(Math.random() * (max - min + 1)) + min;
            console.log(`🎲 Random batch size generated: ${targetBatchSize} (range: ${min}-${max})`);
        } else {
            // Normal mode - use the fixed paintingSpeed value
            targetBatchSize = state.paintingSpeed;
        }

        // Always limit by available charges
        const maxAllowed = state.displayCharges;
        const finalBatchSize = Math.min(targetBatchSize, maxAllowed);

        return finalBatchSize;
    }

    // Helper function to retry batch until success with exponential backoff
    async function sendBatchWithRetry(pixels, regionX, regionY, maxRetries = MAX_BATCH_RETRIES) {
        let attempt = 0;
        while (attempt < maxRetries && !state.stopFlag) {
            attempt++;
            console.log(
                `🔄 Attempting to send batch (attempt ${attempt}/${maxRetries}) for region ${regionX},${regionY} with ${pixels.length} pixels`
            );

            const result = await sendPixelBatch(pixels, regionX, regionY);

            if (result === true) {
                console.log(`✅ Batch succeeded on attempt ${attempt}`);
                return true;
            } else if (result === 'token_error') {
                console.log(`🔑 Token error on attempt ${attempt}, regenerating...`);
                updateUI('captchaSolving', 'warning');
                try {
                    await handleCaptcha();
                    // Don't count token regeneration as a failed attempt
                    attempt--;
                    continue;
                } catch (e) {
                    console.error(`❌ Token regeneration failed on attempt ${attempt}:`, e);
                    updateUI('captchaFailed', 'error');
                    // Wait longer before retrying after token failure
                    await Utils.sleep(5000);
                }
            } else {
                console.warn(`⚠️ Batch failed on attempt ${attempt}, retrying...`);
                // Exponential backoff with jitter
                const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
                const jitter = Math.random() * 1000; // Add up to 1s random delay
                await Utils.sleep(baseDelay + jitter);
            }
        }

        if (attempt >= maxRetries) {
            console.error(
                `❌ Batch failed after ${maxRetries} attempts (MAX_BATCH_RETRIES=${MAX_BATCH_RETRIES}). This will stop painting to prevent infinite loops.`
            );
            updateUI('paintingError', 'error');
            return false;
        }

        return false;
    }

    async function sendPixelBatch(pixelBatch, regionX, regionY) {
        let token = turnstileToken;

        // Generate new token if we don't have one
        if (!token) {
            try {
                console.log('🔑 Generating Turnstile token for pixel batch...');
                token = await handleCaptcha();
                turnstileToken = token; // Store for potential reuse
            } catch (error) {
                console.error('❌ Failed to generate Turnstile token:', error);
                tokenPromise = new Promise((resolve) => {
                    _resolveToken = resolve;
                });
                return 'token_error';
            }
        }

        const coords = new Array(pixelBatch.length * 2);
        const colors = new Array(pixelBatch.length);
        for (let i = 0; i < pixelBatch.length; i++) {
            const pixel = pixelBatch[i];
            coords[i * 2] = pixel.x;
            coords[i * 2 + 1] = pixel.y;
            colors[i] = pixel.color;
        }

        try {
            const payload = { coords, colors, t: token };

            const res = await fetch(`https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (res.status === 403) {
                let data = null;
                try {
                    data = await res.json();
                } catch (_) {}
                console.error('❌ 403 Forbidden. Turnstile token might be invalid or expired.');

                // Try to generate a new token and retry once
                try {
                    console.log('🔄 Regenerating Turnstile token after 403...');
                    token = await handleCaptcha();
                    turnstileToken = token;

                    // Retry the request with new token
                    const retryPayload = { coords, colors, t: token };
                    const retryRes = await fetch(`https://backend.wplace.live/s0/pixel/${regionX}/${regionY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                        credentials: 'include',
                        body: JSON.stringify(retryPayload),
                    });

                    if (retryRes.status === 403) {
                        turnstileToken = null;
                        tokenPromise = new Promise((resolve) => {
                            _resolveToken = resolve;
                        });
                        return 'token_error';
                    }

                    const retryData = await retryRes.json();
                    return retryData?.painted === pixelBatch.length;
                } catch (retryError) {
                    console.error('❌ Token regeneration failed:', retryError);
                    turnstileToken = null;
                    tokenPromise = new Promise((resolve) => {
                        _resolveToken = resolve;
                    });
                    return 'token_error';
                }
            }

            const data = await res.json();
            return data?.painted === pixelBatch.length;
        } catch (e) {
            console.error('Batch paint request failed:', e);
            return false;
        }
    }

    function saveBotSettings() {
        try {
            const settings = {
                paintingSpeed: state.paintingSpeed,
                paintingSpeedEnabled: document.getElementById('enableSpeedToggle')?.checked,
                batchMode: state.batchMode, // "normal" or "random"
                randomBatchMin: state.randomBatchMin,
                randomBatchMax: state.randomBatchMax,
                cooldownChargeThreshold: state.cooldownChargeThreshold,
                tokenSource: state.tokenSource, // "generator", "hybrid", or "manual"
                minimized: state.minimized,
                overlayOpacity: state.overlayOpacity,
                blueMarbleEnabled: document.getElementById('enableBlueMarbleToggle')?.checked,
                ditheringEnabled: state.ditheringEnabled,
                colorMatchingAlgorithm: state.colorMatchingAlgorithm,
                enableChromaPenalty: state.enableChromaPenalty,
                chromaPenaltyWeight: state.chromaPenaltyWeight,
                customTransparencyThreshold: state.customTransparencyThreshold,
                customWhiteThreshold: state.customWhiteThreshold,
                paintWhitePixels: state.paintWhitePixels,
                paintTransparentPixels: state.paintTransparentPixels,
                paintUnavailablePixels: state.paintUnavailablePixels,
                coordinateMode: state.coordinateMode,
                coordinateDirection: state.coordinateDirection,
                coordinateSnake: state.coordinateSnake,
                blockWidth: state.blockWidth,
                blockHeight: state.blockHeight, // Save ignore mask (as base64) with its dimensions
                originalImage: state.originalImage,
            };
            CONFIG.PAINTING_SPEED_ENABLED = settings.paintingSpeedEnabled;
            // AUTO_CAPTCHA_ENABLED is always true - no need to save/load

            localStorage.setItem('wplace-bot-settings', JSON.stringify(settings));
        } catch (e) {
            console.warn('Could not save bot settings:', e);
        }
    }

    function loadBotSettings() {
        try {
            const saved = localStorage.getItem('wplace-bot-settings');
            if (!saved) return;
            const settings = JSON.parse(saved);

            state.paintingSpeed = settings.paintingSpeed || CONFIG.PAINTING_SPEED.DEFAULT;
            state.batchMode = settings.batchMode || CONFIG.BATCH_MODE; // Default to "normal"
            state.randomBatchMin = settings.randomBatchMin || CONFIG.RANDOM_BATCH_RANGE.MIN;
            state.randomBatchMax = settings.randomBatchMax || CONFIG.RANDOM_BATCH_RANGE.MAX;
            state.cooldownChargeThreshold = settings.cooldownChargeThreshold || CONFIG.COOLDOWN_CHARGE_THRESHOLD;
            state.tokenSource = settings.tokenSource || CONFIG.TOKEN_SOURCE; // Default to "generator"
            state.minimized = settings.minimized ?? false;
            CONFIG.PAINTING_SPEED_ENABLED = settings.paintingSpeedEnabled ?? false;
            CONFIG.AUTO_CAPTCHA_ENABLED = settings.autoCaptchaEnabled ?? false;
            state.overlayOpacity = settings.overlayOpacity ?? CONFIG.OVERLAY.OPACITY_DEFAULT;
            state.blueMarbleEnabled = settings.blueMarbleEnabled ?? CONFIG.OVERLAY.BLUE_MARBLE_DEFAULT;
            state.ditheringEnabled = settings.ditheringEnabled ?? false;
            state.colorMatchingAlgorithm = settings.colorMatchingAlgorithm || 'lab';
            state.enableChromaPenalty = settings.enableChromaPenalty ?? true;
            state.chromaPenaltyWeight = settings.chromaPenaltyWeight ?? 0.15;
            state.customTransparencyThreshold = settings.customTransparencyThreshold ?? CONFIG.TRANSPARENCY_THRESHOLD;
            state.customWhiteThreshold = settings.customWhiteThreshold ?? CONFIG.WHITE_THRESHOLD;
            state.paintWhitePixels = settings.paintWhitePixels ?? true;
            state.paintTransparentPixels = settings.paintTransparentPixels ?? false;
            state.originalImage = settings.originalImage ?? null;
            state.paintUnavailablePixels = settings.paintUnavailablePixels ?? CONFIG.PAINT_UNAVAILABLE;
            state.coordinateMode = settings.coordinateMode ?? CONFIG.COORDINATE_MODE;
            state.coordinateDirection = settings.coordinateDirection ?? CONFIG.COORDINATE_DIRECTION;
            state.coordinateSnake = settings.coordinateSnake ?? CONFIG.COORDINATE_SNAKE;
            state.blockWidth = settings.blockWidth ?? CONFIG.COORDINATE_BLOCK_WIDTH;
            state.blockHeight = settings.blockHeight ?? CONFIG.COORDINATE_BLOCK_HEIGHT;
            // Initialize coordinate generation UI
            const coordinateModeSelect = document.getElementById('coordinateModeSelect');
            if (coordinateModeSelect) coordinateModeSelect.value = state.coordinateMode;

            const coordinateDirectionSelect = document.getElementById('coordinateDirectionSelect');
            if (coordinateDirectionSelect) coordinateDirectionSelect.value = state.coordinateDirection;

            const coordinateSnakeToggle = document.getElementById('coordinateSnakeToggle');
            if (coordinateSnakeToggle) coordinateSnakeToggle.checked = state.coordinateSnake;

            const settingsContainer = document.getElementById('wplace-settings-container');
            const directionControls = settingsContainer.querySelector('#directionControls');
            const snakeControls = settingsContainer.querySelector('#snakeControls');
            const blockControls = settingsContainer.querySelector('#blockControls');
            Utils.updateCoordinateUI({
                mode: state.coordinateMode,
                directionControls,
                snakeControls,
                blockControls,
            });

            const paintUnavailablePixelsToggle = document.getElementById('paintUnavailablePixelsToggle');
            if (paintUnavailablePixelsToggle) {
                paintUnavailablePixelsToggle.checked = state.paintUnavailablePixels;
            }

            const settingsPaintWhiteToggle = settingsContainer.querySelector('#settingsPaintWhiteToggle');
            if (settingsPaintWhiteToggle) {
                settingsPaintWhiteToggle.checked = state.paintWhitePixels;
            }

            const settingsPaintTransparentToggle = settingsContainer.querySelector('#settingsPaintTransparentToggle');
            if (settingsPaintTransparentToggle) {
                settingsPaintTransparentToggle.checked = state.paintTransparentPixels;
            }

            const speedSlider = document.getElementById('speedSlider');
            const speedInput = document.getElementById('speedInput');
            const speedValue = document.getElementById('speedValue');
            if (speedSlider) speedSlider.value = state.paintingSpeed;
            if (speedInput) speedInput.value = state.paintingSpeed;
            if (speedValue) speedValue.textContent = `pixels`;

            const enableSpeedToggle = document.getElementById('enableSpeedToggle');
            if (enableSpeedToggle) enableSpeedToggle.checked = CONFIG.PAINTING_SPEED_ENABLED;

            // Batch mode UI initialization
            const batchModeSelect = document.getElementById('batchModeSelect');
            if (batchModeSelect) batchModeSelect.value = state.batchMode;

            const normalBatchControls = document.getElementById('normalBatchControls');
            const randomBatchControls = document.getElementById('randomBatchControls');

            // Show/hide appropriate controls based on batch mode
            if (normalBatchControls && randomBatchControls) {
                if (state.batchMode === 'random') {
                    normalBatchControls.style.display = 'none';
                    randomBatchControls.style.display = 'block';
                } else {
                    normalBatchControls.style.display = 'block';
                    randomBatchControls.style.display = 'none';
                }
            }

            const randomBatchMin = document.getElementById('randomBatchMin');
            if (randomBatchMin) randomBatchMin.value = state.randomBatchMin;

            const randomBatchMax = document.getElementById('randomBatchMax');
            if (randomBatchMax) randomBatchMax.value = state.randomBatchMax;

            // AUTO_CAPTCHA_ENABLED is always true - no toggle to set

            const cooldownSlider = document.getElementById('cooldownSlider');
            const cooldownInput = document.getElementById('cooldownInput');
            const cooldownValue = document.getElementById('cooldownValue');
            if (cooldownSlider) cooldownSlider.value = state.cooldownChargeThreshold;
            if (cooldownInput) cooldownInput.value = state.cooldownChargeThreshold;
            if (cooldownValue) cooldownValue.textContent = 'Charges';

            const overlayOpacitySlider = document.getElementById('overlayOpacitySlider');
            if (overlayOpacitySlider) overlayOpacitySlider.value = state.overlayOpacity;
            const overlayOpacityValue = document.getElementById('overlayOpacityValue');
            if (overlayOpacityValue) overlayOpacityValue.textContent = `${Math.round(state.overlayOpacity * 100)}%`;
            const enableBlueMarbleToggle = document.getElementById('enableBlueMarbleToggle');
            if (enableBlueMarbleToggle) enableBlueMarbleToggle.checked = state.blueMarbleEnabled;

            const tokenSourceSelect = document.getElementById('tokenSourceSelect');
            if (tokenSourceSelect) tokenSourceSelect.value = state.tokenSource;

            const colorAlgorithmSelect = document.getElementById('colorAlgorithmSelect');
            if (colorAlgorithmSelect) colorAlgorithmSelect.value = state.colorMatchingAlgorithm;
            const enableChromaPenaltyToggle = document.getElementById('enableChromaPenaltyToggle');
            if (enableChromaPenaltyToggle) enableChromaPenaltyToggle.checked = state.enableChromaPenalty;
            const chromaPenaltyWeightSlider = document.getElementById('chromaPenaltyWeightSlider');
            if (chromaPenaltyWeightSlider) chromaPenaltyWeightSlider.value = state.chromaPenaltyWeight;
            const chromaWeightValue = document.getElementById('chromaWeightValue');
            if (chromaWeightValue) chromaWeightValue.textContent = state.chromaPenaltyWeight;
            const transparencyThresholdInput = document.getElementById('transparencyThresholdInput');
            if (transparencyThresholdInput) transparencyThresholdInput.value = state.customTransparencyThreshold;
            const whiteThresholdInput = document.getElementById('whiteThresholdInput');
            if (whiteThresholdInput) whiteThresholdInput.value = state.customWhiteThreshold;
        } catch (e) {
            console.warn('Could not load bot settings:', e);
        }
    }

    // Initialize Turnstile generator integration
    console.log('🚀 WPlace Auto-Image with Turnstile Token Generator loaded');
    console.log('🔑 Turnstile token generator: ALWAYS ENABLED (Background mode)');
    console.log('🎯 Manual pixel captcha solving: Available as fallback/alternative');
    console.log('📱 Turnstile widgets: DISABLED - pure background token generation only!');

    // Function to enable file operations after initial startup setup is complete
    function enableProgressDataOperations() {
        state.initialSetupComplete = true;

        const loadBtn = document.querySelector('#loadBtn');
        const uploadBtn = document.querySelector('#uploadBtn');

        if (loadBtn) {
            loadBtn.disabled = false;
            loadBtn.title = '';
            // Add a subtle animation to indicate the button is now available
            loadBtn.style.animation = 'pulse 0.6s ease-in-out';
            setTimeout(() => {
                if (loadBtn) loadBtn.style.animation = '';
            }, 600);
            console.log('✅ Load Progress button enabled after initial setup');
        }

        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.title = '';
            // Add a subtle animation to indicate the button is now available
            uploadBtn.style.animation = 'pulse 0.6s ease-in-out';
            setTimeout(() => {
                if (uploadBtn) uploadBtn.style.animation = '';
            }, 600);
            console.log('✅ Upload Image button enabled after initial setup');
        }

        // Show a notification that file operations are now available
        Utils.showAlert(t('fileOperationsAvailable'), 'success');
    }

    // Optimized token initialization with better timing and error handling
    async function initializeTokenGenerator() {
        // Skip if already have valid token
        if (isTokenValid()) {
            console.log('✅ Valid token already available, skipping initialization');
            updateUI('tokenReady', 'success');
            enableProgressDataOperations(); // Enable file operations since initial setup is complete
            return;
        }

        try {
            console.log('🔧 Initializing Turnstile token generator...');
            updateUI('initializingToken', 'default');

            console.log('Attempting to load Turnstile script...');
            await Utils.loadTurnstile();
            console.log('Turnstile script loaded. Attempting to generate token...');

            const token = await handleCaptchaWithRetry();
            if (token) {
                setTurnstileToken(token);
                console.log('✅ Startup token generated successfully');
                updateUI('tokenReady', 'success');
                Utils.showAlert(t('tokenGeneratorReady'), 'success');
                enableProgressDataOperations(); // Enable file operations since initial setup is complete
            } else {
                console.warn('⚠️ Startup token generation failed (no token received), will retry when needed');
                updateUI('tokenRetryLater', 'warning');
                // Still enable file operations even if initial token generation fails
                // Users can load progress and use manual/hybrid modes
                enableProgressDataOperations();
            }
        } catch (error) {
            console.error('❌ Critical error during Turnstile initialization:', error); // More specific error
            updateUI('tokenRetryLater', 'warning');
            // Still enable file operations even if initial setup fails
            // Users can load progress and use manual/hybrid modes
            enableProgressDataOperations();
            // Don't show error alert for initialization failures, just log them
        }
    }

    // Load theme preference immediately on startup before creating UI
    ThemeManager.applyTheme();

    createUI().then(() => {
        // Generate token automatically after UI is ready
        setTimeout(initializeTokenGenerator, 1000);

        // Add cleanup on page unload
        window.addEventListener('beforeunload', () => {
            Utils.cleanupTurnstile();
        });
    });
})();
