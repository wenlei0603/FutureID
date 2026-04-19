import type { SurveySubmission } from "../types";

export function createSurveySubmission(input: SurveySubmission): SurveySubmission {
  const normalizeIdList = (values: string[]) => [...values].sort((left, right) => left.localeCompare(right));

  const ratings = input.ratings
    .map((rating) => {
      const [source, target] = [rating.source, rating.target].sort((left, right) => left.localeCompare(right));
      return { source, target, value: rating.value };
    })
    .sort((left, right) => {
      const sourceDiff = left.source.localeCompare(right.source);
      return sourceDiff !== 0 ? sourceDiff : left.target.localeCompare(right.target);
    });

  return {
    selectedNodeIds: normalizeIdList(input.selectedNodeIds),
    importantNodeIds: normalizeIdList(input.importantNodeIds),
    ratings
  };
}
