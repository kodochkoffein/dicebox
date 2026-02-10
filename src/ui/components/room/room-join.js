/**
 * RoomJoin - Component for joining an existing dice room
 */
import "../shared/username-input.js";
import "./room-code-input.js";

class RoomJoin extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <username-input></username-input>
      <room-code-input></room-code-input>
      <div class="join-buttons">
        <button class="btn-join" id="submit-btn">Enter Room</button>
      </div>
      <p class="inline-error" hidden></p>
    `;

    this.querySelector("#submit-btn").addEventListener("click", () =>
      this._handleSubmit(),
    );
    this.addEventListener("username-submit", () => this._handleSubmit());
    this.addEventListener("room-code-changed", () => this.clearError());
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
    const roomCodeInput = this.querySelector("room-code-input");

    this.dispatchEvent(
      new CustomEvent("join-room", {
        bubbles: true,
        detail: {
          username: usernameInput.value,
          roomId: roomCodeInput.roomCode,
          isHost: false,
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

  setRoomCode(code) {
    const roomCodeInput = this.querySelector("room-code-input");
    if (roomCodeInput) {
      roomCodeInput.setRoomCode(code);
    }
  }
}

customElements.define("room-join", RoomJoin);
