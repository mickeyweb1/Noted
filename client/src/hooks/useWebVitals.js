import { useEffect } from "react";

export function useWebVitals(onMetric) {
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return undefined;
    const supportedTypes = PerformanceObserver.supportedEntryTypes || [];
    const observers = [];
    let largestContentfulPaint = 0;
    let cumulativeLayoutShift = 0;
    const interactionDurations = new Map();

    const observe = (type, callback) => {
      if (!supportedTypes.includes(type)) return;
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      observer.observe({ type, buffered: true });
      observers.push(observer);
    };

    const report = (name, value, entry) => {
      const metric = { name, value, path: window.location.pathname, entry };
      if (onMetric) onMetric(metric);
      else window.dispatchEvent(new CustomEvent("noted:web-vital", { detail: metric }));
    };

    observe("largest-contentful-paint", (entries) => {
      for (const entry of entries) {
        largestContentfulPaint = Math.max(largestContentfulPaint, entry.startTime);
      }
      if (largestContentfulPaint) report("LCP", largestContentfulPaint);
    });

    observe("layout-shift", (entries) => {
      for (const entry of entries) {
        if (!entry.hadRecentInput) cumulativeLayoutShift += entry.value;
      }
      report("CLS", cumulativeLayoutShift);
    });

    observe("event", (entries) => {
      for (const entry of entries) {
        if (entry.interactionId) {
          interactionDurations.set(
            entry.interactionId,
            Math.max(interactionDurations.get(entry.interactionId) || 0, entry.duration),
          );
        }
      }
      const sortedDurations = [...interactionDurations.values()].sort((a, b) => b - a);
      if (sortedDurations.length) {
        const percentileIndex = Math.floor(sortedDurations.length * 0.02);
        report("INP", sortedDurations[percentileIndex]);
      }
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [onMetric]);
}
