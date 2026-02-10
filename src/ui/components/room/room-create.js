/**
 * RoomCreate - Component for creating a new dice room
 */
import "../shared/username-input.js";
import "./dice-config.js";
import { generateRoomId } from "../../../utils/room-id.js";

class RoomCreate extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <username-input></username-input>
      <div class="dice-config-group">
        <dice-config></dice-config>
      </div>
      <div class="join-buttons">
        <button class="btn-create" id="submit-btn">Start Room</button>
      </div>
      <p class="inline-error" hidden></p>
    `;

    this.querySelector("#submit-btn").addEventListener("click", () =>
      this._handleSubmit(),
    );
    this.addEventListener("username-submit", () => this._handleSubmit());
    this.querySelector("username-input").focus();
  }

  _handleSubmit() {
    this.clearError();

    const usernameInput = this.querySelector("username-input");
    if (!usernameInput.value) {
      usernameInput.showError();
      return;
    }

    usernameInput.saveToStorage();
    const diceConfig = this.querySelector("dice-config");

    this.dispatchEvent(
      new CustomEvent("join-room", {
        bubbles: true,
        detail: {
          username: usernameInput.value,
          roomId: this._generateRoomId(),
          isHost: true,
          diceConfig: {
            diceSets: [...diceConfig.diceSets],
          },
        },
      }),
    );
  }

  showError(message) {
    const el = this.querySelector(".inline-error");
    if (el) {
      el.textContent = message;
      el.hidden = false;
    }
  }

  clearError() {
    const el = this.querySelector(".inline-error");
    if (el) {
      el.textContent = "";
      el.hidden = true;
    }
  }

  _generateRoomId() {
    return generateRoomId();
  }
}

customElements.define("room-create", RoomCreate);
