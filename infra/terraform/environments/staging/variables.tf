variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "staging"
}

variable "aws_region" {
  description = "Primary AWS region."
  type        = string
  default     = "us-east-1"
}

variable "api_domain_name" {
  description = "Custom domain for the staging API."
  type        = string
  default     = "api-staging.reviewhelm.app"
}

variable "app_domain_name" {
  description = "Main staging frontend domain."
  type        = string
  default     = ""
}

variable "admin_domain_name" {
  description = "Admin staging frontend domain."
  type        = string
  default     = ""
}

variable "lambda_timeout_seconds" {
  description = "Default timeout for synchronous API lambdas."
  type        = number
  default     = 15
}

variable "lambda_memory_mb" {
  description = "Default memory for synchronous API lambdas."
  type        = number
  default     = 512
}

variable "db_name" {
  description = "Aurora database name."
  type        = string
  default     = "reviewhelm"
}

variable "db_min_capacity" {
  description = "Aurora Serverless v2 minimum ACUs."
  type        = number
  default     = 0.5
}

variable "db_max_capacity" {
  description = "Aurora Serverless v2 maximum ACUs."
  type        = number
  default     = 4
}

variable "enable_sentry" {
  description = "Whether Sentry integration should be wired in this environment."
  type        = bool
  default     = true
}
