## 2026-05-30 - Masking Raw Exception Details in Production
**Vulnerability:** Information disclosure via unhandled exceptions and manual error responses in 500 Internal Server Error scenarios.
**Learning:** Raw exception strings often contain sensitive data like database connection errors, file paths, or even API keys if an external request fails and the error is stringified. The `custom_exception_handler` was masking most DRF errors but not unhandled ones or manually constructed 500 Responses.
**Prevention:** Always use a global exception handler that explicitly checks `settings.DEBUG` before returning exception details. Additionally, audit manual `Response(..., status=500)` calls to ensure they also respect the `DEBUG` flag or delegate to the global handler if possible.
