import type { StoredRetrospective } from "../storage.js";

export type HistoryEntry = {
    epicKey: string;
    epicSummary: string;
    boardName: string;
    documentUrl: string;
    generatedAt: string;
};

export type QuarterGroup = {
    quarter: string;
    year: number;
    quarterNumber: number;
    entries: HistoryEntry[];
};

function getQuarterLabel(date: Date): { label: string; sortKey: number } {
    const year = date.getUTCFullYear();
    const quarter = Math.ceil((date.getUTCMonth() + 1) / 3);
    return {
        label: `Q${quarter} ${year}`,
        sortKey: year * 4 + quarter,
    };
}

export function groupByQuarter(retrospectives: StoredRetrospective[]): QuarterGroup[] {
    const groups = new Map<string, { sortKey: number; year: number; quarterNumber: number; entries: HistoryEntry[] }>();

    for (const r of retrospectives) {
        const date = new Date(r.generatedAt);
        const { label, sortKey } = getQuarterLabel(date);
        const year = date.getUTCFullYear();
        const quarterNumber = Math.ceil((date.getUTCMonth() + 1) / 3);

        if (!groups.has(label)) {
            groups.set(label, { sortKey, year, quarterNumber, entries: [] });
        }

        groups.get(label)!.entries.push({
            epicKey: r.epicKey,
            epicSummary: r.epicSummary ?? r.epicKey,
            boardName: r.boardName,
            documentUrl: r.documentUrl,
            generatedAt: r.generatedAt,
        });
    }

    // Sort entries within each quarter newest-first
    for (const group of groups.values()) {
        group.entries.sort(
            (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
        );
    }

    // Return quarters sorted newest-first
    return Array.from(groups.entries())
        .sort(([, a], [, b]) => b.sortKey - a.sortKey)
        .map(([quarter, { year, quarterNumber, entries }]) => ({
            quarter,
            year,
            quarterNumber,
            entries,
        }));
}
