/**
 * RoomCodeInput - Component for 5 clickable colored dice to enter room codes
 * Click a die to cycle its color. Swipe (or drag) up/down on a die to change its value.
 */
import { getDiceSvg, getPipColor } from "../../../utils/dice-utils.js";
import {
  ROOM_CODE_COLORS,
  ROOM_CODE_LENGTH,
  encodeRoomId,
  parseRoomId,
} from "../../../utils/room-id.js";

const SWIPE_THRESHOLD = 15; // px needed to register a vertical swipe

class RoomCodeInput extends HTMLElement {
  constructor() {
    super();
    this._dice = Array.from({ length: ROOM_CODE_LENGTH }, () => ({
      colorIndex: 0,
      value: 1,
    }));
    this._pointerState = null; // tracks active touch/mouse drag
  }

  connectedCallback() {
    this._render();
    this._attachListeners();
  }

  _render() {
    this.innerHTML = `
      <div class="form-group room-id-group">
        <div class="dice-input-container">
          ${this._dice
            .map(
              (die, i) => `
            <div class="room-dice" data-index="${i}">${this._renderDie(die)}</div>
          `,
            )
            .join("")}
        </div>
        <div class="dice-hint">tap to change color · swipe up/down to change value</div>
      </div>
    `;
  }

  _renderDie(die) {
    const color = ROOM_CODE_COLORS[die.colorIndex];
    const pipColor = getPipColor(color.hex);
    return getDiceSvg(die.value, pipColor, color.hex);
  }

  _attachListeners() {
    // Pointer-based interaction for both touch and mouse
    this.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    this.addEventListener("pointermove", (e) => this._onPointerMove(e));
    this.addEventListener("pointerup", (e) => this._onPointerUp(e));
    this.addEventListener("pointercancel", () => this._resetPointer());

    // Prevent context menu on long press
    this.addEventListener("contextmenu", (e) => {
      if (e.target.closest(".room-dice")) e.preventDefault();
    });
  }

  _getDieIndex(e) {
    const die = e.target.closest(".room-dice");
    if (!die) return -1;
    return parseInt(die.dataset.index, 10);
  }

  _onPointerDown(e) {
    const index = this._getDieIndex(e);
    if (index === -1) return;

    // Capture the pointer so we get move/up even if finger leaves element
    e.target.closest(".room-dice")?.setPointerCapture?.(e.pointerId);

    this._pointerState = {
      index,
      startY: e.clientY,
      swiped: false,
    };
  }

  _onPointerMove(e) {
    if (!this._pointerState || this._pointerState.swiped) return;

    const dy = this._pointerState.startY - e.clientY; // positive = swipe up
    if (Math.abs(dy) >= SWIPE_THRESHOLD) {
      // Mark as swiped — stays true for the rest of this gesture
      // so pointerup won't also fire a color change
      this._pointerState.swiped = true;

      const index = this._pointerState.index;
      const die = this._dice[index];
      if (dy > 0) {
        die.value = (die.value % 6) + 1;
      } else {
        die.value = die.value === 1 ? 6 : die.value - 1;
      }

      this._animateDie(index, "flipping");
      this._updateDie(index);
    }
  }

  _onPointerUp(e) {
    if (!this._pointerState) return;

    // If no swipe happened, treat as a tap — cycle color
    if (!this._pointerState.swiped) {
      const index = this._pointerState.index;
      this._dice[index].colorIndex =
        (this._dice[index].colorIndex + 1) % ROOM_CODE_COLORS.length;
      this._animateDie(index, "flipping");
      this._updateDie(index);
    }

    this._resetPointer();
  }

  _resetPointer() {
    this._pointerState = null;
  }

  _animateDie(index, className) {
    const dieEl = this.querySelector(`.room-dice[data-index="${index}"]`);
    if (!dieEl) return;
    dieEl.classList.remove(className);
    // Force reflow to restart animation
    void dieEl.offsetWidth;
    dieEl.classList.add(className);
    setTimeout(() => dieEl.classList.remove(className), 200);
  }

  _updateDie(index) {
    const die = this._dice[index];
    const dieEl = this.querySelector(`.room-dice[data-index="${index}"]`);
    if (dieEl) dieEl.innerHTML = this._renderDie(die);

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
    this._dice.forEach((die, i) => {
      const dieEl = this.querySelector(`.room-dice[data-index="${i}"]`);
      if (dieEl) dieEl.innerHTML = this._renderDie(die);
    });
  }
}

customElements.define("room-code-input", RoomCodeInput);
