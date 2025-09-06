/**
 * UI management utilities for WPlace Auto-Image Bot
 */
import { CONFIG } from './config.js';
import { ThemeManager } from './theme.js';
import { UtilsNew } from './utils.js';

export class UIManager {
    constructor(state) {
        this.state = state;
        this.updateUI = () => {};
        this.updateStats = () => {};
        this.updateDataButtons = () => {};
    }

    /**
     * Make an element draggable
     */
    makeDraggable(element) {
        let pos1 = 0,
            pos2 = 0,
            pos3 = 0,
            pos4 = 0;
        let isDragging = false;
        const header = element.querySelector('.wplace-header') || element.querySelector('.wplace-settings-header');

        if (!header) {
            console.warn('No draggable header found for element:', element);
            return;
        }

        header.onmousedown = dragMouseDown;

        function dragMouseDown(e) {
            if (e.target.closest('.wplace-header-btn') || e.target.closest('button')) return;

            e.preventDefault();
            isDragging = true;

            const rect = element.getBoundingClientRect();

            element.style.transform = 'none';
            element.style.top = rect.top + 'px';
            element.style.left = rect.left + 'px';

            pos3 = e.clientX;
            pos4 = e.clientY;
            element.classList.add('wplace-dragging');
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;

            document.body.style.userSelect = 'none';
        }

        function elementDrag(e) {
            if (!isDragging) return;

            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;

            let newTop = element.offsetTop - pos2;
            let newLeft = element.offsetLeft - pos1;

            const rect = element.getBoundingClientRect();
            const maxTop = window.innerHeight - rect.height;
            const maxLeft = window.innerWidth - rect.width;

            newTop = Math.max(0, Math.min(newTop, maxTop));
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));

