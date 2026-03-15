locals {
  callback_urls = compact([
    var.app_domain_name != "" ? "https://${var.app_domain_name}/auth/callback" : "",
    var.admin_domain_name != "" ? "https://${var.admin_domain_name}/auth/callback" : "",
    "http://localhost:8081/auth/callback",
  ])

  logout_urls = compact([
    var.app_domain_name != "" ? "https://${var.app_domain_name}/auth/login" : "",
    var.admin_domain_name != "" ? "https://${var.admin_domain_name}/auth/login" : "",
    "http://localhost:8081/auth/login",
  ])
}
