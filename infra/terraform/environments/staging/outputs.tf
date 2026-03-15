output "api_domain_name" {
  value = module.api.api_domain_name
}

output "cognito_callback_urls" {
  value = module.cognito.callback_urls
}

output "cognito_logout_urls" {
  value = module.cognito.logout_urls
}

output "database_name" {
  value = module.aurora.database_name
}

output "queue_names" {
  value = module.queues.queue_names
}

output "artifact_bucket_name" {
  value = module.storage.artifact_bucket_name
}
