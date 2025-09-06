/**
 * CAPTCHA handling utilities for WPlace Auto-Image Bot
 */
import { UtilsNew } from './utils.js';

export class CaptchaHandler {
    constructor(turnstileManager, state) {
        this.turnstileManager = turnstileManager;
        this.state = state;
    }

    async handleCaptcha() {
        const startTime = performance.now();

        // Check user's token source preference
        if (this.state.tokenSource === 'manual') {
            console.log('🎯 Manual token source selected - using pixel placement automation');
            return await this.handleCaptchaFallback();
        }

        // Generator mode (pure) or Hybrid mode - try generator first
        try {
            // Use the TurnstileManager for token generation
            const token = await this.turnstileManager.handleCaptchaWithRetry();

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
            if (this.state.tokenSource === 'hybrid') {
                console.log('🔄 Hybrid mode: Generator failed, automatically switching to manual pixel placement...');
                const fbToken = await this.handleCaptchaFallback();
                return fbToken;
            } else {
                // Pure generator mode - don't fallback, just fail
                throw error;
            }
        }
    }

    // Keep original method as fallback
    async handleCaptchaFallback() {
        return new Promise(async (resolve, reject) => {
            try {
                // Create a promise that will be resolved when token is captured
                let tokenResolve;
                const tokenPromise = new Promise((res) => {
                    tokenResolve = res;
                });

                // Set up a one-time listener for token capture
                const tokenListener = (event) => {
                    if (event.data.source === 'turnstile-capture' && event.data.token) {
                        window.removeEventListener('message', tokenListener);
                        tokenResolve(event.data.token);
                    }
                };
                window.addEventListener('message', tokenListener);

                const timeoutPromise = UtilsNew.sleep(20000).then(() => {
                    window.removeEventListener('message', tokenListener);
                    reject(new Error('Auto-CAPTCHA timed out.'));
                });

                const solvePromise = (async () => {
                    const mainPaintBtn = await UtilsNew.waitForSelector(
                        'button.btn.btn-primary.btn-lg, button.btn-primary.sm\\:btn-xl',
                        200,
                        10000
                    );
                    if (!mainPaintBtn) throw new Error('Could not find the main paint button.');
                    mainPaintBtn.click();
                    await UtilsNew.sleep(500);

                    const transBtn = await UtilsNew.waitForSelector('button#color-0', 200, 5000);
                    if (!transBtn) throw new Error('Could not find the transparent color button.');
                    transBtn.click();
                    await UtilsNew.sleep(500);

                    const canvas = await UtilsNew.waitForSelector('canvas', 200, 5000);
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
                    await UtilsNew.sleep(50);
                    canvas.dispatchEvent(
                        new KeyboardEvent('keyup', {
                            key: ' ',
                            code: 'Space',
                            bubbles: true,
                        })
                    );
                    await UtilsNew.sleep(500);

                    // 800ms delay before sending confirmation
                    await UtilsNew.sleep(800);

                    // Keep confirming until token is captured
                    const confirmLoop = async () => {
                        while (!this.turnstileManager.getTurnstileToken()) {
                            let confirmBtn = await UtilsNew.waitForSelector(
                                'button.btn.btn-primary.btn-lg, button.btn.btn-primary.sm\\:btn-xl'
                            );
                            if (!confirmBtn) {
                                const allPrimary = Array.from(document.querySelectorAll('button.btn-primary'));
                                confirmBtn = allPrimary.length ? allPrimary[allPrimary.length - 1] : null;
                            }
                            if (confirmBtn) {
                                confirmBtn.click();
                            }
                            await UtilsNew.sleep(500); // 500ms delay between confirmation attempts
                        }
                    };

                    // Start confirmation loop and wait for token
                    confirmLoop();
                    const token = await tokenPromise;
                    await UtilsNew.sleep(300); // small delay after token is captured
                    resolve(token);
                })();

                await Promise.race([solvePromise, timeoutPromise]);
            } catch (error) {
                console.error('Auto-CAPTCHA process failed:', error);
                reject(error);
            }
        });
    }
}
