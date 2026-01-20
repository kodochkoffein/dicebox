/**
 * DiceHistory - Web Component for displaying roll history
 */
class DiceHistory extends HTMLElement {
  constructor() {
    super();
    this.history = [];
    this.maxItems = 50;
    this.selfPeerId = null;
  }

  connectedCallback() {
    this.render();
  }

  set peerId(value) {
    this.selfPeerId = value;
  }

  getDiceSvg(value) {
    const pipColor = '#0f172a';
    const positions = {
      topLeft: { cx: 14, cy: 14 },
      topRight: { cx: 36, cy: 14 },
      midLeft: { cx: 14, cy: 25 },
      center: { cx: 25, cy: 25 },
      midRight: { cx: 36, cy: 25 },
      bottomLeft: { cx: 14, cy: 36 },
      bottomRight: { cx: 36, cy: 36 }
    };
    const pipConfigs = {
      1: ['center'],
      2: ['topRight', 'bottomLeft'],
      3: ['topRight', 'center', 'bottomLeft'],
      4: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
      5: ['topLeft', 'topRight', 'center', 'bottomLeft', 'bottomRight'],
      6: ['topLeft', 'topRight', 'midLeft', 'midRight', 'bottomLeft', 'bottomRight']
    };
    const pips = pipConfigs[value].map(pos => {
      const p = positions[pos];
      return `<circle cx="${p.cx}" cy="${p.cy}" r="5" fill="${pipColor}"/>`;
    }).join('');
    return `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">${pips}</svg>`;
  }

  render() {
    this.innerHTML = `
      <div class="card">
        <h3>Roll History</h3>
        <div class="history-list">
          <div class="empty-message">No rolls yet. Be the first to roll!</div>
        </div>
      </div>
    `;
  }

  addRoll({ username, peerId, diceType, count, values, total }) {
    const roll = {
      username,
      peerId,
      diceType,
      count,
      values,
      total,
      timestamp: Date.now()
    };

    this.history.unshift(roll);

    // Keep history limited
    if (this.history.length > this.maxItems) {
      this.history = this.history.slice(0, this.maxItems);
    }

    this.renderHistory();
  }

  renderHistory() {
    const listEl = this.querySelector('.history-list');

    if (this.history.length === 0) {
      listEl.innerHTML = '<div class="empty-message">No rolls yet. Be the first to roll!</div>';
      return;
    }

    listEl.innerHTML = this.history.map(roll => {
      const isSelf = roll.peerId === this.selfPeerId;
      const diceHtml = roll.values.map(v =>
        `<span class="history-die">${this.getDiceSvg(v)}</span>`
      ).join('');

      return `
        <div class="history-item">
          <span class="username ${isSelf ? 'self' : ''}">${this.escapeHtml(roll.username)}</span>
          <span class="history-dice">${diceHtml}</span>
        </div>
      `;
    }).join('');
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  clear() {
    this.history = [];
    this.renderHistory();
  }
}

customElements.define('dice-history', DiceHistory);
