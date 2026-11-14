// How a run is judged. Shared by the story (which ending you get) and the report.
export function accuracy({ counts, total }) {
  return (counts.perfect + counts.good * 0.7 + counts.ok * 0.4) / Math.max(1, total);
}

// 'high' = the district is back on, 'mid' = the signal got through, 'low' = it did not
export function rank(result) {
  const acc = accuracy(result);
  if (result.odPeak >= 100 || acc >= 0.85) return 'high';
  return acc >= 0.5 ? 'mid' : 'low';
}
