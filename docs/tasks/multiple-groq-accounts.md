# Multiple Groq Accounts for the AI Service

## Goal

Allow the AI service to use multiple Groq accounts so requests can continue when one account reaches its limit or becomes unavailable.

## Scope

- Support configuring multiple Groq API keys through environment variables.
- Select another configured account when a request fails because of account limits or availability.
- Keep credentials out of logs and user-facing error messages.
- Preserve the existing single-account configuration as a supported setup.
