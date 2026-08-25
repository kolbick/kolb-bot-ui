---
date: 2026-08-24T07:31:46-0400
author: kolbick
commit: 88e92749c
branch: upgrade/kolb-bot-v0.11.0
repository: open-webui
topic: "ChatGPT subscription authentication"
tags: [intent, frd, openai, oauth, admin-connections]
status: ready
last_updated: 2026-08-24T07:31:46-0400
last_updated_by: kolbick
---

# FRD: ChatGPT Subscription Authentication

## Summary
Add an administrator-managed connection that uses one ChatGPT subscription, authenticated through official OAuth, to expose eligible OpenAI models to selected Kolb-Bot users without separate OpenAI API billing. The connection will coexist with current API-key and OpenAI-compatible providers, use existing model access controls, and be deployed to `kolb-bot.com` after implementation and validation.

## Problem & Intent
The affected person is the **“End user.”** The primary problem to solve is **“Avoid API billing.”** An administrator should be able to connect an eligible ChatGPT subscription once so authorized end users can use the subscription-backed OpenAI models in Kolb-Bot without creating separate usage-based API charges.

## Goals
- Let an administrator connect one eligible ChatGPT subscription through an official OAuth authorization flow.
- Dynamically expose only the OpenAI models available to the connected ChatGPT plan.
- Let selected users and groups use those models through Kolb-Bot's existing model access controls.
- Keep OAuth credentials on the server, refresh access automatically, and provide clear reconnect behavior.
- Preserve existing OpenAI API-key and OpenAI-compatible connections unchanged.
- Deploy and verify the completed feature on `https://kolb-bot.com`.

## Non-Goals
- Replacing or removing existing OpenAI API-key connections.
- Supporting more than one connected ChatGPT subscription account in the first release.
- Allowing every signed-in user to consume the subscription automatically.
- Importing ChatGPT browser cookies or session tokens.
- Automatically falling back to a billable OpenAI API-key connection.
- Supporting a local-development OAuth callback; the requested callback target is production only.
- Building a separate parallel provider stack instead of extending the existing OpenAI connection authentication seam.

## Functional Requirements
1. The system SHALL add an administrator-managed ChatGPT subscription authentication choice to the existing OpenAI connection configuration surface.
2. The system SHALL initiate and complete an official OpenAI/ChatGPT OAuth authorization flow whose callback is hosted on `kolb-bot.com`.
3. The system SHALL support exactly one shared ChatGPT subscription connection in the first release.
4. The system SHALL persist the subscription credential through the existing server-side OpenAI connection configuration path while ensuring raw OAuth tokens are never exposed in ordinary configuration responses, UI state, errors, or logs.
5. The system SHALL refresh access tokens automatically using the server-held refresh credential and SHALL require administrator reconnection when refresh fails or authorization is revoked.
6. The system SHALL dynamically discover the models eligible for the connected ChatGPT plan and SHALL not advertise models the account cannot use.
7. The system SHALL route model listing and chat requests through the existing OpenAI connection `auth_type` and centralized header/token handling seam.
8. The system SHALL use existing model ACLs and access grants to authorize selected users and groups.
9. The system SHALL hide subscription-backed models from unauthorized users and reject direct requests from those users.
10. The system SHALL display connection identity/status and the latest sanitized authentication error to administrators.
11. The system SHALL provide administrator actions to refresh the model catalog and disconnect/revoke the connected ChatGPT account.
12. The system SHALL return a clear subscription-specific error when the plan is rate-limited, unavailable, expired, or disconnected.
13. The system SHALL never reroute a failed subscription-backed request to a paid API-key connection.
14. The system SHALL leave existing API-key and OpenAI-compatible model listing and chat behavior operational.
15. The completed feature SHALL be built, deployed, and smoke-tested on the live Kolb-Bot Docker stack.

## Non-Functional Requirements
- **Performance**: Subscription-backed model discovery and chat proxying should add no avoidable network round trips beyond OAuth refresh and the upstream OpenAI request; no specific numeric latency target was set.
- **Security**: Use only the official delegated authorization mechanism; reject browser-cookie/session import. Keep credentials server-side, redact tokens from responses and exceptions, validate OAuth state, bind callbacks to the initiating administrator session, and prevent unauthorized model use through server-side ACL enforcement.
- **UX / Accessibility**: Administrators must receive visible connected, reconnect-required, disconnected, and sanitized-error states. Existing Kolb-Bot form, keyboard, focus, and accessible-label conventions apply.
- **Reliability**: Refresh credentials automatically, fail closed when authentication or authorization fails, expose a reconnect path, never fall back to billable API access, and preserve existing providers during failures.
- **Observability**: Production logging is errors-only. Errors must be sanitized and must not contain OAuth credentials, prompts, or model responses.

