locals {
  queue_names = {
    github_webhooks = "reviewhelm-${var.environment}-github-webhooks"
    report_jobs     = "reviewhelm-${var.environment}-report-jobs"
    archive_restore = "reviewhelm-${var.environment}-archive-restore"
    email_jobs      = "reviewhelm-${var.environment}-email-jobs"
  }
}