            element.style.top = newTop + 'px';
            element.style.left = newLeft + 'px';
        }

        function closeDragElement() {
            isDragging = false;
            element.classList.remove('wplace-dragging');
            document.onmouseup = null;
            document.onmousemove = null;
            document.body.style.userSelect = '';
        }
    }

    /**
     * Get milliseconds to target charges
     */
    getMsToTargetCharges(current, target, cooldown) {
        const remainingCharges = target - current;
        return Math.max(0, remainingCharges * cooldown);
    }

    /**
     * Update charge stats display
     */
    updateChargeStatsDisplay(intervalMs) {
        const currentChargesEl = document.getElementById('wplace-stat-charges-value');
        const fullChargeEl = document.getElementById('wplace-stat-fullcharge-value');
        if (!fullChargeEl && !currentChargesEl) return;
        if (!this.state.fullChargeData) {
            fullChargeEl.textContent = '--:--:--';
            return;
        }

        const { current, max, cooldownMs, startTime, spentSinceShot } = this.state.fullChargeData;
        const elapsed = Date.now() - startTime;

        // total charges including elapsed time and spent during painting since snapshot
        const chargesGained = elapsed / cooldownMs;
        const rawCharges = current + chargesGained - spentSinceShot;
        const cappedCharges = Math.min(rawCharges, max);

        // rounding with 0.95 threshold
        let displayCharges;
        const fraction = cappedCharges - Math.floor(cappedCharges);
        if (fraction >= 0.95) {
            displayCharges = Math.ceil(cappedCharges);
        } else {
            displayCharges = Math.floor(cappedCharges);
        }

        this.state.displayCharges = Math.max(0, displayCharges);
        this.state.preciseCurrentCharges = cappedCharges;

        const remainingMs = this.getMsToTargetCharges(cappedCharges, max, this.state.cooldown, intervalMs);
        const timeText = UtilsNew.msToTimeText(remainingMs);

        if (currentChargesEl) {
            currentChargesEl.innerHTML = `${this.state.displayCharges} / ${this.state.maxCharges}`;
        }

        if (
            this.state.displayCharges < this.state.cooldownChargeThreshold &&
            !this.state.stopFlag &&
            this.state.running
        ) {
            this.updateChargesThresholdUI(intervalMs);
        }

        if (fullChargeEl) {
            if (this.state.displayCharges >= max) {
                fullChargeEl.innerHTML = `<span style="color:#10b981;">FULL</span>`;
            } else {
                fullChargeEl.innerHTML = `
            <span style="color:#f59e0b;">${timeText}</span>
          `;
            }
        }
    }

    /**
     * Update charges threshold UI
     */
    updateChargesThresholdUI(intervalMs) {
        if (this.state.stopFlag) return;

        const threshold = this.state.cooldownChargeThreshold;
        const remainingMs = this.getMsToTargetCharges(
            this.state.preciseCurrentCharges,
            threshold,
            this.state.cooldown,
            intervalMs
        );
        const timeText = UtilsNew.msToTimeText(remainingMs);

        this.updateUI(
            `⌛ Waiting to reach ${threshold} charges. Currently ${this.state.displayCharges}. Estimated time: ${timeText}.`,
            'warning',
            true
        );
    }

    /**
     * Create the main UI elements
     */
    async createMainUI() {
        const existingContainer = document.getElementById('wplace-image-bot-container');
        const existingStats = document.getElementById('wplace-stats-container');
        const existingSettings = document.getElementById('wplace-settings-container');

        if (existingContainer) existingContainer.remove();
        if (existingStats) existingStats.remove();
        if (existingSettings) existingSettings.remove();

        ThemeManager.applyTheme();
        ThemeManager.loadThemeStyles();

        const container = document.createElement('div');
        container.id = 'wplace-image-bot-container';
        container.innerHTML = this.getMainContainerHTML();

        // Stats Window - Separate UI
        const statsContainer = document.createElement('div');
        statsContainer.id = 'wplace-stats-container';
        statsContainer.style.display = 'none';
        statsContainer.innerHTML = this.getStatsContainerHTML();

        // Settings Container
        const settingsContainer = document.createElement('div');
        settingsContainer.id = 'wplace-settings-container';
        settingsContainer.className = 'wplace-settings-container-base';
        settingsContainer.innerHTML = this.getSettingsContainerHTML();

        document.body.appendChild(container);
        document.body.appendChild(statsContainer);
        document.body.appendChild(settingsContainer);

        // Show the main container after all elements are appended
        container.style.display = 'block';

        return { container, statsContainer, settingsContainer };
    }

    /**
     * Get main container HTML
     */
    getMainContainerHTML() {
        return `
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-image"></i>
          <span>Auto-Image</span>
        </div>
        <div class="wplace-header-controls">
          <button id="settingsBtn" class="wplace-header-btn" title="Settings">
            <i class="fas fa-cog"></i>
          </button>
          <button id="statsBtn" class="wplace-header-btn" title="Show Stats">
            <i class="fas fa-chart-bar"></i>
          </button>
          <button id="compactBtn" class="wplace-header-btn" title="Compact Mode">
            <i class="fas fa-compress"></i>
          </button>
          <button id="minimizeBtn" class="wplace-header-btn" title="Minimize">
            <i class="fas fa-minus"></i>
          </button>
        </div>
      </div>
      <div class="wplace-content">
        <!-- Status Section - Always visible -->
        <div class="wplace-status-section">
          <div id="statusText" class="wplace-status status-default">
            Click 'Upload Image' to begin
          </div>
          <div class="wplace-progress">
            <div id="progressBar" class="wplace-progress-bar" style="width: 0%"></div>
          </div>
        </div>

        <!-- Image Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">🖼️ Image Management</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="uploadBtn" class="wplace-btn wplace-btn-upload" disabled title="🔄 Waiting for initial setup to complete...">
                <i class="fas fa-upload"></i>
                <span>Upload</span>
              </button>
            </div>
            <div class="wplace-row single">
              <button id="selectPosBtn" class="wplace-btn wplace-btn-select" disabled>
                <i class="fas fa-crosshairs"></i>
                <span>Select Position</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Control Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">🎮 Painting Control</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="startBtn" class="wplace-btn wplace-btn-start" disabled>
                <i class="fas fa-play"></i>
                <span>Start</span>
              </button>
              <button id="stopBtn" class="wplace-btn wplace-btn-stop" disabled>
                <i class="fas fa-stop"></i>
                <span>Stop</span>
              </button>
            </div>
            <div class="wplace-row single">
                <button id="toggleOverlayBtn" class="wplace-btn wplace-btn-overlay" disabled>
                    <i class="fas fa-eye"></i>
                    <span>Toggle Overlay</span>
                </button>
            </div>
          </div>
        </div>

        <!-- Cooldown Section -->
        <div class="wplace-section">
            <div class="wplace-section-title">⏱️ Cooldown Settings</div>
            <div class="wplace-cooldown-control">
                <label id="cooldownLabel">Wait until charges reach:</label>
                <div class="wplace-dual-control-compact">
                    <div class="wplace-slider-container-compact">
                        <input type="range" id="cooldownSlider" class="wplace-slider" min="1" max="1" value="${
                            this.state.cooldownChargeThreshold
                        }">
                    </div>
                    <div class="wplace-input-group-compact">
                        <button id="cooldownDecrease" class="wplace-input-btn-compact" type="button">-</button>
                        <input type="number" id="cooldownInput" class="wplace-number-input-compact" min="1" max="999" value="${
                            this.state.cooldownChargeThreshold
                        }">
                        <button id="cooldownIncrease" class="wplace-input-btn-compact" type="button">+</button>
                        <span id="cooldownValue" class="wplace-input-label-compact">Charges</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Data Section -->
        <div class="wplace-section">
          <div class="wplace-section-title">💾 Data Management</div>
          <div class="wplace-controls">
            <div class="wplace-row">
              <button id="saveBtn" class="wplace-btn wplace-btn-primary" disabled>
                <i class="fas fa-save"></i>
                <span>Save Progress</span>
              </button>
              <button id="loadBtn" class="wplace-btn wplace-btn-primary" disabled title="🔄 Waiting for token generator to initialize...">
                <i class="fas fa-folder-open"></i>
                <span>Load Progress</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    /**
     * Get stats container HTML
     */
    getStatsContainerHTML() {
        return `
      <div class="wplace-header">
        <div class="wplace-header-title">
          <i class="fas fa-chart-bar"></i>
          <span>Painting Stats</span>
        </div>
        <div class="wplace-header-controls">
          <button id="refreshChargesBtn" class="wplace-header-btn" title="Refresh Charges">
            <i class="fas fa-sync"></i>
          </button>
          <button id="closeStatsBtn" class="wplace-header-btn" title="Close Stats">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div class="wplace-content">
        <div class="wplace-stats">
          <div id="statsArea">
            <div class="wplace-stat-item">
              <div class="wplace-stat-label"><i class="fas fa-info-circle"></i> Click 'Upload Image' to begin</div>
            </div>
          </div>
        </div>
      </div>
    `;
    }

    /**
     * Get settings container HTML
     */
    getSettingsContainerHTML() {
        // Apply theme-based styling
        const themeBackground = `linear-gradient(135deg, ${CONFIG.THEME.primary} 0%, ${
            CONFIG.THEME.secondary || CONFIG.THEME.primary
        } 100%)`;

        return `
      <div class="wplace-settings-header">
        <div class="wplace-settings-title-wrapper">
          <h3 class="wplace-settings-title">
            <i class="fas fa-cog wplace-settings-icon"></i>
            Settings
          </h3>
          <button id="closeSettingsBtn" class="wplace-settings-close-btn">✕</button>
        </div>
      </div>

      <div class="wplace-settings-content">
        
        <!-- Token Source Selection -->
        <div class="wplace-settings-section">
          <label class="wplace-settings-section-label">
            <i class="fas fa-key wplace-icon-key"></i>
            Token Source
          </label>
          <div class="wplace-settings-section-wrapper">
            <select id="tokenSourceSelect" class="wplace-settings-select">
              <option value="generator" ${
                  this.state.tokenSource === 'generator' ? 'selected' : ''
              } class="wplace-settings-option">🤖 Automatic Token Generator (Recommended)</option>
              <option value="hybrid" ${
                  this.state.tokenSource === 'hybrid' ? 'selected' : ''
              } class="wplace-settings-option">🔄 Generator + Auto Fallback</option>
              <option value="manual" ${
                  this.state.tokenSource === 'manual' ? 'selected' : ''
              } class="wplace-settings-option">🎯 Manual Pixel Placement</option>
            </select>
            <p class="wplace-settings-description">
              Generator mode creates tokens automatically. Hybrid mode falls back to manual when generator fails. Manual mode only uses pixel placement.
            </p>
          </div>
        </div>

        <!-- Additional settings sections would go here -->
        
      </div>

      <div class="wplace-settings-footer">
           <button id="applySettingsBtn" class="wplace-settings-apply-btn">
               <i class="fas fa-check"></i> Apply Settings
        </button>
      </div>

      <style>
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes settings-slide-in {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes settings-fade-out {
          from {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          to {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.9);
          }
        }
      </style>
    `;
    }
}
