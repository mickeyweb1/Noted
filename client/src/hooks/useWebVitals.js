import { useEffect } from "react";

const SUPPORTED_TYPES = ["largest-contentful-paint", "layout-shift", "event"];

export function useWebVitals(onMetric) {
  useEffect(() => {
    if (typeof PerformanceObserver === "undefined") return undefined;
    const supportedTypes = PerformanceObserver.supportedEntryTypes || [];
    const observers = [];

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
      const latest = entries.at(-1);
      if (latest) report("LCP", latest.startTime, latest);
    });

    observe("layout-shift", (entries) => {
      for (const entry of entries) {
        if (!entry.hadRecentInput) report("CLS", entry.value, entry);
      }
    });

    observe("event", (entries) => {
      for (const entry of entries) {
        if (entry.interactionId) report("INP", entry.duration, entry);
      }
    });

    return () => observers.forEach((observer) => observer.disconnect());
  }, [onMetric]);
}

export { SUPPORTED_TYPES as WEB_VITAL_ENTRY_TYPES };
