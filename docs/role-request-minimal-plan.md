# Role Request Feature - Minimal Plan

## Goal
Let verified users request custom server roles through two paths:
- a natural-language AI flow with confirmation
- a direct command flow without confirmation

## Safety Rules
- Only verified users can use the feature
- The bot may only auto-create roles that pass a strict safe whitelist
- Safe roles must have no permissions
- The AI may suggest a role, but it cannot approve it
- The real policy check must run again right before creation

## AI Flow
1. User pings the bot in natural language
2. AI extracts structured role data
3. Bot shows a confirm/cancel step
4. On confirm, the bot revalidates the request
5. If safe, the bot creates the role
6. If unsafe, the request goes to approval

## Command Flow
1. User runs a command
2. Bot validates the request immediately
3. If safe, the bot creates the role
4. If unsafe, the request goes to approval

## Approval Flow
- Unsafe requests are sent to staff for review
- Staff can approve or deny them
- Every action should be logged

## Shared Components
- Request parser for AI and command input
- Policy validator for safe vs unsafe roles
- Confirmation UI for AI requests
- Pending-request handling for approval cases

## Next Step
Implement the shared validator first, then wire the AI confirmation flow and the command flow to it.
