import { describe, it, expect } from "vitest";
import { getDiceSvg, getPipColor, hexToRgba } from "./dice-utils.js";

describe("dice-utils", () => {
  describe("getDiceSvg", () => {
    it("should return an SVG string for each value 1-6", () => {
      for (let v = 1; v <= 6; v++) {
        const svg = getDiceSvg(v);
        expect(svg).toContain("<svg");
        expect(svg).toContain("</svg>");
      }
    });

    it("should render the correct number of pips", () => {
      for (let v = 1; v <= 6; v++) {
        const svg = getDiceSvg(v);
        const pipCount = (svg.match(/<circle/g) || []).length;
        expect(pipCount).toBe(v);
      }
    });

    it("should use default dark pip color", () => {
      const svg = getDiceSvg(1);
      expect(svg).toContain('fill="#0f172a"');
    });

    it("should use custom pip color when provided", () => {
      const svg = getDiceSvg(1, "#ffffff");
      expect(svg).toContain('fill="#ffffff"');
    });

    it("should not include background rect when bgColor is omitted", () => {
      const svg = getDiceSvg(3);
      expect(svg).not.toContain("<rect");
    });

    it("should include background rect when bgColor is provided", () => {
      const svg = getDiceSvg(3, "#0f172a", "#ef4444");
      expect(svg).toContain("<rect");
      expect(svg).toContain('fill="#ef4444"');
    });

    it("should place background rect before pips in SVG", () => {
      const svg = getDiceSvg(1, "#fff", "#3b82f6");
      const rectIndex = svg.indexOf("<rect");
      const circleIndex = svg.indexOf("<circle");
      expect(rectIndex).toBeLessThan(circleIndex);
    });

    it("should render background rect with rounded corners", () => {
      const svg = getDiceSvg(1, "#fff", "#3b82f6");
      expect(svg).toContain('rx="8"');
    });
  });

  describe("getPipColor", () => {
    it("should return dark pips for white dice", () => {
      expect(getPipColor("#ffffff")).toBe("#0f172a");
    });

    it("should return dark pips for yellow dice", () => {
      expect(getPipColor("#eab308")).toBe("#0f172a");
    });

    it("should return white pips for dark colored dice", () => {
      expect(getPipColor("#ef4444")).toBe("#ffffff");
      expect(getPipColor("#3b82f6")).toBe("#ffffff");
      expect(getPipColor("#6366f1")).toBe("#ffffff");
      expect(getPipColor("#10b981")).toBe("#ffffff");
    });
  });

  describe("hexToRgba", () => {
    it("should convert hex to rgba", () => {
      expect(hexToRgba("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    });

    it("should handle full opacity", () => {
      expect(hexToRgba("#3b82f6", 1)).toBe("rgba(59, 130, 246, 1)");
    });

    it("should handle zero opacity", () => {
      expect(hexToRgba("#000000", 0)).toBe("rgba(0, 0, 0, 0)");
    });
  });
});
