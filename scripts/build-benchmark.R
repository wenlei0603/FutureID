study2_path <- file.path("complementarity_future_id", "Study 2", "study2_final_data_processed.csv")
representation_path <- "cognitive_representation_list_zh.json"
output_dir <- file.path("src", "data")
output_path <- file.path(output_dir, "study2-benchmark.json")

quantile_nearest_rank <- function(sorted_values, probability) {
  if (length(sorted_values) == 0) {
    return(0)
  }

  rank <- max(1, ceiling(length(sorted_values) * probability))
  sorted_values[[rank]]
}

study2 <- read.csv(study2_path, stringsAsFactors = FALSE)

filtered <- subset(study2, negative_density_valued < 1)
filtered_out <- nrow(study2) - nrow(filtered)
sorted_values <- sort(filtered$positive_density_valued)

dir.create(output_dir, recursive = TRUE, showWarnings = FALSE)

jsonlite::write_json(
  list(
    benchmark = list(
      sourceStudy = "Study 2",
      sourceMetric = "positive_density_valued",
      filterRule = "negative_density_valued < 1",
      sampleSize = length(sorted_values),
      filteredOut = filtered_out,
      min = min(sorted_values),
      max = max(sorted_values),
      mean = mean(sorted_values),
      percentiles = list(
        p10 = quantile_nearest_rank(sorted_values, 0.10),
        p25 = quantile_nearest_rank(sorted_values, 0.25),
        p50 = quantile_nearest_rank(sorted_values, 0.50),
        p75 = quantile_nearest_rank(sorted_values, 0.75),
        p90 = quantile_nearest_rank(sorted_values, 0.90)
      ),
      sortedValues = sorted_values
    ),
    generatedAt = format(Sys.time(), tz = "UTC", usetz = TRUE)
  ),
  output_path,
  pretty = TRUE,
  auto_unbox = TRUE
)

cat(sprintf("Wrote benchmark JSON to %s\n", output_path))
