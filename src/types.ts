import type { PairRating } from "./lib/network";

export type RepresentationRecord = {
  id: number;
  item: string;
  item_zh: string;
};

export type RepresentationDatabase = {
  source: string;
  source_zh: string;
  count: number;
  representations: RepresentationRecord[];
};

export type SurveySubmission = {
  selectedNodeIds: string[];
  importantNodeIds: string[];
  ratings: PairRating[];
};
