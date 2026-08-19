import { describe, it, expect } from "vitest";
import { computeAnticipatedCompletionDate, formatDateMMDDYYYY } from "./anticipatedCompletion.js";

// Helper: build a Date from a known weekday for deterministic tests.
// 2024-01-08 is a Monday.
const MONDAY    = new Date("2024-01-08T12:00:00Z");
const WEDNESDAY = new Date("2024-01-10T12:00:00Z");
const FRIDAY    = new Date("2024-01-12T12:00:00Z");
const SATURDAY  = new Date("2024-01-13T12:00:00Z");
const SUNDAY    = new Date("2024-01-14T12:00:00Z");

describe("computeAnticipatedCompletionDate", () => {
    it("returns null when avgCycleTimeDays is 0", () => {
        expect(computeAnticipatedCompletionDate(MONDAY, 5, 0)).toBeNull();
    });

    it("returns null when avgCycleTimeDays is negative", () => {
        expect(computeAnticipatedCompletionDate(MONDAY, 5, -1)).toBeNull();
    });

    it("returns today (advanced to Monday) when there are 0 open tickets", () => {
        // 0 open tickets → 0 working days added → stays on Monday
        const result = computeAnticipatedCompletionDate(MONDAY, 0, 3);
        expect(result).not.toBeNull();
        // Monday + 0 working days = Monday (no weekend adjustment needed)
        expect(result!.getDay()).toBe(1); // Monday
    });

    it("adds the correct number of working days", () => {
        // Monday + 3 working days = Thursday (Mon→Tue→Wed→Thu)
        const result = computeAnticipatedCompletionDate(MONDAY, 1, 3);
        expect(result).not.toBeNull();
        // 1 ticket × 3 days/ticket = 3 working days
        // Mon Jan 8 + 3 working days = Thu Jan 11
        expect(result!.toISOString().startsWith("2024-01-11")).toBe(true);
    });

    it("skips weekends when counting working days", () => {
        // Friday + 1 working day = Monday (skips Sat/Sun)
        const result = computeAnticipatedCompletionDate(FRIDAY, 1, 1);
        expect(result).not.toBeNull();
        expect(result!.getDay()).toBe(1); // Monday
    });

    it("advances a Saturday result to Monday", () => {
        // If adding 0 days from Saturday → still Saturday → must advance to Monday
        const result = computeAnticipatedCompletionDate(SATURDAY, 0, 3);
        expect(result).not.toBeNull();
        expect(result!.getDay()).toBe(1); // Monday
    });

    it("advances a Sunday result to Monday", () => {
        const result = computeAnticipatedCompletionDate(SUNDAY, 0, 3);
        expect(result).not.toBeNull();
        expect(result!.getDay()).toBe(1); // Monday
    });

    it("multiplies open ticket count by average cycle time", () => {
        // Wednesday + (5 tickets × 2 days) = Wednesday + 10 working days
        // Jan 10 (Wed) + 10 working days:
        //   Thu Jan 11, Fri Jan 12, Mon Jan 15, Tue Jan 16, Wed Jan 17,
        //   Thu Jan 18, Fri Jan 19, Mon Jan 22, Tue Jan 23, Wed Jan 24
        const result = computeAnticipatedCompletionDate(WEDNESDAY, 5, 2);
        expect(result).not.toBeNull();
        expect(result!.toISOString().startsWith("2024-01-24")).toBe(true);
    });

    it("rounds fractional working days with half-up rounding", () => {
        // 3 tickets × 1.5 days avg = 4.5 → rounds to 5 working days
        // Monday + 5 working days = Monday (next week)
        const result = computeAnticipatedCompletionDate(MONDAY, 3, 1.5);
        expect(result).not.toBeNull();
        // Mon Jan 8 + 5 working days = Mon Jan 15
        expect(result!.toISOString().startsWith("2024-01-15")).toBe(true);
    });
});

describe("formatDateMMDDYYYY", () => {
    it("formats a date as MM/DD/YYYY", () => {
        expect(formatDateMMDDYYYY(new Date(2024, 0, 8))).toBe("01/08/2024");
    });

    it("zero-pads month and day", () => {
        expect(formatDateMMDDYYYY(new Date(2024, 2, 5))).toBe("03/05/2024");
    });

    it("handles end-of-year dates", () => {
        expect(formatDateMMDDYYYY(new Date(2024, 11, 31))).toBe("12/31/2024");
    });
});
