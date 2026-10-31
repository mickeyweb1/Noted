import { useCallback, useEffect, useState } from "react";
import api from "../utils/api";

/**
 * Loads the user's REAL plan limits and AI credits from the backend.
 * limits = { plan, planLabel, locked, maxQuestionsPerQuiz, maxStudents,
 *            gameShowsPerMonth (null = unlimited), gameShowsUsed,
 *            credits: { total, used, remaining, resetsAt }, features: {...} }
 * Call refresh() after generating questions so the credit count updates.
 */
export default function useMyLimits() {
  const [limits, setLimits] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get("/quiz/my-limits");
      setLimits(res.data?.data ?? null);
    } catch {
      /* keep the previous value; the server still enforces everything */
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { limits, refresh };
}
