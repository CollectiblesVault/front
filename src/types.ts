export type TimeRange = "week" | "month" | "year";

export interface ReportSections {
  portfolioCard: boolean;
  growthChart: boolean;
  categories: boolean;
  topPerformers: boolean;
}

export const defaultSections: ReportSections = {
  portfolioCard: true,
  growthChart: true,
  categories: true,
  topPerformers: true,
};