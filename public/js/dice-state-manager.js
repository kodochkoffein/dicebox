/**
 * DiceStateManager - Manages dice configuration and settings
 * Holder state is managed by MeshState (single source of truth)
 */
export class DiceStateManager extends EventTarget {
  constructor() {
    super();
    this.diceSettings = {
      diceSets: [{ id: 'set-1', count: 2, color: '#ffffff' }]
    };
  }

  /**
   * Get current dice settings
   */
  getSettings() {
    return this.diceSettings;
  }

  /**
   * Set dice settings
   */
  setSettings(settings) {
    if (settings && settings.diceSets) {
      this.diceSettings = settings;
    } else {
      // Migrate from old format
      this.diceSettings = {
        diceSets: [{ id: 'set-1', count: settings?.count || 2, color: '#ffffff' }]
      };
    }
    this.dispatchEvent(new CustomEvent('settings-changed', { detail: this.diceSettings }));
  }

  /**
   * Reset dice settings to default
   */
  reset() {
    this.diceSettings = {
      diceSets: [{ id: 'set-1', count: 2, color: '#ffffff' }]
    };
    this.dispatchEvent(new CustomEvent('reset'));
  }
}
