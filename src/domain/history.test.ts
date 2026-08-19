import { describe, it, expect } from "vitest";
import { groupByQuarter } from "./history.js";
import type { StoredRetrospective } from "../storage.js";

const makeEntry = (epicKey: string, generatedAt: string, epicSummary?: string): StoredRetrospective => ({
    epicKey,
    boardName: "test-project",
    documentUrl: `https://docs.google.com/${epicKey}`,
    generatedAt,
    epicSummary,
});

describe("groupByQuarter", () => {
    it("returns an empty array for no retrospectives", () => {
        expect(groupByQuarter([])).toEqual([]);
    });

    it("groups retrospectives into the correct quarter", () => {
        const entries = [
            makeEntry("BTT-1", "2024-01-15T10:00:00Z", "Epic One"),
            makeEntry("BTT-2", "2024-04-20T10:00:00Z", "Epic Two"),
        ];

        const result = groupByQuarter(entries);
        expect(result).toHaveLength(2);
        expect(result[0].quarter).toBe("Q2 2024");
        expect(result[1].quarter).toBe("Q1 2024");
    });

    it("sorts quarters newest-first", () => {
        const entries = [
            makeEntry("BTT-1", "2023-03-01T00:00:00Z"),
            makeEntry("BTT-2", "2024-11-01T00:00:00Z"),
            makeEntry("BTT-3", "2024-05-01T00:00:00Z"),
        ];

        const result = groupByQuarter(entries);
        expect(result.map((g) => g.quarter)).toEqual(["Q4 2024", "Q2 2024", "Q1 2023"]);
    });

    it("sorts entries within a quarter newest-first", () => {
        const entries = [
            makeEntry("BTT-1", "2024-02-01T00:00:00Z", "Older"),
            makeEntry("BTT-2", "2024-03-15T00:00:00Z", "Newer"),
        ];

        const result = groupByQuarter(entries);
        expect(result).toHaveLength(1);
        expect(result[0].entries[0].epicKey).toBe("BTT-2");
        expect(result[0].entries[1].epicKey).toBe("BTT-1");
    });

    it("falls back to epicKey when epicSummary is not stored", () => {
        const entries = [makeEntry("BTT-99", "2024-06-01T00:00:00Z")];

        const result = groupByQuarter(entries);
        expect(result[0].entries[0].epicSummary).toBe("BTT-99");
    });

    it("exposes year and quarterNumber on each group", () => {
        const entries = [makeEntry("BTT-1", "2024-07-10T00:00:00Z", "Summer Epic")];

        const result = groupByQuarter(entries);
        expect(result[0].year).toBe(2024);
        expect(result[0].quarterNumber).toBe(3);
    });

    it("places entries on quarter boundaries correctly", () => {
        const entries = [
            makeEntry("BTT-1", "2024-03-31T23:59:59Z"), // Q1
            makeEntry("BTT-2", "2024-04-01T00:00:00Z"), // Q2
            makeEntry("BTT-3", "2024-09-30T23:59:59Z"), // Q3
            makeEntry("BTT-4", "2024-10-01T00:00:00Z"), // Q4
        ];

        const result = groupByQuarter(entries);
        expect(result).toHaveLength(4);
        const quarters = result.map((g) => g.quarter);
        expect(quarters).toContain("Q1 2024");
        expect(quarters).toContain("Q2 2024");
        expect(quarters).toContain("Q3 2024");
        expect(quarters).toContain("Q4 2024");
    });
});