## Constraints & Assumptions
- OpenAI officially permits eligible ChatGPT subscription access through an OAuth-backed integration; downstream research must verify the supported grant, endpoints, scopes, model API, token lifecycle, and account-sharing restrictions before design.
- The integration is administrator-managed and uses one shared subscription account for selected Kolb-Bot users and groups.
- The OAuth callback must operate on `https://kolb-bot.com`; local callback support is out of scope.
- Renewable credentials must use the existing server-side OpenAI connection configuration persistence path rather than a separate credential table, while remaining redacted from frontend configuration payloads.
- The existing generic connection `auth_type` and backend `get_headers_and_cookies` routing seam will be extended rather than replaced.
- Existing model ACLs are the authorization source of truth.
- The live deployment is built from `C:\Users\sshkolby\open-webui` using the repository's Docker Compose stack.
- A failed initial analyzer probe and the correction probe encountered an external agent token-plan `429`; downstream research must ground the admin persistence and provider protocol in more depth.

## Acceptance Criteria
- [ ] In Admin Settings → Connections on `https://kolb-bot.com`, an administrator can select ChatGPT subscription authentication and start the official authorization flow.
- [ ] Completing the production OAuth callback returns the administrator to Kolb-Bot with a visible connected account/status and without any raw access or refresh token present in the browser URL, DOM, local storage, or configuration API response.
- [ ] Refreshing the connected account's model catalog visibly lists only models returned as eligible for that ChatGPT plan.
- [ ] Granting one discovered model to a test user through the existing model ACL makes it appear in that user's model picker and permits a successful chat response.
- [ ] A second user without the ACL cannot see the model and receives an authorization failure when directly requesting it.
- [ ] An expired access token is refreshed server-side without user action; an invalid refresh credential produces a reconnect-required admin state and a sanitized user-facing error.
- [ ] Simulating an upstream subscription rate limit or outage returns a subscription-specific error and produces no request against any configured OpenAI API-key connection.
- [ ] Disconnecting the account removes or disables its discovered models and prevents further subscription-backed requests.
- [ ] Existing API-key and OpenAI-compatible connections still verify, list models, and complete a test chat after the change.
- [ ] Repository frontend/type checks and the targeted backend test suite for OAuth callback, token refresh/redaction, ACL enforcement, model discovery, disconnect, and no-fallback behavior exit successfully.
- [ ] `docker compose config` exits successfully before deployment, and the rebuilt `open-webui` container reports healthy/running status afterward.
- [ ] `Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3000 -TimeoutSec 20` succeeds after deployment, and the production OAuth connect → authorized chat → disconnect smoke test succeeds on `https://kolb-bot.com`.
- [ ] Production error logs from the smoke test contain no OAuth tokens, prompts, or model responses.

## Recommended Approach
Extend the shared admin OpenAI connection configuration with a ChatGPT-specific OAuth `auth_type`, adding production authorization/callback/status/disconnect endpoints and server-side refresh handling through the existing connection persistence and request-routing seams. Feed dynamically discovered models into the current model registry and ACL system, explicitly mark the connection as subscription-backed, and prohibit cross-connection API-key fallback.

## Decisions

### Primary beneficiary
**Question**: What problem are you solving, who encounters it, and what would success look like when they use ChatGPT-subscription models through Kolb-Bot?
**Recommended**: n/a — `intent` question
**Chosen**: End user
**Rationale**: The feature is intended to change model access for the person consuming chat, not merely improve maintainer configuration.

### Primary user pain
**Question**: For that end user, what is the main problem with accessing OpenAI models in Kolb-Bot today, and what outcome matters most?
**Recommended**: n/a — `intent` question
**Chosen**: Avoid API billing
**Rationale**: Success means using already-paid ChatGPT plan access rather than incurring separate usage-based OpenAI API charges.

### Administrator-managed placement
**Question**: From the probe I inferred that ChatGPT subscription sign-in should be a per-user option in Settings → Connections, because this page already stores each user's OpenAI-compatible connections (`src/lib/components/chat/Settings/Connections.svelte:22-56`) and is gated by the direct-connections feature (`src/lib/components/chat/SettingsModal.svelte:760-764`). Keep this placement, or change it?
**Recommended**: Keep per-user
**Chosen**: Make admin-managed
**Rationale**: The developer explicitly corrected the inferred placement so one centrally managed subscription can be governed for selected users.

