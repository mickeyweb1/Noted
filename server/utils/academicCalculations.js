/**
 * Calculations for Academic Progress Tracker.
 * Preserves the distinction between missing (unscored/pending = null) and actual zero (0).
 */

export function calculateSubjectSummary(subject) {
  const plainSubject = subject?.toObject ? subject.toObject() : { ...subject };
  const assessments = Array.isArray(plainSubject.assessments) ? plainSubject.assessments : [];

  // Scored assessments have a finite numeric score (0 is valid!)
  const scored = assessments.filter(
    (a) => a.score !== null && a.score !== undefined && typeof a.score === 'number' && Number.isFinite(a.score)
  );

  let currentAverage = null;

  if (scored.length > 0) {
    const hasNonZeroWeights = scored.some((a) => Number(a.weight) > 0);
    if (hasNonZeroWeights) {
      let sumProduct = 0;
      let sumWeight = 0;
      scored.forEach((a) => {
        const weight = Number.isFinite(a.weight) && a.weight > 0 ? a.weight : 1;
        const max = Number(a.maxScore) > 0 ? a.maxScore : 100;
        const percentage = (a.score / max) * 100;
        sumProduct += percentage * weight;
        sumWeight += weight;
      });
      currentAverage = sumWeight > 0 ? Math.round((sumProduct / sumWeight) * 10) / 10 : 0;
    } else {
      const totalScore = scored.reduce((acc, a) => acc + a.score, 0);
      const totalMax = scored.reduce((acc, a) => acc + (Number(a.maxScore) > 0 ? a.maxScore : 100), 0);
      currentAverage = totalMax > 0 ? Math.round((totalScore / totalMax) * 1000) / 10 : 0;
    }
  }

  const targetScore = typeof plainSubject.targetScore === 'number' ? plainSubject.targetScore : null;
  let status = 'pending';
  if (currentAverage !== null) {
    if (targetScore !== null) {
      status = currentAverage >= targetScore ? 'on_track' : 'below_target';
    } else {
      status = currentAverage >= 50 ? 'passing' : 'needs_work';
    }
  }

  return {
    ...plainSubject,
    currentAverage,
    targetScore,
    status,
    totalAssessments: assessments.length,
    scoredAssessmentsCount: scored.length,
    pendingAssessmentsCount: assessments.length - scored.length,
  };
}

export function calculateTermSummary(term) {
  const plainTerm = term?.toObject ? term.toObject() : { ...term };
  const rawSubjects = Array.isArray(plainTerm.subjects) ? plainTerm.subjects : [];
  const analyzedSubjects = rawSubjects.map(calculateSubjectSummary);

  const subjectsWithMarks = analyzedSubjects.filter((s) => s.currentAverage !== null);

  let termAverage = null;
  if (subjectsWithMarks.length > 0) {
    const totalCreditHours = subjectsWithMarks.reduce((acc, s) => acc + (Number(s.creditHours) || 1), 0);
    const weightedSum = subjectsWithMarks.reduce(
      (acc, s) => acc + s.currentAverage * (Number(s.creditHours) || 1),
      0
    );
    termAverage = totalCreditHours > 0 ? Math.round((weightedSum / totalCreditHours) * 10) / 10 : 0;
  }

  const onTrackCount = analyzedSubjects.filter((s) => s.status === 'on_track').length;
  const belowTargetCount = analyzedSubjects.filter((s) => s.status === 'below_target').length;
  const totalAssessments = analyzedSubjects.reduce((acc, s) => acc + s.totalAssessments, 0);
  const totalPending = analyzedSubjects.reduce((acc, s) => acc + s.pendingAssessmentsCount, 0);

  return {
    ...plainTerm,
    subjects: analyzedSubjects,
    termAverage,
    totalSubjects: analyzedSubjects.length,
    onTrackCount,
    belowTargetCount,
    totalAssessments,
    totalPending,
  };
}
