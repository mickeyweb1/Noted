/**
 * Calculations for Academic Progress Tracker.
 * Preserves the distinction between missing (unscored/pending = null) and actual zero (0).
 */

/**
 * Convert a percentage grade (0-100) to standard 4.0 GPA and letter grade.
 */
export function percentageToGpa(percentage) {
  if (percentage === null || percentage === undefined || !Number.isFinite(percentage)) {
    return { gpa: null, letter: '—' };
  }
  if (percentage >= 93) return { gpa: 4.0, letter: 'A' };
  if (percentage >= 90) return { gpa: 3.7, letter: 'A-' };
  if (percentage >= 87) return { gpa: 3.3, letter: 'B+' };
  if (percentage >= 83) return { gpa: 3.0, letter: 'B' };
  if (percentage >= 80) return { gpa: 2.7, letter: 'B-' };
  if (percentage >= 77) return { gpa: 2.3, letter: 'C+' };
  if (percentage >= 73) return { gpa: 2.0, letter: 'C' };
  if (percentage >= 70) return { gpa: 1.7, letter: 'C-' };
  if (percentage >= 67) return { gpa: 1.3, letter: 'D+' };
  if (percentage >= 65) return { gpa: 1.0, letter: 'D' };
  return { gpa: 0.0, letter: 'F' };
}

/**
 * Calculates what score / percentage is needed on pending assessments to hit a target.
 */
