const STORAGE_KEY = "noted_spaced_review_v1";
const DAY_MS = 24 * 60 * 60 * 1000;

export function getReviewItems() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item?.id && item?.front && item?.back) : [];
  } catch {
    return [];
  }
}

const saveReviewItems = (items) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event("noted-spaced-review-updated"));
    return true;
  } catch {
    return false;
  }
};

export function scheduleReviewItems(items) {
  const existing = new Map(getReviewItems().map((item) => [item.id, item]));
  const dueAt = Date.now() + DAY_MS;
  items.forEach((item) => {
    if (!item?.id || !item.front || !item.back) return;
    const previous = existing.get(item.id);
    existing.set(item.id, {
      ...previous,
      ...item,
      dueAt: previous?.dueAt || dueAt,
      repetitions: previous?.repetitions || 0,
      intervalDays: previous?.intervalDays || 1,
      createdAt: previous?.createdAt || Date.now(),
    });
  });
  return saveReviewItems([...existing.values()]);
}

export function updateReviewSchedule(id, remembered) {
  const intervals = [1, 3, 7, 14, 30];
  const items = getReviewItems().map((item) => {
    if (item.id !== id) return item;
    const repetitions = remembered ? (item.repetitions || 0) + 1 : 0;
    const intervalDays = remembered ? intervals[Math.min(repetitions, intervals.length - 1)] : 1;
    return {
      ...item,
      repetitions,
      intervalDays,
      dueAt: Date.now() + intervalDays * DAY_MS,
      lastReviewedAt: Date.now(),
    };
  });
  return saveReviewItems(items);
}

export function removeReviewItem(id) {
  return saveReviewItems(getReviewItems().filter((item) => item.id !== id));
}

export function getDueReviewItems(now = Date.now()) {
  return getReviewItems().filter((item) => Number(item.dueAt) <= now);
}

export function getNextReviewItem(now = Date.now()) {
  return getReviewItems()
    .filter((item) => Number(item.dueAt) > now)
    .sort((a, b) => Number(a.dueAt) - Number(b.dueAt))[0] || null;
}

