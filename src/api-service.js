import { CONFIG } from './config.js';

/**
 * WPlace API service for handling network requests and token management
 */
export const WPlaceServiceNew = {
    async paintPixelInRegion(regionX, regionY, pixelX, pixelY, color, turnstileToken) {
        try {
            if (!turnstileToken) return 'token_error';
            const payload = {
                coords: [pixelX, pixelY],
                colors: [color],
                t: turnstileToken,
            };
            const res = await fetch(`https://backend.wplacee.live/s0/pixel/${regionX}/${regionY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });
            if (res.status === 403) {
                console.error('❌ 403 Forbidden. Turnstile token might be invalid or expired.');
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

    async sendPixelBatch(pixelBatch, regionX, regionY, turnstileToken, handleCaptcha) {
        let token = turnstileToken;

        // Generate new token if we don't have one
        if (!token) {
            try {
                console.log('🔑 Generating Turnstile token for pixel batch...');
                token = await handleCaptcha();
            } catch (error) {
                console.error('❌ Failed to generate Turnstile token:', error);
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

            const res = await fetch(`https://backend.wplacee.live/s0/pixel/${regionX}/${regionY}`, {
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

                    // Retry the request with new token
                    const retryPayload = { coords, colors, t: token };
                    const retryRes = await fetch(`https://backend.wplacee.live/s0/pixel/${regionX}/${regionY}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                        credentials: 'include',
                        body: JSON.stringify(retryPayload),
                    });

                    if (retryRes.status === 403) {
                        return 'token_error';
                    }

                    const retryData = await retryRes.json();
                    return retryData?.painted === pixelBatch.length;
                } catch (retryError) {
                    console.error('❌ Token regeneration failed:', retryError);
                    return 'token_error';
                }
            }

            const data = await res.json();
            return data?.painted === pixelBatch.length;
        } catch (e) {
            console.error('Batch paint request failed:', e);
            return false;
        }
    },
};
