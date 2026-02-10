import { describe, it, expect } from "vitest";
import {
  ROOM_CODE_COLORS,
  ROOM_CODE_LENGTH,
  generateRoomId,
  parseRoomId,
  encodeRoomId,
} from "./room-id.js";

describe("room-id", () => {
  describe("constants", () => {
    it("should have 6 room code colors", () => {
      expect(ROOM_CODE_COLORS).toHaveLength(6);
    });

    it("should have unique single-letter color codes", () => {
      const codes = ROOM_CODE_COLORS.map((c) => c.code);
      expect(new Set(codes).size).toBe(codes.length);
      codes.forEach((code) => expect(code).toHaveLength(1));
    });

    it("should have unique hex values", () => {
      const hexes = ROOM_CODE_COLORS.map((c) => c.hex);
      expect(new Set(hexes).size).toBe(hexes.length);
    });

    it("should use 4 dice for room codes", () => {
      expect(ROOM_CODE_LENGTH).toBe(4);
    });
  });

  describe("generateRoomId", () => {
    it("should return a string of length ROOM_CODE_LENGTH * 2", () => {
      const id = generateRoomId();
      expect(id).toHaveLength(ROOM_CODE_LENGTH * 2);
    });

    it("should only contain valid color codes and values 1-6", () => {
      const validCodes = ROOM_CODE_COLORS.map((c) => c.code);
      for (let i = 0; i < 50; i++) {
        const id = generateRoomId();
        for (let j = 0; j < id.length; j += 2) {
          expect(validCodes).toContain(id[j]);
          const value = parseInt(id[j + 1], 10);
          expect(value).toBeGreaterThanOrEqual(1);
          expect(value).toBeLessThanOrEqual(6);
        }
      }
    });

    it("should generate different IDs (not always the same)", () => {
      const ids = new Set(Array.from({ length: 20 }, () => generateRoomId()));
      expect(ids.size).toBeGreaterThan(1);
    });
  });

  describe("parseRoomId", () => {
    it("should parse a valid room ID", () => {
      const result = parseRoomId("R3B5W1G4");
      expect(result).toEqual([
        { colorIndex: 1, value: 3 },
        { colorIndex: 2, value: 5 },
        { colorIndex: 0, value: 1 },
        { colorIndex: 3, value: 4 },
      ]);
    });

    it("should return null for wrong length", () => {
      expect(parseRoomId("R3")).toBeNull();
      expect(parseRoomId("R3B5W1G4P2Y6")).toBeNull();
      expect(parseRoomId("")).toBeNull();
    });

    it("should return null for invalid color codes", () => {
      expect(parseRoomId("X3B5W1G4")).toBeNull();
    });

    it("should return null for invalid values", () => {
      expect(parseRoomId("R0B5W1G4")).toBeNull();
      expect(parseRoomId("R7B5W1G4")).toBeNull();
      expect(parseRoomId("RaB5W1G4")).toBeNull();
    });

    it("should return null for non-string input", () => {
      expect(parseRoomId(null)).toBeNull();
      expect(parseRoomId(undefined)).toBeNull();
      expect(parseRoomId(12345)).toBeNull();
    });
  });

  describe("encodeRoomId", () => {
    it("should encode dice array to room ID string", () => {
      const dice = [
        { colorIndex: 1, value: 3 },
        { colorIndex: 2, value: 5 },
        { colorIndex: 0, value: 1 },
        { colorIndex: 3, value: 4 },
      ];
      expect(encodeRoomId(dice)).toBe("R3B5W1G4");
    });

    it("should use all 6 colors correctly", () => {
      const dice = [
        { colorIndex: 0, value: 1 },
        { colorIndex: 1, value: 2 },
        { colorIndex: 2, value: 3 },
        { colorIndex: 3, value: 4 },
      ];
      expect(encodeRoomId(dice)).toBe("W1R2B3G4");
    });
  });

  describe("roundtrip", () => {
    it("should roundtrip encode -> parse", () => {
      const dice = [
        { colorIndex: 5, value: 6 },
        { colorIndex: 0, value: 1 },
        { colorIndex: 3, value: 3 },
        { colorIndex: 1, value: 4 },
      ];
      const encoded = encodeRoomId(dice);
      const parsed = parseRoomId(encoded);
      expect(parsed).toEqual(dice);
    });

    it("should roundtrip parse -> encode", () => {
      const id = "Y6W1G3R4";
      const parsed = parseRoomId(id);
      expect(encodeRoomId(parsed)).toBe(id);
    });

    it("should roundtrip generated IDs", () => {
      for (let i = 0; i < 20; i++) {
        const id = generateRoomId();
        const parsed = parseRoomId(id);
        expect(parsed).not.toBeNull();
        expect(encodeRoomId(parsed)).toBe(id);
      }
    });
  });
});
