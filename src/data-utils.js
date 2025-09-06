/**
 * Data management utilities for progress saving/loading and painted pixel tracking
 */
export const DataUtils = {
    // --- Painted pixel tracking helpers ---
    initializePaintedMap: (width, height) => {
        const paintedMap = Array(height)
            .fill()
            .map(() => Array(width).fill(false));
        console.log(`📋 Initialized painted map: ${width}x${height}`);
        return paintedMap;
    },

    markPixelPainted: (paintedMap, x, y, regionX = 0, regionY = 0) => {
        const actualX = x + regionX;
        const actualY = y + regionY;

        if (paintedMap && paintedMap[actualY] && actualX >= 0 && actualX < paintedMap[actualY].length) {
            paintedMap[actualY][actualX] = true;
        }
    },

    isPixelPainted: (paintedMap, x, y, regionX = 0, regionY = 0) => {
        const actualX = x + regionX;
        const actualY = y + regionY;

        if (paintedMap && paintedMap[actualY] && actualX >= 0 && actualX < paintedMap[actualY].length) {
            return paintedMap[actualY][actualX];
        }
        return false;
    },

    // Smart save - only save if significant changes
    shouldAutoSave: (paintedPixels, lastSavePixelCount, lastSaveTime, saveInProgress) => {
        const now = Date.now();
        const pixelsSinceLastSave = paintedPixels - lastSavePixelCount;
        const timeSinceLastSave = now - lastSaveTime;

        // Save conditions:
        // 1. Every 25 pixels (reduced from 50 for more frequent saves)
        // 2. At least 30 seconds since last save (prevent spam)
        // 3. Not already saving
        return !saveInProgress && pixelsSinceLastSave >= 25 && timeSinceLastSave >= 30000;
    },

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

    buildPaintedMapPacked(paintedMap, imageData) {
        if (paintedMap && imageData) {
            const data = DataUtils.packPaintedMapToBase64(paintedMap, imageData.width, imageData.height);
            if (data) {
                return {
                    width: imageData.width,
                    height: imageData.height,
                    data: data,
                };
            }
        }
        return null;
    },

    buildProgressData(state) {
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
            paintedMapPacked: DataUtils.buildPaintedMapPacked(state.paintedMap, state.imageData),
        };
    },

    saveProgress: (state) => {
        try {
            const progressData = DataUtils.buildProgressData(state);
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

    restoreProgress: (savedData, state, ImageProcessor) => {
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
                state.paintedMap = DataUtils.unpackPaintedMapFromBase64(data, width, height);
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
    restoreOverlayFromData: async (state, overlayManager) => {
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
            await overlayManager.setImage(imageBitmap, state);
            await overlayManager.setPosition(state.startPosition, state.region, state);
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
};
