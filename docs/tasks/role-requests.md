# Role Requests

## Goal

Let members request a new colored role and let staff approve or deny each request.

## Member flow

- Show instructions in the role-request channel, either in its description or a pinned message.
- Members use `/request-role` with required `name` and `color` options.
- Hellbot posts the request details in the private `role-requests-review` staff channel.

## Staff review

- Staff can approve or deny the request using buttons on Hellbot's message.
- On approval, Hellbot creates the role with the requested name and color, places it above the configured anchor role (initially `God Modder`) so the color appears above the SFS roles, assigns it to the requester, and notifies them in the role-request channel.
- On denial, staff must enter a reason. Hellbot pings the requester and shares the reason in the role-request channel.
- Only configured staff roles may use the review buttons.

## Request data

Hellbot's review message is the request record. Include stable, labeled fields for the requester ID, role name, color, and anchor role. The button handler reads those fields from the message; no separate database is required for the initial version.

## Validation

- Validate the role name and hex color before posting the request.
- Confirm the anchor role exists and Hellbot can place the new role above it.
- Prevent a request from being approved or denied more than once.
