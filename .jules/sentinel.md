# Sentinel Journal - Security Learnings

## 2025-05-29 - Information Disclosure via Exception Details
**Vulnerability:** The `custom_exception_handler` was returning `str(exc)` in the response for all unhandled 500 errors, regardless of the `DEBUG` setting.
**Learning:** Returning raw exception strings can leak sensitive internal state (database schema, file paths, logic) to potential attackers.
**Prevention:** Always wrap sensitive error details in a `settings.DEBUG` check and ensure production error messages are generic.
