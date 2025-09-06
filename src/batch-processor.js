/**
 * Batch processing utilities for WPlace Auto-Image Bot
 */
import { WPlaceServiceNew } from './api-service.js';
import { UtilsNew } from './utils.js';
import { DataUtils } from './data-utils.js';

export class BatchProcessor {
    constructor(state, captchaHandler) {
        this.state = state;
        this.captchaHandler = captchaHandler;
        this.MAX_BATCH_RETRIES = 10; // Maximum attempts for batch sending
    }

    /**
     * Calculate batch size based on mode and available charges
     */
    calculateBatchSize() {
        let targetBatchSize;

        if (this.state.batchMode === 'random') {
            // Generate random batch size within the specified range
            const min = Math.max(1, this.state.randomBatchMin);
            const max = Math.max(min, this.state.randomBatchMax);
            targetBatchSize = Math.floor(Math.random() * (max - min + 1)) + min;
            console.log(`🎲 Random batch size generated: ${targetBatchSize} (range: ${min}-${max})`);
        } else {
            // Normal mode - use the fixed paintingSpeed value
            targetBatchSize = this.state.paintingSpeed;
        }

        // Always limit by available charges
        const maxAllowed = this.state.displayCharges;
        const finalBatchSize = Math.min(targetBatchSize, maxAllowed);

        return finalBatchSize;
    }

    /**
     * Flush a pixel batch to the server
     */
    async flushPixelBatch(pixelBatch, updateUI, updateStats) {
        if (!pixelBatch || pixelBatch.pixels.length === 0) return true;

        const batchSize = pixelBatch.pixels.length;
        console.log(`📦 Sending batch with ${batchSize} pixels (region: ${pixelBatch.regionX},${pixelBatch.regionY})`);
        const success = await this.sendBatchWithRetry(pixelBatch.pixels, pixelBatch.regionX, pixelBatch.regionY);

        if (success) {
            pixelBatch.pixels.forEach((p) => {
                this.state.paintedPixels++;
                DataUtils.markPixelPainted(this.state.paintedMap, p.x, p.y, pixelBatch.regionX, pixelBatch.regionY);
            });
            this.state.fullChargeData = {
                ...this.state.fullChargeData,
                spentSinceShot: this.state.fullChargeData.spentSinceShot + batchSize,
            };
            updateStats();
            updateUI('paintingProgress', 'default');
            this.performSmartSave();

            if (this.state.paintingSpeed > 0 && batchSize > 0) {
                const delayPerPixel = 1000 / this.state.paintingSpeed;
                const totalDelay = Math.max(100, delayPerPixel * batchSize);
                await UtilsNew.sleep(totalDelay);
            }
        } else {
            console.error(`❌ Batch failed permanently after retries. Stopping painting.`);
            this.state.stopFlag = true;
            updateUI('❌ Failed to send pixel batch after retries. Painting stopped.', 'error');
        }

        pixelBatch.pixels = [];
        return success;
    }

    /**
     * Helper function to retry batch until success with exponential backoff
     */
    async sendBatchWithRetry(pixels, regionX, regionY, maxRetries = this.MAX_BATCH_RETRIES) {
        let attempt = 0;
        while (attempt < maxRetries && !this.state.stopFlag) {
            attempt++;
            console.log(
                `🔄 Attempting to send batch (attempt ${attempt}/${maxRetries}) for region ${regionX},${regionY} with ${pixels.length} pixels`
            );

            const result = await WPlaceServiceNew.sendPixelBatch(
                pixels,
                regionX,
                regionY,
                this.captchaHandler.turnstileManager.getTurnstileToken(),
                () => this.captchaHandler.handleCaptcha()
            );

            if (result === true) {
                console.log(`✅ Batch succeeded on attempt ${attempt}`);
                return true;
            } else if (result === 'token_error') {
                console.log(`🔑 Token error on attempt ${attempt}, regenerating...`);
                try {
                    await this.captchaHandler.handleCaptcha();
                    // Don't count token regeneration as a failed attempt
                    attempt--;
                    continue;
                } catch (e) {
                    console.error(`❌ Token regeneration failed on attempt ${attempt}:`, e);
                    // Wait longer before retrying after token failure
                    await UtilsNew.sleep(5000);
                }
            } else {
                console.warn(`⚠️ Batch failed on attempt ${attempt}, retrying...`);
                // Exponential backoff with jitter
                const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
                const jitter = Math.random() * 1000; // Add up to 1s random delay
                await UtilsNew.sleep(baseDelay + jitter);
            }
        }

        if (attempt >= maxRetries) {
            console.error(
                `❌ Batch failed after ${maxRetries} attempts (MAX_BATCH_RETRIES=${this.MAX_BATCH_RETRIES}). This will stop painting to prevent infinite loops.`
            );
            return false;
        }

        return false;
    }

    /**
     * Perform smart save operation
     */
    performSmartSave() {
        if (
            !DataUtils.shouldAutoSave(
                this.state.paintedPixels,
                this.state._lastSavePixelCount,
                this.state._lastSaveTime,
                this.state._saveInProgress
            )
        )
            return false;

        this.state._saveInProgress = true;
        const success = DataUtils.saveProgress(this.state);

        if (success) {
            this.state._lastSavePixelCount = this.state.paintedPixels;
            this.state._lastSaveTime = Date.now();
            console.log(`💾 Auto-saved at ${this.state.paintedPixels} pixels`);
        }

        this.state._saveInProgress = false;
        return success;
    }
}
