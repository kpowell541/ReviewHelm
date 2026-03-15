module "lambda_foundation" {
  source                 = "../../modules/lambda-foundation"
  environment            = var.environment
  aws_region             = var.aws_region
  timeout_seconds        = var.lambda_timeout_seconds
  memory_mb              = var.lambda_memory_mb
  service_name           = "reviewhelm-api-aws"
}

module "api" {
  source                 = "../../modules/api"
  environment            = var.environment
  api_domain_name        = var.api_domain_name
  lambda_service_name    = module.lambda_foundation.service_name
}

module "cognito" {
  source                 = "../../modules/cognito"
  environment            = var.environment
  app_domain_name        = var.app_domain_name
  admin_domain_name      = var.admin_domain_name
}

module "aurora" {
  source                 = "../../modules/aurora"
  environment            = var.environment
  database_name          = var.db_name
  min_capacity           = var.db_min_capacity
  max_capacity           = var.db_max_capacity
}

module "cache" {
  source                 = "../../modules/cache"
  environment            = var.environment
}

module "queues" {
  source                 = "../../modules/queues"
  environment            = var.environment
}

module "scheduler" {
  source                 = "../../modules/scheduler"
  environment            = var.environment
}

module "storage" {
  source                 = "../../modules/storage"
  environment            = var.environment
}

module "email" {
  source                 = "../../modules/email"
  environment            = var.environment
}

module "observability" {
  source                 = "../../modules/observability"
  environment            = var.environment
  enable_sentry          = var.enable_sentry
  lambda_service_name    = module.lambda_foundation.service_name
}
