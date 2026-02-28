import { describe, expect, it, vi } from "vitest";
import {
  extractDomain,
  fetchPageContent,
  verifyDomain,
} from "~/lib/sites.server";

vi.mock("node:dns", () => ({
  default: {
    promises: {
      resolve: vi.fn(),
    },
  },
}));

describe("extractDomain", () => {
  it("extracts hostname from full URL", () => {
    expect(extractDomain("https://example.com/path?q=1")).toBe("example.com");
  });

  it("extracts hostname when scheme is missing", () => {
    expect(extractDomain("example.com")).toBe("example.com");
  });

  it("returns null for localhost", () => {
    expect(extractDomain("http://localhost:3000")).toBeNull();
  });

  it("returns null for bare IP address", () => {
    expect(extractDomain("http://192.168.1.1")).toBeNull();
  });

  it("returns null for unparseable input", () => {
    expect(extractDomain("not a url at all !!")).toBeNull();
  });
});

describe("verifyDomain", () => {
  it("returns true when A record resolves", async () => {
    const { default: dns } = await import("node:dns");
    vi.mocked(dns.promises.resolve).mockResolvedValue(["1.2.3.4"] as never);
    expect(await verifyDomain("example.com")).toBe(true);
  });

  it("returns false when DNS lookup fails", async () => {
    const { default: dns } = await import("node:dns");
    vi.mocked(dns.promises.resolve).mockRejectedValue(new Error("ENOTFOUND"));
    expect(await verifyDomain("nonexistent.invalid")).toBe(false);
  });
});

describe("fetchPageContent", () => {
  it("returns extracted text from HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "<html><body><p>Hello world</p></body></html>",
      }),
    );
    const content = await fetchPageContent("example.com");
    expect(content).toContain("Hello world");
  });

  it("returns null when response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, text: async () => "" }),
    );
    expect(await fetchPageContent("example.com")).toBeNull();
  });

  it("returns null on network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await fetchPageContent("example.com")).toBeNull();
  });
});
