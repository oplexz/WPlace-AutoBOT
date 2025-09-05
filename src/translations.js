/**
 * Translation and internationalization functionality
 */
export class TranslationManager {
    constructor() {
        // Simple translation cache
        this.translationCache = new Map();

        // Dynamically loaded translations
        this.loadedTranslations = {};

        // Current language
        this.currentLanguage = 'en';

        // Emergency fallback TEXT (minimal)
        this.FALLBACK_TEXT = {
            en: {
                title: 'WPlace Auto-Image',
                toggleOverlay: 'Toggle Overlay',
                scanColors: 'Scan Colors',
                uploadImage: 'Upload Image',
                resizeImage: 'Resize Image',
                selectPosition: 'Select Position',
                startPainting: 'Start Painting',
                stopPainting: 'Stop Painting',
                progress: 'Progress',
                pixels: 'Pixels',
                charges: 'Charges',
                batchSize: 'Batch Size',
                cooldownSettings: 'Cooldown Settings',
                waitCharges: 'Wait for Charges',
                settings: 'Settings',
                showStats: 'Show Statistics',
                compactMode: 'Compact Mode',
                minimize: 'Minimize',
                tokenCapturedSuccess: 'Token captured successfully',
                turnstileInstructions: 'Complete the verification',
                hideTurnstileBtn: 'Hide',
                chargesReadyMessage: 'Charges are ready',
                chargesReadyNotification: 'WPlace AutoBot',
                initMessage: "Click 'Upload Image' to begin",
            },
        };
    }

    /**
     * Function to load translations from JSON file with retry mechanism
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<Object|null>} - Loaded translations or null if failed
     */
    async loadTranslations(retryCount = 0) {
        const LANGUAGE = this.currentLanguage;

        if (this.loadedTranslations[LANGUAGE]) {
            return this.loadedTranslations[LANGUAGE];
        }

        // Load translations from CDN
        const url = `https://wplace-autobot.github.io/WPlace-AutoBOT/main/lang/${LANGUAGE}.json`;
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second

        try {
            if (retryCount === 0) {
                console.log(`🔄 Loading ${LANGUAGE} translations from CDN...`);
            } else {
                console.log(`🔄 Retrying ${LANGUAGE} translations (attempt ${retryCount + 1}/${maxRetries + 1})...`);
            }

            const response = await fetch(url);
            if (response.ok) {
                const translations = await response.json();

                // Validate that translations is an object with keys
                if (typeof translations === 'object' && translations !== null && Object.keys(translations).length > 0) {
                    this.loadedTranslations[LANGUAGE] = translations;
                    console.log(
                        `📚 Loaded ${LANGUAGE} translations successfully from CDN (${
                            Object.keys(translations).length
                        } keys)`
                    );
                    return translations;
                } else {
                    console.warn(`❌ Invalid translation format for ${LANGUAGE}`);
                    throw new Error('Invalid translation format');
                }
            } else {
                console.warn(
                    `❌ CDN returned HTTP ${response.status}: ${response.statusText} for ${LANGUAGE} translations`
                );
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`❌ Failed to load ${LANGUAGE} translations from CDN (attempt ${retryCount + 1}):`, error);

            // Retry with exponential backoff
            if (retryCount < maxRetries) {
                const delay = baseDelay * Math.pow(2, retryCount);
                console.log(`⏳ Retrying in ${delay}ms...`);
                await new Promise((resolve) => setTimeout(resolve, delay));
                return this.loadTranslations(retryCount + 1);
            }
        }

        return null;
    }

    /**
     * Simple user notification function for critical issues
     * @param {string} message - Warning message to display
     */
    showTranslationWarning(message) {
        try {
            // Create a simple temporary notification banner
            const warning = document.createElement('div');
            warning.style.cssText = `
                position: fixed; top: 10px; right: 10px; z-index: 10001;
                background: rgba(255, 193, 7, 0.95); color: #212529; padding: 12px 16px;
                border-radius: 8px; font-size: 14px; font-weight: 500;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 1px solid rgba(255, 193, 7, 0.8);
                max-width: 300px; word-wrap: break-word;
            `;
            warning.textContent = message;
            document.body.appendChild(warning);

            // Auto-remove after 8 seconds
            setTimeout(() => {
                if (warning.parentNode) {
                    warning.remove();
                }
            }, 8000);
        } catch (e) {
            // If DOM manipulation fails, just log
            console.warn('Failed to show translation warning UI:', e);
        }
    }

    /**
     * Initialize translations function
     */
    async initializeTranslations() {
        try {
            console.log('🌐 Initializing translation system...');

            // Always ensure English is loaded as fallback first
            if (!this.loadedTranslations['en']) {
                const englishLoaded = await this.loadTranslations();
                if (!englishLoaded) {
                    console.warn('⚠️ Failed to load English translations from CDN, using fallback');
                    this.showTranslationWarning('⚠️ Translation loading failed, using basic fallbacks');
                }
            }

            console.log(`✅ Translation system initialized. Active language: ${this.currentLanguage}`);
        } catch (error) {
            console.error('❌ Translation initialization failed:', error);
            // Ensure state has a valid language even if loading fails
            if (!this.currentLanguage) {
                this.currentLanguage = 'en';
            }
            console.warn('⚠️ Using fallback translations due to initialization failure');
            this.showTranslationWarning('⚠️ Translation system error, using basic English');
        }
    }

    /**
     * Synchronous translation function for UI rendering
     * @param {string} key - Translation key
     * @param {Object} params - Parameters to replace in the translation
     * @returns {string} - Translated text
     */
    t(key, params = {}) {
        // Try to get from cache first
        const cacheKey = `${this.currentLanguage}_${key}`;
        if (this.translationCache.has(cacheKey)) {
            let text = this.translationCache.get(cacheKey);
            Object.keys(params).forEach((param) => {
                text = text.replace(`{${param}}`, params[param]);
            });
            return text;
        }

        // Try dynamically loaded translations (already loaded)
        if (this.loadedTranslations[this.currentLanguage]?.[key]) {
            let text = this.loadedTranslations[this.currentLanguage][key];
            // Cache for future use
            this.translationCache.set(cacheKey, text);
            Object.keys(params).forEach((param) => {
                text = text.replace(`{${param}}`, params[param]);
            });
            return text;
        }

        // Fallback to English if current language failed
        if (this.currentLanguage !== 'en' && this.loadedTranslations['en']?.[key]) {
            let text = this.loadedTranslations['en'][key];
            Object.keys(params).forEach((param) => {
                text = text.replace(`{${param}}`, params[param]);
            });
            return text;
        }

        // Final fallback to emergency fallback or key
        let text = this.FALLBACK_TEXT[this.currentLanguage]?.[key] || this.FALLBACK_TEXT.en?.[key] || key;
        Object.keys(params).forEach((param) => {
            text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), params[param]);
        });

        // Log missing translations for debugging
        if (text === key && key !== 'undefined') {
            console.warn(`⚠️ Missing translation for key: ${key} (language: ${this.currentLanguage})`);
        }

        return text;
    }

    /**
     * Set the current language
     * @param {string} language - Language code (e.g., 'en', 'es', 'fr')
     */
    setLanguage(language) {
        this.currentLanguage = language;
        // Clear cache when language changes
        this.translationCache.clear();
    }

    /**
     * Get the current language
     * @returns {string} - Current language code
     */
    getLanguage() {
        return this.currentLanguage;
    }
}

// Create and export a singleton instance
export const translationManager = new TranslationManager();

// Export the translation function for convenience
export const t = (key, params = {}) => translationManager.t(key, params);
