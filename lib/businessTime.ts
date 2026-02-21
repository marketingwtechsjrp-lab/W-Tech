/**
 * Calculate commercial hours between two dates.
 * Commercial Hours: Monday - Friday, 07:45 - 18:00
 * Weekends are excluded.
 */

const START_HOUR = 7;
const START_MINUTE = 45;
const END_HOUR = 18;
const END_MINUTE = 0;

// Helper to convert time to minutes from start of day
const getMinutesFromMidnight = (date: Date) => date.getHours() * 60 + date.getMinutes();

export const calculateCommercialTime = (startDateInput: string | Date, endDateInput: string | Date = new Date()): number => {
    const start = new Date(startDateInput);
    const end = new Date(endDateInput);

    if (start >= end) return 0;

    let totalMinutes = 0;
    let current = new Date(start);

    // Normalize start/end commercial minutes
    const commericalStartMins = START_HOUR * 60 + START_MINUTE;
    const commericalEndMins = END_HOUR * 60 + END_MINUTE;

    // Loop through each day from start to end
    while (current < end) {
        // Check if current day is weekend (0=Sun, 6=Sat)
        const day = current.getDay();
        if (day !== 0 && day !== 6) {
            // It's a weekday
            
            // Determine the commercial window for this day
            const windowStart = new Date(current);
            windowStart.setHours(START_HOUR, START_MINUTE, 0, 0);

            const windowEnd = new Date(current);
            windowEnd.setHours(END_HOUR, END_MINUTE, 0, 0);

            // Calculate overlap between [current, end] and [windowStart, windowEnd]
            
            // Effective Start: Max(current, windowStart)
            // But we must respect the actual start time logic for the first day, and full day logic for subsequent
            // Actually 'current' variable will be iterated day by day.
            
            // Let's refine the loop strategy:
            // For the first day, we might start mid-day.
            // For the last day, we might end mid-day.
            // For middle days, we take full commercial window.

            // Simplification:
            // 1. If start day == end day: simple overlap
            // 2. If different days:
            //      Add overlap for start day
            //      Add full days for interim
            //      Add overlap for end day
            
            // Actually, let's stick to the current cursor approach but be careful.
            
            // Let's define the valid interval for THIS day
            let dayStart = new Date(current); 
            dayStart.setHours(0,0,0,0);
            
            let intervalStart = new Date(current); // Starts at 'current' (which is start date initially)
            if (intervalStart < windowStart) intervalStart = windowStart;

            // Define end of interval for THIS day
            let intervalEnd = new Date(end);
            // If end is on a future day, clamp to windowEnd of THIS day
            // To check if 'end' is same day as 'current':
            if (end.getDate() !== current.getDate() || end.getMonth() !== current.getMonth() || end.getFullYear() !== current.getFullYear()) {
                 intervalEnd = windowEnd;
            } else {
                // Same day, so check if end is after windowEnd
                if (intervalEnd > windowEnd) intervalEnd = windowEnd;
            }
            
            // If we haven't passed the window yet
            if (intervalStart < intervalEnd) {
                const diffMs = intervalEnd.getTime() - intervalStart.getTime();
                if (diffMs > 0) {
                    totalMinutes += diffMs / (1000 * 60);
                }
            }
        }

        // Advance to next day 00:00
        current.setDate(current.getDate() + 1);
        current.setHours(0, 0, 0, 0);
        
        // If we overshot the end date (because we jumped to next day midnight), the loop condition current < end handles it?
        // No, if end is today at 15:00, and we jump to tomorrow 00:00, loop terminates. Correct.
        // But what if we are on the exact end day? 
        // Example: Start Mon 10:00. End Mon 12:00.
        // Loop 1: current = Mon 10:00. 
        // intervalStart = Mon 10:00 (since > 7:45). 
        // intervalEnd = Mon 12:00 (since same day).
        // Add 120 mins.
        // current becomes Tue 00:00.
        // Loop terminates. Correct.
    }

    return Math.floor(totalMinutes);
};

export const formatCommercialTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    const days = Math.floor(hours / 9); // Approximate business days (roughly 9h-10h/day? actually 7:45 to 18:00 is 10h 15m)
    // Commercial day = 10h 15m = 615 minutes.
    
    // Let's format as Days (Commercial Days) or just Hours
    // The user requirement didn't specify format, just "timer".
    // "1d 2h" is usually better than "25h".
    
    // Let's stick to simple H h M m if < 24h of business time, else D d H h
    // But let's define 1 "business day" as the full shift (615 mins) for conversion?
    // Or just calendar duration? Usually business timer implies "Wait time: 5 business hours".
    
    if (hours > 20) {
        const commDay = Math.floor(minutes / 615); 
        const remMins = minutes % 615;
        const remHours = Math.floor(remMins / 60);
        return `${commDay}d ${remHours}h (Comercial)`;
    }
    
    return `${hours}h ${mins}m (Comercial)`;
};
