/**
 * logGroups: the logs tab reads like a diary (buildPlan.md 15, screen 6):
 * newest first, under "just now", "2 minutes ago", then clock times.
 * Pure, so it is tested.
 */

const MINUTE = 60000;
const RECENT_MINUTES = 5;

function titleFor(time, now) {
  const minutes = Math.floor((now - time) / MINUTE);
  if (minutes < 1) return 'just now';
  if (minutes < RECENT_MINUTES) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
  const date = new Date(time);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * @param {{ time: number }[]} entries oldest first
 * @param {number} [now]
 * @returns {{ title: string, data: object[] }[]} newest group first, newest entry first
 */
export function groupByTime(entries, now = Date.now()) {
  const groups = [];
  [...entries].reverse().forEach((entry) => {
    const title = titleFor(entry.time, now);
    const last = groups.at(-1);
    if (last && last.title === title) last.data.push(entry);
    else groups.push({ title, data: [entry] });
  });
  return groups;
}
