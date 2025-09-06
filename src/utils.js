import { CONFIG } from './config.js';

/**
 * Utility functions for the WPlace Auto-Image bot
 */
export const UtilsNew = {
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
            await UtilsNew.sleep(interval);
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

    calculateEstimatedTime: (remainingPixels, charges, cooldown, paintingSpeed = 5) => {
        if (remainingPixels <= 0) return 0;

        const paintingSpeedDelay = paintingSpeed > 0 ? 1000 / paintingSpeed : 1000;
        const timeFromSpeed = remainingPixels * paintingSpeedDelay;

        const cyclesNeeded = Math.ceil(remainingPixels / Math.max(charges, 1));
        const timeFromCharges = cyclesNeeded * cooldown;

        return timeFromSpeed + timeFromCharges; // combine instead of taking max
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

    updateCoordinateUI({ mode, directionControls, snakeControls, blockControls }) {
        const isLinear = mode === 'rows' || mode === 'columns';
        const isBlock = mode === 'blocks' || mode === 'shuffle-blocks';

        if (directionControls) directionControls.style.display = isLinear ? 'block' : 'none';
        if (snakeControls) snakeControls.style.display = isLinear ? 'block' : 'none';
        if (blockControls) blockControls.style.display = isBlock ? 'block' : 'none';
    },
};
