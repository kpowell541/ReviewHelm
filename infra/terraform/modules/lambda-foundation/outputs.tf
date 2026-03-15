output "service_name" {
  value = var.service_name
}

output "log_group_name" {
  value = local.log_group_name
}

output "execution_role_arn" {
  value = aws_iam_role.lambda_execution.arn
}

output "execution_role_name" {
  value = aws_iam_role.lambda_execution.name
}
