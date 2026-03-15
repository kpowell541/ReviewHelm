locals {
  log_group_name = "/aws/lambda/${var.service_name}"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]
  }
}

data "aws_iam_policy_document" "lambda_runtime_access" {
  statement {
    sid    = "AllowCostExplorerRead"
    effect = "Allow"

    actions = [
      "ce:GetCostAndUsage",
    ]

    resources = ["*"]
  }
}

resource "aws_iam_role" "lambda_execution" {
  name               = "${var.service_name}-${var.environment}-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = {
    Service     = var.service_name
    Environment = var.environment
  }
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "runtime_access" {
  name   = "${var.service_name}-${var.environment}-runtime-access"
  role   = aws_iam_role.lambda_execution.id
  policy = data.aws_iam_policy_document.lambda_runtime_access.json
}