### Existing authentication seam
**Question**: From the probe I inferred that subscription authentication should extend the existing connection `auth_type` and centralized backend token/header handling (`src/lib/components/AddConnectionModal.svelte:402-442`, `backend/open_webui/routers/openai.py:156-220`). Keep this seam, or build a separate ChatGPT provider path?
**Recommended**: Extend auth type
**Chosen**: Extend auth type
**Rationale**: Evidence: `src/lib/components/AddConnectionModal.svelte:402-442` and `backend/open_webui/routers/openai.py:156-220` already centralize selectable authentication modes and request credentials; confirmed by the developer.

### Authorized audience
**Question**: Once the administrator connects a ChatGPT subscription, who should be allowed to use its eligible OpenAI models?
**Recommended**: Selected users
**Chosen**: Selected users
**Rationale**: Fine-grained access limits exposure and shared-plan abuse while still serving non-admin end users.

### Existing provider compatibility
**Question**: Should the new subscription login coexist with Kolb-Bot's existing API-key and OpenAI-compatible connections, or replace them?
**Recommended**: Coexist
**Chosen**: Coexist
**Rationale**: Preserving existing connections avoids a breaking migration and keeps subscription access additive.

### Authorization mechanism
**Question**: Which tradeoff should define ChatGPT authentication: official delegated authorization versus reusing browser session material?
**Recommended**: Official OAuth
**Chosen**: Official OAuth
**Rationale**: Official delegated authorization supports revocation and avoids unsafe copying of browser cookies or session material.

### Connected account count
**Question**: How many administrator-managed ChatGPT subscription accounts should Kolb-Bot support?
**Recommended**: One account
**Chosen**: One account
**Rationale**: A single account keeps the first release and request routing bounded while satisfying the requested shared integration.

### Token lifecycle
**Question**: How should Kolb-Bot handle ChatGPT OAuth tokens and expiration?
**Recommended**: Server-side refresh
**Chosen**: Server-side refresh
**Rationale**: Automatic server-side refresh can serve authorized users without exposing credentials or requiring repeated administrator action.

### Model authorization
**Question**: How should administrators grant selected users access to the subscription-backed models?
**Recommended**: Existing model ACLs
**Chosen**: Existing model ACLs
**Rationale**: Evidence: `backend/open_webui/routers/openai.py:614-635` already filters model visibility through user/group access grants; reuse avoids a second authorization system.

### Eligible model catalog
**Question**: How should Kolb-Bot determine which OpenAI models the connected ChatGPT plan can use?
**Recommended**: Discover dynamically
**Chosen**: Discover dynamically
**Rationale**: Dynamic discovery follows plan changes and avoids stale manual model declarations.

### Paid fallback policy
**Question**: If the ChatGPT subscription is rate-limited, unavailable, or requires reauthentication, may Kolb-Bot fall back to a paid OpenAI API-key connection?
**Recommended**: Never fall back
**Chosen**: Never fall back
**Rationale**: Prohibiting fallback is necessary to uphold the core goal of avoiding unexpected API billing.

### OAuth callback environments
**Question**: Which environments must support completing the ChatGPT OAuth callback?
**Recommended**: Production and local
**Chosen**: Production only
**Rationale**: The developer explicitly limited callback support to the requested live `kolb-bot.com` deployment.

### Administrator controls
**Question**: What administrator controls must accompany the connected ChatGPT account?
**Recommended**: Status and disconnect
**Chosen**: Status and disconnect
**Rationale**: Operational status, model refresh, and disconnect/revoke controls make authentication failures and credential removal manageable without backend intervention.

### Production logging
**Question**: What should production logs record for subscription-backed requests?
**Recommended**: Metadata only
**Chosen**: Errors only
**Rationale**: Errors-only logging minimizes retained user and request metadata while retaining failure diagnostics.

### OAuth credential persistence
**Question**: Where should the shared OAuth refresh token live: in the existing OpenAI connection configuration or in a dedicated encrypted server-side credential record?
**Recommended**: Encrypted credential
**Chosen**: Existing config
**Rationale**: The developer chose reuse of the existing admin OpenAI connection persistence path, accepting less credential separation in exchange for configuration fit; raw credentials must still remain server-side and redacted.

## Open Questions
- None explicitly deferred by the developer.

## References
- Feature input: `Add secure ChatGPT-subscription authentication to kolb-bot.com for eligible OpenAI models, then implement, validate, and deploy it live.`
- `src/lib/components/AddConnectionModal.svelte:90-133`
- `src/lib/components/AddConnectionModal.svelte:402-442`
- `src/lib/apis/openai/index.ts:134-226`
- `src/lib/components/admin/Settings/Connections.svelte:41-80`
- `src/lib/components/chat/Settings/Connections.svelte:22-56`
- `src/lib/components/chat/SettingsModal.svelte:760-789`
- `backend/open_webui/routers/openai.py:156-220`
- `backend/open_webui/routers/openai.py:614-635`
