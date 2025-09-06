import { CONFIG } from './config.js';

/**
 * Color matching and processing utilities
 */
export const ColorUtils = {
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
        let v = ColorUtils._labCache.get(key);
        if (!v) {
            v = ColorUtils._rgbToLab(r, g, b);
            ColorUtils._labCache.set(key, v);
        }
        return v;
    },

    findClosestPaletteColor: (
        r,
        g,
        b,
        palette,
        colorMatchingAlgorithm = 'lab',
        enableChromaPenalty = true,
        chromaPenaltyWeight = 0.15
    ) => {
        // Use provided palette or derive from COLOR_MAP
        if (!palette || palette.length === 0) {
            palette = Object.values(CONFIG.COLOR_MAP)
                .filter((c) => c.rgb)
                .map((c) => [c.rgb.r, c.rgb.g, c.rgb.b]);
        }
        if (colorMatchingAlgorithm === 'legacy') {
            let menorDist = Infinity;
            let cor = [0, 0, 0];
            for (let i = 0; i < palette.length; i++) {
                const [pr, pg, pb] = palette[i];
                const rmean = (pr + r) / 2;
                const rdiff = pr - r;
                const gdiff = pg - g;
                const bdiff = pb - b;
                const dist = Math.sqrt(
                    (((512 + rmean) * rdiff * rdiff) >> 8) + 4 * gdiff * gdiff + (((767 - rmean) * bdiff * bdiff) >> 8)
                );
                if (dist < menorDist) {
                    menorDist = dist;
                    cor = [pr, pg, pb];
                }
            }
            return cor;
        }
        // LAB algorithm
        const [Lt, at, bt] = ColorUtils._lab(r, g, b);
        const targetChroma = Math.sqrt(at * at + bt * bt);
        let best = null;
        let bestDist = Infinity;
        for (let i = 0; i < palette.length; i++) {
            const [pr, pg, pb] = palette[i];
            const [Lp, ap, bp] = ColorUtils._lab(pr, pg, pb);
            const dL = Lt - Lp;
            const da = at - ap;
            const db = bt - bp;
            let dist = dL * dL + da * da + db * db;
            if (enableChromaPenalty && targetChroma > 20) {
                const candChroma = Math.sqrt(ap * ap + bp * bp);
                if (candChroma < targetChroma) {
                    const chromaDiff = targetChroma - candChroma;
                    dist += chromaDiff * chromaDiff * chromaPenaltyWeight;
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

    isWhitePixel: (r, g, b, whiteThreshold = CONFIG.WHITE_THRESHOLD) => {
        return r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold;
    },

    resolveColor(
        targetRgb,
        availableColors,
        exactMatch = false,
        colorCache,
        colorMatchingAlgorithm = 'lab',
        enableChromaPenalty = true,
        chromaPenaltyWeight = 0.15,
        whiteThreshold = CONFIG.WHITE_THRESHOLD
    ) {
        if (!availableColors || availableColors.length === 0) {
            return {
                id: null,
                rgb: targetRgb,
            };
        }

        const cacheKey = `${targetRgb[0]},${targetRgb[1]},${targetRgb[2]}|${colorMatchingAlgorithm}|${enableChromaPenalty ? 'c' : 'nc'}|${chromaPenaltyWeight}|${exactMatch ? 'exact' : 'closest'}`;

        if (colorCache && colorCache.has(cacheKey)) return colorCache.get(cacheKey);

        // Check for an exact color match in availableColors.
        // If found, return the matched color with its ID.
        // If not found, return the target color with null ID.
        // Cache the result for future lookups.
        if (exactMatch) {
            const match = availableColors.find(
                (c) => c.rgb[0] === targetRgb[0] && c.rgb[1] === targetRgb[1] && c.rgb[2] === targetRgb[2]
            );
            const result = match ? { id: match.id, rgb: [...match.rgb] } : { id: null, rgb: targetRgb };
            if (colorCache) colorCache.set(cacheKey, result);
            return result;
        }

        // check for white using threshold
        if (targetRgb[0] >= whiteThreshold && targetRgb[1] >= whiteThreshold && targetRgb[2] >= whiteThreshold) {
            const whiteEntry = availableColors.find(
                (c) => c.rgb[0] >= whiteThreshold && c.rgb[1] >= whiteThreshold && c.rgb[2] >= whiteThreshold
            );
            if (whiteEntry) {
                const result = { id: whiteEntry.id, rgb: [...whiteEntry.rgb] };
                if (colorCache) colorCache.set(cacheKey, result);
                return result;
            }
        }

        // find nearest color
        let bestId = availableColors[0].id;
        let bestRgb = [...availableColors[0].rgb];
        let bestScore = Infinity;

        if (colorMatchingAlgorithm === 'legacy') {
            for (let i = 0; i < availableColors.length; i++) {
                const c = availableColors[i];
                const [r, g, b] = c.rgb;
                const rmean = (r + targetRgb[0]) / 2;
                const rdiff = r - targetRgb[0];
                const gdiff = g - targetRgb[1];
                const bdiff = b - targetRgb[2];
                const dist = Math.sqrt(
                    (((512 + rmean) * rdiff * rdiff) >> 8) + 4 * gdiff * gdiff + (((767 - rmean) * bdiff * bdiff) >> 8)
                );
                if (dist < bestScore) {
                    bestScore = dist;
                    bestId = c.id;
                    bestRgb = [...c.rgb];
                    if (dist === 0) break;
                }
            }
        } else {
            const [Lt, at, bt] = ColorUtils._lab(targetRgb[0], targetRgb[1], targetRgb[2]);
            const targetChroma = Math.sqrt(at * at + bt * bt);
            const penaltyWeight = enableChromaPenalty ? chromaPenaltyWeight || 0.15 : 0;

            for (let i = 0; i < availableColors.length; i++) {
                const c = availableColors[i];
                const [r, g, b] = c.rgb;
                const [L2, a2, b2] = ColorUtils._lab(r, g, b);
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
        if (colorCache) {
            colorCache.set(cacheKey, result);

            // limit the size of the cache
            if (colorCache.size > 15000) {
                const firstKey = colorCache.keys().next().value;
                colorCache.delete(firstKey);
            }
        }

        return result;
    },
};
