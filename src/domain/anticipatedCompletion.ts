import { addWorkingDays, advanceToMonday } from "./workingDays.js";

/**
 * Computes the anticipated completion date for an epic.
 *
 * Formula: today + (openTicketCount × avgCycleTimeDays) working days,
 * then advanced to the next Monday if the result falls on a weekend.
 *
 * Returns null when avgCycleTimeDays is zero (no historical data available).
 */
export function computeAnticipatedCompletionDate(
    today: Date,
    openTicketCount: number,
    avgCycleTimeDays: number
): Date | null {
    if (avgCycleTimeDays <= 0) return null;

    const totalWorkingDays = Math.round(openTicketCount * avgCycleTimeDays);
    const completionDate = addWorkingDays(today, totalWorkingDays);
    return advanceToMonday(completionDate);
}

export function formatDateMMDDYYYY(date: Date): string {
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yyyy = String(date.getFullYear());
    return `${mm}/${dd}/${yyyy}`;
}
