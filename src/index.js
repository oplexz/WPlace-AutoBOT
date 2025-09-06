/* cSpell:disable */

import { WPlaceServiceNew } from './api-service.js';
import { ColorUtils } from './color-utils.js';
import { CONFIG } from './config.js';
import { DataUtils } from './data-utils.js';
import { OverlayManager } from './overlay-manager.js';
import { ThemeManager } from './theme.js';
import { TurnstileManager } from './turnstile-manager.js';
import { UtilsNew } from './utils.js';
import { ImageProcessor } from './image-processor';
import { CaptchaHandler } from './captcha-handler';
import { BatchProcessor } from './batch-processor';
import { UIManager } from './ui-manager';
import { PixelProcessor } from './pixel-processor';

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

    const overlayManager = new OverlayManager();
    const turnstileManager = new TurnstileManager();
    const captchaHandler = new CaptchaHandler(turnstileManager, state);
    const batchProcessor = new BatchProcessor(state, captchaHandler);
    const uiManager = new UIManager(state);
    const pixelProcessor = new PixelProcessor(state, overlayManager, batchProcessor);

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
            overlayManager.processAndRespondToTileRequest(event.data, state);
        }

        if (source === 'turnstile-capture' && token) {
            turnstileManager.setToken(token);
            if (document.querySelector('#statusText')?.textContent.includes('CAPTCHA')) {
                UtilsNew.showAlert('Token captured successfully! You can start the bot now.', 'success');
                updateUI(`✅ ${state.availableColors.length} available colors found. Ready to upload.`, 'success');
            }
        }
    });

    // UI UPDATE FUNCTIONS (declared early to avoid reference errors)
    let updateUI = () => {};
    let updateStats = () => {};
    let updateDataButtons = () => {};

    async function createUI() {
        const { container, statsContainer, settingsContainer } = await uiManager.createMainUI();

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

        uiManager.makeDraggable(container);
        uiManager.makeDraggable(statsContainer);

        if (statsBtn && closeStatsBtn) {
            statsBtn.addEventListener('click', () => {
                const isVisible = statsContainer.style.display !== 'none';
                if (isVisible) {
                    statsContainer.style.display = 'none';
                    statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
                    statsBtn.title = 'Show Stats';
                } else {
                    statsContainer.style.display = 'block';
                    statsBtn.innerHTML = '<i class="fas fa-chart-line"></i>';
                    statsBtn.title = 'Hide Stats';
                }
            });

            closeStatsBtn.addEventListener('click', () => {
                statsContainer.style.display = 'none';
                statsBtn.innerHTML = '<i class="fas fa-chart-bar"></i>';
                statsBtn.title = 'Show Stats';
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
            statsBtn.title = 'Show Stats';
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
                UtilsNew.showAlert('✅ Settings saved successfully!', 'success');
                closeSettingsBtn.click();
            });

            uiManager.makeDraggable(settingsContainer);

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
                    UtilsNew.showAlert(`Token source set to: ${sourceNames[state.tokenSource]}`, 'success');
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
                    UtilsNew.showAlert(
                        `Batch mode set to: ${state.batchMode === 'random' ? 'Random Range' : 'Normal Fixed Size'}`,
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
                UtilsNew.createScrollToAdjust(overlayOpacitySlider, updateOpacity, 0, 1, 0.05);
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
                    UtilsNew.showAlert(statusText, 'success');
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
                    UtilsNew.showAlert(statusText, 'success');
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
                UtilsNew.createScrollToAdjust(
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
                        UtilsNew.showAlert('Re-processing overlay...', 'info');
                        await overlayManager.processImageIntoChunks();
                        UtilsNew.showAlert('Overlay updated!', 'success');
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
                UtilsNew.showAlert(statusText, 'success');
            });
        }
        if (coordinateModeSelect) {
            coordinateModeSelect.value = state.coordinateMode;
            coordinateModeSelect.addEventListener('change', (e) => {
                state.coordinateMode = e.target.value;
                UtilsNew.updateCoordinateUI({
                    mode: state.coordinateMode,
                    directionControls,
                    snakeControls,
                    blockControls,
                });
                saveBotSettings();
                console.log(`🔄 Coordinate mode changed to: ${state.coordinateMode}`);
                UtilsNew.showAlert(`Coordinate mode set to: ${state.coordinateMode}`, 'success');
            });
        }

        if (coordinateDirectionSelect) {
            coordinateDirectionSelect.value = state.coordinateDirection;
            coordinateDirectionSelect.addEventListener('change', (e) => {
                state.coordinateDirection = e.target.value;
                saveBotSettings();
                console.log(`🧭 Coordinate direction changed to: ${state.coordinateDirection}`);
                UtilsNew.showAlert(`Coordinate direction set to: ${state.coordinateDirection}`, 'success');
            });
        }

        if (coordinateSnakeToggle) {
            coordinateSnakeToggle.checked = state.coordinateSnake;
            coordinateSnakeToggle.addEventListener('change', (e) => {
                state.coordinateSnake = e.target.checked;
                saveBotSettings();
                console.log(`🐍 Snake pattern ${state.coordinateSnake ? 'enabled' : 'disabled'}`);
                UtilsNew.showAlert(`Snake pattern ${state.coordinateSnake ? 'enabled' : 'disabled'}`, 'success');
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
                    compactBtn.title = 'Expand Mode';
                } else {
                    compactBtn.innerHTML = '<i class="fas fa-compress"></i>';
                    compactBtn.title = 'Compact Mode';
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
                    minimizeBtn.title = 'Restore';
                } else {
                    container.classList.remove('wplace-minimized');
                    content.classList.remove('wplace-hidden');
                    minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
                    minimizeBtn.title = 'Minimize';
                }
                saveBotSettings();
            });
        }

        if (toggleOverlayBtn) {
            toggleOverlayBtn.addEventListener('click', () => {
                const isEnabled = overlayManager.toggle();
                toggleOverlayBtn.classList.toggle('active', isEnabled);
                toggleOverlayBtn.setAttribute('aria-pressed', isEnabled ? 'true' : 'false');
                UtilsNew.showAlert(isEnabled ? 'Overlay enabled.' : 'Overlay disabled.', 'info');
            });
        }

        if (state.minimized) {
            container.classList.add('wplace-minimized');
            content.classList.add('wplace-hidden');
            if (minimizeBtn) {
                minimizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
                minimizeBtn.title = 'Restore';
            }
        } else {
            container.classList.remove('wplace-minimized');
            content.classList.remove('wplace-hidden');
            if (minimizeBtn) {
                minimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
                minimizeBtn.title = 'Minimize';
            }
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                if (!state.imageLoaded) {
                    UtilsNew.showAlert('❌ Load an image and select a position first', 'error');
                    return;
                }

                const success = DataUtils.saveProgress(state);
                if (success) {
                    updateUI('✅ Progress saved automatically', 'success');
                    UtilsNew.showAlert('✅ Progress saved automatically', 'success');
                } else {
                    UtilsNew.showAlert('❌ Error saving progress', 'error');
                }
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                // Check if initial setup is complete
                if (!state.initialSetupComplete) {
                    UtilsNew.showAlert(
                        '🔄 Please wait for the initial setup to complete before loading progress.',
                        'warning'
                    );
                    return;
                }

                const savedData = DataUtils.loadProgress();
                if (!savedData) {
                    updateUI('❌ No saved progress found', 'warning');
                    UtilsNew.showAlert('❌ No saved progress found', 'warning');
                    return;
                }

                const confirmLoad = confirm(
                    `✅ Saved progress found! Load to continue?\n\n` +
                        `Saved: ${new Date(savedData.timestamp).toLocaleString()}\n` +
                        `Progress: ${savedData.state.paintedPixels}/${savedData.state.totalPixels} pixels`
                );

                if (confirmLoad) {
                    const success = DataUtils.restoreProgress(savedData, state, ImageProcessor);
                    if (success) {
                        updateUI('✅ Progress loaded successfully', 'success');
                        UtilsNew.showAlert('✅ Progress loaded successfully', 'success');
                        updateDataButtons();

                        updateStats();

                        // Restore overlay if image data was loaded from localStorage
                        DataUtils.restoreOverlayFromData(state, overlayManager).catch((error) => {
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
                        UtilsNew.showAlert('❌ Error loading progress', 'error');
                    }
                }
            });
        }

        updateUI = (message, type = 'default', silent = false) => {
            statusText.textContent = message;
            statusText.className = `wplace-status status-${type}`;

            if (!silent) {
                // Trigger animation only when silent = false
                statusText.style.animation = 'none';
                void statusText.offsetWidth; // trick to restart the animation
                statusText.style.animation = 'slide-in 0.3s ease-out';
            }
        };

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
                const { charges, max, cooldown } = await WPlaceServiceNew.getCharges();
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
            state.fullChargeInterval = setInterval(() => uiManager.updateChargeStatsDisplay(intervalMs), intervalMs);

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
                state.estimatedTime = UtilsNew.calculateEstimatedTime(
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
            <div class="wplace-stat-value">${UtilsNew.formatTime(state.estimatedTime)}</div>
          </div>
        `;
            }

            let colorSwatchesHTML = '';
            state.availableColors = state.availableColors.filter(
                (c) => c.name !== 'Unknown CoIor NaN' && c.id !== null
            );

            const availableColors = UtilsNew.extractAvailableColors();
            const newCount = Array.isArray(availableColors) ? availableColors.length : 0;

            if (newCount === 0 && isManualRefresh) {
                UtilsNew.showAlert(
                    '❌ To update the color swatch, open the color palette on the site and try again!',
                    'warning'
                );
            } else if (newCount > 0 && state.availableColors.length < newCount) {
                const oldCount = state.availableColors.length;

                UtilsNew.showAlert(
                    `Available colors increased: ${oldCount} -> ${newCount}, ${newCount - oldCount} new colors found`,
                    'success'
                );
                state.availableColors = availableColors;
            }
            if (state.colorsChecked) {
                colorSwatchesHTML = state.availableColors
                    .map((color) => {
                        const rgbString = `rgb(${color.rgb.join(',')})`;
                        return `<div class="wplace-stat-color-swatch" style="background-color: ${rgbString};" title="ID: ${color.id}\nRGB: ${color.rgb.join(', ')}"></div>`;
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
                <div class="wplace-stat-label"><i class="fas fa-palette"></i> Available Colors: ${state.availableColors.length}</div>
                <div class="wplace-stat-colors-grid">
                    ${colorSwatchesHTML}
                </div>
            </div>
            `
                    : ''
            }
        `;

            // should be after statsArea.innerHTML = '...'. todo make full stats ui update partial
            uiManager.updateChargeStatsDisplay(intervalMs);
        };

        updateDataButtons = () => {
            const hasImageData = state.imageLoaded && state.imageData;
            saveBtn.disabled = !hasImageData;
        };

        updateDataButtons();

        if (uploadBtn) {
            uploadBtn.addEventListener('click', async () => {
                const availableColors = UtilsNew.extractAvailableColors();
                if (availableColors === null || availableColors.length < 10) {
                    updateUI(
                        '❌ To update the color swatch, open the color palette on the site and try again!',
                        'error'
                    );
                    UtilsNew.showAlert(
                        '❌ To update the color swatch, open the color palette on the site and try again!',
                        'error'
                    );
                    return;
                }

                if (!state.colorsChecked) {
                    state.availableColors = availableColors;
                    state.colorsChecked = true;
                    updateUI(`✅ ${availableColors.length} available colors found. Ready to upload.`, 'success');
                    updateStats();
                    selectPosBtn.disabled = false;
                }

                try {
                    updateUI('🖼️ Loading image...', 'default');
                    const imageSrc = await UtilsNew.createImageUploader();
                    if (!imageSrc) {
                        updateUI(
                            `✅ ${state.availableColors.length} available colors found. Ready to upload.`,
                            'success'
                        );
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
                            !state.paintWhitePixels && ColorUtils.isWhitePixel(pixels[i], pixels[i + 1], pixels[i + 2]);
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
                    state.paintedMap = DataUtils.initializePaintedMap(width, height);

                    // Save original image for this browser (dataUrl + dims)
                    state.originalImage = { dataUrl: imageSrc, width, height };
                    saveBotSettings();

                    // Use the original image for the overlay initially
                    const imageBitmap = await createImageBitmap(processor.img);
                    await overlayManager.setImage(imageBitmap, state);
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
                    updateUI(`✅ Image loaded with ${totalValidPixels} valid pixels`, 'success');
                } catch (error) {
                    console.error('Error processing image:', error);
                    updateUI('❌ Error loading image', 'error');
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

                UtilsNew.showAlert('Paint the first pixel at the location where you want the art to start!', 'info');
                updateUI('👆 Waiting for you to paint the reference pixel...', 'default');

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

                                    await overlayManager.setPosition(state.startPosition, state.region, state);

                                    if (state.imageLoaded) {
                                        startBtn.disabled = false;
                                    }

                                    window.fetch = originalFetch;
                                    state.selectingPosition = false;
                                    updateUI('✅ Position set successfully!', 'success');
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
                        updateUI('❌ Timeout for position selection', 'error');
                        UtilsNew.showAlert('❌ Timeout for position selection', 'error');
                    }
                }, 120000);
            });
        }

        async function startPainting() {
            if (!state.imageLoaded || !state.startPosition || !state.region) {
                updateUI('❌ Load an image and select a position first', 'error');
                return;
            }
            await turnstileManager.ensureToken();
            if (!turnstileManager.getTurnstileToken()) return;

            state.running = true;
            state.stopFlag = false;
            startBtn.disabled = true;
            stopBtn.disabled = false;
            uploadBtn.disabled = true;
            selectPosBtn.disabled = true;
            saveBtn.disabled = true;
            toggleOverlayBtn.disabled = true;

            updateUI('🎨 Starting painting...', 'success');

            try {
                await pixelProcessor.processImage(updateUI, updateStats);
            } catch (e) {
                console.error('Unexpected error:', e);
                updateUI('❌ Unexpected error during painting', 'error');
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
                updateUI('⏹️ Painting stopped by user', 'warning');

                if (state.imageLoaded && state.paintedPixels > 0) {
                    DataUtils.saveProgress(state);
                    UtilsNew.showAlert('✅ Progress saved automatically', 'success');
                }
            });
        }

        const checkSavedProgress = () => {
            const savedData = DataUtils.loadProgress();
            if (savedData && savedData.state.paintedPixels > 0) {
                const savedDate = new Date(savedData.timestamp).toLocaleString();
                const progress = Math.round((savedData.state.paintedPixels / savedData.state.totalPixels) * 100);

                UtilsNew.showAlert(
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
            UtilsNew.createScrollToAdjust(cooldownSlider, updateCooldown, 1, state.maxCharges, 1);
        }

        loadBotSettings();
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
            UtilsNew.updateCoordinateUI({
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
        UtilsNew.showAlert('📂 File operations (Load/Upload) are now available!', 'success');
    }

    // Optimized token initialization with better timing and error handling
    async function initializeTokenGenerator() {
        // Skip if already have valid token
        if (turnstileManager.isTokenValid()) {
            console.log('✅ Valid token already available, skipping initialization');
            updateUI('✅ Token generator ready - you can now start painting!', 'success');
            enableProgressDataOperations(); // Enable file operations since initial setup is complete
            return;
        }

        try {
            console.log('🔧 Initializing Turnstile token generator...');
            updateUI('🔧 Initializing Turnstile token generator...', 'default');

            console.log('Attempting to load Turnstile script...');
            await turnstileManager.loadTurnstile();
            console.log('Turnstile script loaded. Attempting to generate token...');

            const token = await turnstileManager.handleCaptchaWithRetry();
            if (token) {
                turnstileManager.setTurnstileToken(token);
                console.log('✅ Startup token generated successfully');
                updateUI('✅ Token generator ready - you can now start painting!', 'success');
                UtilsNew.showAlert('🔑 Token generator ready!', 'success');
                enableProgressDataOperations(); // Enable file operations since initial setup is complete
            } else {
                console.warn('⚠️ Startup token generation failed (no token received), will retry when needed');
                updateUI('⚠️ Token generator will retry when needed', 'warning');
                // Still enable file operations even if initial token generation fails
                // Users can load progress and use manual/hybrid modes
                enableProgressDataOperations();
            }
        } catch (error) {
            console.error('❌ Critical error during Turnstile initialization:', error); // More specific error
            updateUI('⚠️ Token generator will retry when needed', 'warning');
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
            turnstileManager.cleanupTurnstile();
        });
    });
})();
