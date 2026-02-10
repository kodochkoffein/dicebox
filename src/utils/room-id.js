/**
 * Room ID utilities - encode/decode/generate room codes using colored dice
 *
 * Room codes consist of 5 dice, each with a color (6 options) and value (1-6).
 * Encoded as a 10-character alphanumeric string: "R3B5W1G4P2"
 * This gives 36^5 = 60,466,176 unique combinations.
 */

import { getDiceSvg, getPipColor } from "./dice-utils.js";

export const ROOM_CODE_COLORS = [
  { code: "W", name: "White", hex: "#ffffff" },
  { code: "R", name: "Red", hex: "#ef4444" },
  { code: "B", name: "Blue", hex: "#3b82f6" },
  { code: "G", name: "Green", hex: "#10b981" },
  { code: "P", name: "Purple", hex: "#6366f1" },
  { code: "Y", name: "Yellow", hex: "#eab308" },
];

export const ROOM_CODE_LENGTH = 4;

/**
 * Generate a random room ID string
 * @returns {string} e.g. "R3B5W1G4P2"
 */
export function generateRoomId() {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => {
    const color =
      ROOM_CODE_COLORS[Math.floor(Math.random() * ROOM_CODE_COLORS.length)];
    const value = Math.floor(Math.random() * 6) + 1;
    return `${color.code}${value}`;
  }).join("");
}

/**
 * Parse a room ID string into an array of { colorIndex, value } objects
 * @param {string} roomId e.g. "R3B5W1G4P2"
 * @returns {Array<{ colorIndex: number, value: number }>|null} null if invalid
 */
export function parseRoomId(roomId) {
  if (
    typeof roomId !== "string" ||
    roomId.length !== ROOM_CODE_LENGTH * 2
  ) {
    return null;
  }

  const dice = [];
  for (let i = 0; i < roomId.length; i += 2) {
    const colorCode = roomId[i];
    const value = parseInt(roomId[i + 1], 10);

    const colorIndex = ROOM_CODE_COLORS.findIndex(
      (c) => c.code === colorCode,
    );
    if (colorIndex === -1 || isNaN(value) || value < 1 || value > 6) {
      return null;
    }

    dice.push({ colorIndex, value });
  }

  return dice;
}

/**
 * Encode an array of { colorIndex, value } objects into a room ID string
 * @param {Array<{ colorIndex: number, value: number }>} dice
 * @returns {string}
 */
export function encodeRoomId(dice) {
  return dice
    .map((d) => `${ROOM_CODE_COLORS[d.colorIndex].code}${d.value}`)
    .join("");
}

/**
 * Render a room ID as inline HTML with mini colored dice SVGs
 * @param {string} roomId e.g. "R3B5W1G4P2"
 * @returns {string} HTML string with inline dice
 */
export function roomIdToHtml(roomId) {
  const dice = parseRoomId(roomId);
  if (!dice) return roomId;

  return dice
    .map((d) => {
      const color = ROOM_CODE_COLORS[d.colorIndex];
      const pip = getPipColor(color.hex);
      const svg = getDiceSvg(d.value, pip, color.hex);
      return `<span class="room-code-die">${svg}</span>`;
    })
    .join("");
}
