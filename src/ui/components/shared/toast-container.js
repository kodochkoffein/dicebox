/**
 * ToastContainer - Dismissable toast notifications for unexpected errors
 * Appends itself to document.body. Show toasts via ToastContainer.show(message).
 */

const TOAST_DURATION = 6000;

class ToastContainer extends HTMLElement {
  connectedCallback() {
    this.setAttribute("aria-live", "polite");
    this.setAttribute("role", "status");
  }

  /**
   * @param {string} message
   * @param {"error"|"warning"|"info"} [level="error"]
   */
  show(message, level = "error") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${level}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-dismiss" aria-label="Dismiss">&times;</button>
    `;

    toast.querySelector(".toast-dismiss").addEventListener("click", () => {
      this._remove(toast);
    });

    this.appendChild(toast);

    const timer = setTimeout(() => this._remove(toast), TOAST_DURATION);
    toast._timer = timer;
  }

  _remove(toast) {
    clearTimeout(toast._timer);
    toast.classList.add("toast-exit");
    toast.addEventListener("animationend", () => toast.remove(), { once: true });
  }
}

customElements.define("toast-container", ToastContainer);

/** Lazily create and return the singleton toast container */
export function getToastContainer() {
  let el = document.querySelector("toast-container");
  if (!el) {
    el = document.createElement("toast-container");
    document.body.appendChild(el);
  }
  return el;
}

export function showToast(message, level = "error") {
  getToastContainer().show(message, level);
}
