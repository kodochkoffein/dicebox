/**
 * RoomCodeInput - Component for 5 clickable colored dice to enter room codes
 * Click die face to cycle value (1-6), click color dot below to cycle color.
 */
import { getDiceSvg, getPipColor } from "../../../utils/dice-utils.js";
import {
  ROOM_CODE_COLORS,
  ROOM_CODE_LENGTH,
  encodeRoomId,
  parseRoomId,
} from "../../../utils/room-id.js";

class RoomCodeInput extends HTMLElement {
  constructor() {
    super();
    // Each die has { colorIndex: 0-5, value: 1-6 }
    this._dice = Array.from({ length: ROOM_CODE_LENGTH }, () => ({
      colorIndex: 0,
      value: 1,
    }));
  }

  connectedCallback() {
    this._render();
    this.addEventListener("click", (e) => this._handleClick(e));
  }

  _render() {
    this.innerHTML = `
      <div class="form-group room-id-group">
        <label>Room Code <span class="dice-hint">(click dice to change value, dot to change color)</span></label>
        <div class="dice-input-container">
          ${this._dice
            .map(
              (die, i) => `
            <div class="room-dice-slot" data-index="${i}">
              <div class="room-dice" data-index="${i}">${this._renderDie(die)}</div>
              <div class="room-dice-color-dot" data-index="${i}" style="background: ${ROOM_CODE_COLORS[die.colorIndex].hex}"></div>
            </div>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  _renderDie(die) {
    const color = ROOM_CODE_COLORS[die.colorIndex];
    const pipColor = getPipColor(color.hex);
    return getDiceSvg(die.value, pipColor, color.hex);
  }

  _handleClick(e) {
    // Color dot click — cycle color
    const dot = e.target.closest(".room-dice-color-dot");
    if (dot) {
      const index = parseInt(dot.dataset.index, 10);
      this._dice[index].colorIndex =
        (this._dice[index].colorIndex + 1) % ROOM_CODE_COLORS.length;
      this._updateDie(index);
      return;
    }

    // Die face click — cycle value
    const die = e.target.closest(".room-dice");
    if (die) {
      const index = parseInt(die.dataset.index, 10);
      this._dice[index].value = (this._dice[index].value % 6) + 1;
      const dieEl = this.querySelector(`.room-dice[data-index="${index}"]`);
      dieEl.classList.add("flipping");
      setTimeout(() => dieEl.classList.remove("flipping"), 200);
      this._updateDie(index);
    }
  }

  _updateDie(index) {
    const die = this._dice[index];
    const dieEl = this.querySelector(`.room-dice[data-index="${index}"]`);
    const dotEl = this.querySelector(
      `.room-dice-color-dot[data-index="${index}"]`,
    );

    if (dieEl) dieEl.innerHTML = this._renderDie(die);
    if (dotEl)
      dotEl.style.background = ROOM_CODE_COLORS[die.colorIndex].hex;

    this.dispatchEvent(
      new CustomEvent("room-code-changed", {
        bubbles: true,
        detail: { roomCode: this.roomCode },
      }),
    );
  }

  get roomCode() {
    return encodeRoomId(this._dice);
  }

  setRoomCode(code) {
    const parsed = parseRoomId(code);
    if (!parsed) return;

    this._dice = parsed;
    // Re-render all dice
    this._dice.forEach((die, i) => {
      const dieEl = this.querySelector(`.room-dice[data-index="${i}"]`);
      const dotEl = this.querySelector(
        `.room-dice-color-dot[data-index="${i}"]`,
      );
      if (dieEl) dieEl.innerHTML = this._renderDie(die);
      if (dotEl)
        dotEl.style.background = ROOM_CODE_COLORS[die.colorIndex].hex;
    });
  }
}

customElements.define("room-code-input", RoomCodeInput);