export function calculateRequiredScore(subject, customTarget = null) {
  const plainSubject = subject?.toObject ? subject.toObject() : { ...subject };
  const assessments = Array.isArray(plainSubject.assessments) ? plainSubject.assessments : [];
  const target = customTarget !== null && Number.isFinite(Number(customTarget))
    ? Number(customTarget)
    : Number.isFinite(Number(plainSubject.targetScore))
    ? Number(plainSubject.targetScore)
    : 80;

  const scored = assessments.filter(
    (a) => a.score !== null && a.score !== undefined && typeof a.score === 'number' && Number.isFinite(a.score)
  );
  const pending = assessments.filter(
    (a) => a.score === null || a.score === undefined || a.score === '' || !Number.isFinite(a.score)
  );

  let scoredWeightedSum = 0;
  let scoredWeightTotal = 0;

  scored.forEach((a) => {
    const w = Number(a.weight) > 0 ? Number(a.weight) : 1;
    const max = Number(a.maxScore) > 0 ? Number(a.maxScore) : 100;
    const pct = (a.score / max) * 100;
    scoredWeightedSum += pct * w;
    scoredWeightTotal += w;
  });

  let pendingWeightTotal = 0;
  pending.forEach((a) => {
    const w = Number(a.weight) > 0 ? Number(a.weight) : 1;
    pendingWeightTotal += w;
  });

  const totalWeight = scoredWeightTotal + pendingWeightTotal;

  if (pendingWeightTotal === 0) {
    const finalAverage = scoredWeightTotal > 0 ? Math.round((scoredWeightedSum / scoredWeightTotal) * 10) / 10 : null;
    return {
      status: 'completed',
      pendingCount: 0,
      targetScore: target,
      currentAverage: finalAverage,
      neededPercentage: null,
      feasibility: finalAverage !== null && finalAverage >= target ? 'achieved' : 'missed',
      message: 'All assessments completed for this subject.',
      pendingAssessments: [],
    };
  }

  // target = (scoredWeightedSum + needed * pendingWeightTotal) / totalWeight
  // needed = (target * totalWeight - scoredWeightedSum) / pendingWeightTotal
  const neededPercentage = Math.round(((target * totalWeight - scoredWeightedSum) / pendingWeightTotal) * 10) / 10;

  let feasibility = 'achievable';
  let message = `You need an average of ${neededPercentage}% across remaining assessments to hit your ${target}% target.`;

  if (neededPercentage <= 0) {
    feasibility = 'secured';
    message = `Target of ${target}% is already secured! Even with 0% on remaining assessments, your minimum target is achieved.`;
  } else if (neededPercentage > 100) {
    feasibility = 'unachievable';
    message = `Target requires ${neededPercentage}%, which exceeds 100% on remaining assessments.`;
  }

  return {
    status: 'in_progress',
    pendingCount: pending.length,
    targetScore: target,
    neededPercentage: Math.max(0, neededPercentage),
    feasibility,
    message,
    pendingAssessments: pending.map((p) => {
      const max = Number(p.maxScore) > 0 ? Number(p.maxScore) : 100;
      const targetPct = Math.max(0, neededPercentage);
      const neededScore = Math.round(((targetPct / 100) * max) * 10) / 10;
      return {
        id: p._id,
        title: p.title,
        maxScore: max,
        weight: p.weight || 1,
        neededScore,
      };
    }),
  };
}

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

  const { gpa, letter } = percentageToGpa(currentAverage);
  const whatIf = calculateRequiredScore(plainSubject, targetScore);

  return {
    ...plainSubject,
    currentAverage,
    targetScore,
    status,
    gpa,
    letterGrade: letter,
    whatIf,
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
  let termGpa = null;
  let termLetter = '—';

  if (subjectsWithMarks.length > 0) {
    const totalCreditHours = subjectsWithMarks.reduce((acc, s) => acc + (Number(s.creditHours) || 1), 0);
    const weightedAvgSum = subjectsWithMarks.reduce(
      (acc, s) => acc + s.currentAverage * (Number(s.creditHours) || 1),
      0
    );
    termAverage = totalCreditHours > 0 ? Math.round((weightedAvgSum / totalCreditHours) * 10) / 10 : 0;

    const weightedGpaSum = subjectsWithMarks.reduce(
      (acc, s) => acc + (Number(s.gpa) || 0) * (Number(s.creditHours) || 1),
      0
    );
    termGpa = totalCreditHours > 0 ? Math.round((weightedGpaSum / totalCreditHours) * 100) / 100 : 0;
    termLetter = percentageToGpa(termAverage).letter;
  }

  const onTrackCount = analyzedSubjects.filter((s) => s.status === 'on_track').length;
  const belowTargetCount = analyzedSubjects.filter((s) => s.status === 'below_target').length;
  const totalAssessments = analyzedSubjects.reduce((acc, s) => acc + s.totalAssessments, 0);
  const totalPending = analyzedSubjects.reduce((acc, s) => acc + s.pendingAssessmentsCount, 0);

  return {
    ...plainTerm,
    subjects: analyzedSubjects,
    termAverage,
    termGpa,
    termLetter,
    totalSubjects: analyzedSubjects.length,
    onTrackCount,
    belowTargetCount,
    totalAssessments,
    totalPending,
  };
}

/**
 * Calculates Cumulative CGPA and multi-term standings across all terms.
 */
export function calculateCumulativeSummary(terms) {
  const analyzedTerms = (Array.isArray(terms) ? terms : []).map(calculateTermSummary);
  let totalCredits = 0;
  let weightedAverageTotal = 0;
  let weightedGpaTotal = 0;

  analyzedTerms.forEach((t) => {
    (t.subjects || []).forEach((s) => {
      if (s.currentAverage !== null) {
        const credits = Number(s.creditHours) || 1;
        totalCredits += credits;
        weightedAverageTotal += s.currentAverage * credits;
        weightedGpaTotal += (Number(s.gpa) || 0) * credits;
      }
    });
  });

  const cumulativeAverage = totalCredits > 0 ? Math.round((weightedAverageTotal / totalCredits) * 10) / 10 : null;
  const cgpa = totalCredits > 0 ? Math.round((weightedGpaTotal / totalCredits) * 100) / 100 : null;
  const cumulativeLetter = percentageToGpa(cumulativeAverage).letter;

  return {
    terms: analyzedTerms,
    cumulativeAverage,
    cgpa,
    cumulativeLetter,
    totalCreditsGraded: totalCredits,
  };
}
