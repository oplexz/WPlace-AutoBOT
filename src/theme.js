import { CONFIG } from './config.js';

/**
 * Theme management functionality
 */
export class ThemeManager {
    /**
     * Apply the current theme to the document
     */
    static applyTheme() {
        // Toggle theme class on documentElement so CSS vars cascade to our UI
        document.documentElement.classList.remove(
            'wplace-theme-classic',
            'wplace-theme-classic-light',
            'wplace-theme-neon'
        );
        document.documentElement.classList.add('wplace-theme-classic');

        // Also set CSS variables explicitly in case you want runtime overrides
        const root = document.documentElement;
        const setVar = (k, v) => {
            try {
                root.style.setProperty(k, v);
            } catch (_e) {
                // Silently ignore CSS property setting errors
            }
        };

        setVar('--wplace-primary', CONFIG.THEME.primary);
        setVar('--wplace-secondary', CONFIG.THEME.secondary);
        setVar('--wplace-accent', CONFIG.THEME.accent);
        setVar('--wplace-text', CONFIG.THEME.text);
        setVar('--wplace-highlight', CONFIG.THEME.highlight);
        setVar('--wplace-success', CONFIG.THEME.success);
        setVar('--wplace-error', CONFIG.THEME.error);
        setVar('--wplace-warning', CONFIG.THEME.warning);

        // Typography + look
        setVar('--wplace-font', CONFIG.THEME.fontFamily || "'Segoe UI', Roboto, sans-serif");
        setVar('--wplace-radius', '' + (CONFIG.THEME.borderRadius || '12px'));
        setVar('--wplace-border-style', '' + (CONFIG.THEME.borderStyle || 'solid'));
        setVar('--wplace-border-width', '' + (CONFIG.THEME.borderWidth || '1px'));
        setVar('--wplace-backdrop', '' + (CONFIG.THEME.backdropFilter || 'blur(10px)'));
        setVar('--wplace-border-color', 'rgba(255,255,255,0.1)');
    }

    /**
     * Append a CSS link to the document head if it doesn't already exist
     * @param {string} href - The CSS file URL
     * @param {Object} attributes - Additional attributes to set on the link element
     */
    static appendLinkOnce(href, attributes = {}) {
        // Check if a link with the same href already exists in the document head
        const exists = Array.from(document.head.querySelectorAll('link')).some((link) => link.href === href);
        if (exists) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;

        // Add any additional attributes (e.g., data-* attributes)
        for (const [key, value] of Object.entries(attributes)) {
            link.setAttribute(key, value);
        }

        document.head.appendChild(link);
    }

    /**
     * Load required CSS files for the theme
     */
    static loadThemeStyles() {
        this.appendLinkOnce('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.7.2/css/all.min.css');
        this.appendLinkOnce('https://wplace-autobot.github.io/WPlace-AutoBOT/main/auto-image-styles.css', {
            'data-wplace-theme': 'true',
        });
    }
}
