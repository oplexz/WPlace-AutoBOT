/**
 * Pixel processing utilities for WPlace Auto-Image Bot
 */
import { ColorUtils } from './color-utils.js';
import { CONFIG } from './config.js';
import { CoordinateGenerator } from './coordinate-generator.js';
import { UtilsNew } from './utils.js';

export class PixelProcessor {
    constructor(state, overlayManager, batchProcessor) {
        this.state = state;
        this.overlayManager = overlayManager;
        this.batchProcessor = batchProcessor;
        this.colorCache = new Map();
    }

    /**
     * Check if a pixel is eligible for painting
     */
    checkPixelEligibility(x, y, pixels, width) {
        const idx = (y * width + x) * 4;
        const r = pixels[idx],
            g = pixels[idx + 1],
            b = pixels[idx + 2],
            a = pixels[idx + 3];

        const transparencyThreshold = this.state.customTransparencyThreshold || CONFIG.TRANSPARENCY_THRESHOLD;

        if (!this.state.paintTransparentPixels && a < transparencyThreshold)
            return {
                eligible: false,
                reason: 'transparent',
            };
        if (!this.state.paintWhitePixels && ColorUtils.isWhitePixel(r, g, b))
            return {
                eligible: false,
                reason: 'white',
            };

        let targetRgb = ColorUtils.isWhitePixel(r, g, b)
            ? [255, 255, 255]
            : ColorUtils.findClosestPaletteColor(
                  r,
                  g,
                  b,
                  this.state.activeColorPalette,
                  this.state.colorMatchingAlgorithm,
                  this.state.enableChromaPenalty,
                  this.state.chromaPenaltyWeight
              );

        const mappedTargetColorId = ColorUtils.resolveColor(
            targetRgb,
            this.state.availableColors,
            !this.state.paintUnavailablePixels,
            this.colorCache,
            this.state.colorMatchingAlgorithm,
            this.state.enableChromaPenalty,
            this.state.chromaPenaltyWeight
        );

        if (!this.state.paintUnavailablePixels && !mappedTargetColorId.id) {
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

    /**
     * Skip a pixel and log the reason
     */
    skipPixel(reason, id, rgb, x, y, skippedPixels) {
        if (reason !== 'transparent') {
            console.log(`Skipped pixel for ${reason} (id: ${id}, (${rgb.join(', ')})) at (${x}, ${y})`);
        }
        skippedPixels[reason]++;
    }

    /**
     * Get milliseconds to target charges
     */
    getMsToTargetCharges(current, target, cooldown) {
        const remainingCharges = target - current;
        return Math.max(0, remainingCharges * cooldown);
    }

    /**
     * Process the entire image
     */
    async processImage(updateUI, updateStats) {
        const { width, height, pixels } = this.state.imageData;
        const { x: startX, y: startY } = this.state.startPosition;
        const { x: regionX, y: regionY } = this.state.region;

        // Force load tiles
        const tilesReady = await this.overlayManager.waitForTiles(
            regionX,
            regionY,
            width,
            height,
            startX,
            startY,
            10000, // timeout 10s
            this.state
        );

        if (!tilesReady) {
            updateUI('❌ Required map tiles not loaded. Check connection or retry.', 'error');
            this.state.stopFlag = true;
            return;
        }

        let pixelBatch = null;
        let skippedPixels = {
            transparent: 0,
            white: 0,
            alreadyPainted: 0,
            colorUnavailable: 0,
        };

        try {
            const coords = CoordinateGenerator.generateCoordinates(
                width,
                height,
                this.state.coordinateMode,
                this.state.coordinateDirection,
                this.state.coordinateSnake,
                this.state.blockWidth,
                this.state.blockHeight
            );

            outerLoop: for (const [x, y] of coords) {
                if (this.state.stopFlag) {
                    if (pixelBatch && pixelBatch.pixels.length > 0) {
                        console.log(`🎯 Sending last batch before stop with ${pixelBatch.pixels.length} pixels`);
                        await this.batchProcessor.flushPixelBatch(pixelBatch, updateUI, updateStats);
                    }
                    this.state.lastPosition = { x, y };
                    updateUI(`⏸️ Painting paused at position X: ${x}, Y: ${y}`, 'warning');
                    break outerLoop;
                }

                const targetPixelInfo = this.checkPixelEligibility(x, y, pixels, width);
                let absX = startX + x;
                let absY = startY + y;

                let adderX = Math.floor(absX / 1000);
                let adderY = Math.floor(absY / 1000);
                let pixelX = absX % 1000;
                let pixelY = absY % 1000;

                const targetMappedColorId = targetPixelInfo.mappedColorId;

                if (!targetPixelInfo.eligible) {
                    this.skipPixel(
                        targetPixelInfo.reason,
                        targetMappedColorId,
                        [targetPixelInfo.r, targetPixelInfo.g, targetPixelInfo.b],
                        pixelX,
                        pixelY,
                        skippedPixels
                    );
                    continue;
                }

                if (!pixelBatch || pixelBatch.regionX !== regionX + adderX || pixelBatch.regionY !== regionY + adderY) {
                    if (pixelBatch && pixelBatch.pixels.length > 0) {
                        console.log(
                            `🌍 Sending region-change batch with ${
                                pixelBatch.pixels.length
                            } pixels (switching to region ${regionX + adderX},${regionY + adderY})`
                        );
                        const success = await this.batchProcessor.flushPixelBatch(pixelBatch, updateUI, updateStats);

                        if (success) {
                            if (this.state.paintingSpeed > 0 && pixelBatch.pixels.length > 0) {
                                const batchDelayFactor = Math.max(1, 100 / this.state.paintingSpeed);
                                const totalDelay = Math.max(100, batchDelayFactor * pixelBatch.pixels.length);
                                await UtilsNew.sleep(totalDelay);
                            }
                            updateStats();
                        } else {
                            console.error(`❌ Batch failed permanently after retries. Stopping painting.`);
                            this.state.stopFlag = true;
                            updateUI('❌ Failed to send pixel batch after retries. Painting stopped.', 'error');
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

                    const tilePixelRGBA = await this.overlayManager.getTilePixelColor(
                        tileKeyParts[0],
                        tileKeyParts[1],
                        pixelX,
                        pixelY,
                        this.state
                    );

                    if (tilePixelRGBA && Array.isArray(tilePixelRGBA)) {
                        const mappedCanvasColor = ColorUtils.resolveColor(
                            tilePixelRGBA.slice(0, 3),
                            this.state.availableColors,
                            false,
                            this.colorCache,
                            this.state.colorMatchingAlgorithm,
                            this.state.enableChromaPenalty,
                            this.state.chromaPenaltyWeight
                        );
                        const isMatch = mappedCanvasColor.id === targetMappedColorId;
                        if (isMatch) {
                            this.skipPixel(
                                'alreadyPainted',
                                targetMappedColorId,
                                [targetPixelInfo.r, targetPixelInfo.g, targetPixelInfo.b],
                                pixelX,
                                pixelY,
                                skippedPixels
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
                    updateUI(`❌ Failed to read pixel at (${pixelX}, ${pixelY}). Painting stopped.`, 'error');
                    this.state.stopFlag = true;
                    break outerLoop;
                }

                pixelBatch.pixels.push({
                    x: pixelX,
                    y: pixelY,
                    color: targetMappedColorId,
                    localX: x,
                    localY: y,
                });

                const maxBatchSize = this.batchProcessor.calculateBatchSize();
                if (pixelBatch.pixels.length >= maxBatchSize) {
                    const modeText =
                        this.state.batchMode === 'random'
                            ? `random (${this.state.randomBatchMin}-${this.state.randomBatchMax})`
                            : 'normal';
                    console.log(
                        `📦 Sending batch with ${pixelBatch.pixels.length} pixels (mode: ${modeText}, target: ${maxBatchSize})`
                    );
                    const success = await this.batchProcessor.flushPixelBatch(pixelBatch, updateUI, updateStats);
                    if (!success) {
                        console.error(`❌ Batch failed permanently after retries. Stopping painting.`);
                        this.state.stopFlag = true;
                        updateUI('❌ Failed to send pixel batch after retries. Painting stopped.', 'error');
                        break outerLoop;
                    }

                    pixelBatch.pixels = [];
                }

                if (this.state.displayCharges < this.state.cooldownChargeThreshold && !this.state.stopFlag) {
                    await UtilsNew.dynamicSleep(() => {
                        if (this.state.displayCharges >= this.state.cooldownChargeThreshold) {
                            return 0;
                        }
                        if (this.state.stopFlag) return 0;
                        return this.getMsToTargetCharges(
                            this.state.preciseCurrentCharges,
                            this.state.cooldownChargeThreshold,
                            this.state.cooldown
                        );
                    });
                }

                if (this.state.stopFlag) {
                    break outerLoop;
                }
            }

            if (pixelBatch && pixelBatch.pixels.length > 0 && !this.state.stopFlag) {
                console.log(`🏁 Sending final batch with ${pixelBatch.pixels.length} pixels`);
                const success = await this.batchProcessor.flushPixelBatch(pixelBatch, updateUI, updateStats);
                if (!success) {
                    console.warn(`⚠️ Final batch failed with ${pixelBatch.pixels.length} pixels after all retries.`);
                }
            }
        } finally {
            if (window._chargesInterval) clearInterval(window._chargesInterval);
            window._chargesInterval = null;
        }

        this.logSkipStatistics(skippedPixels);
        updateStats();
    }

    /**
     * Log skip statistics
     */
    logSkipStatistics(skippedPixels) {
        console.log(`📊 Pixel Statistics:`);
        console.log(`   Painted: ${this.state.paintedPixels}`);
        console.log(`   Skipped - Transparent: ${skippedPixels.transparent}`);
        console.log(`   Skipped - White (disabled): ${skippedPixels.white}`);
        console.log(`   Skipped - Already painted: ${skippedPixels.alreadyPainted}`);
        console.log(`   Skipped - Color Unavailable: ${skippedPixels.colorUnavailable}`);
        console.log(
            `   Total processed: ${
                this.state.paintedPixels +
                skippedPixels.transparent +
                skippedPixels.white +
                skippedPixels.alreadyPainted +
                skippedPixels.colorUnavailable
            }`
        );
    }
}
