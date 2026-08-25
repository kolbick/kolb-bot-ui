---
date: 2026-08-06T21:58:54-0400
author: kolbick
commit: 88e92749c
branch: upgrade/kolb-bot-v0.11.0
repository: open-webui
topic: "Design a visibly iOS-native standalone shell for Kolb-Bot while leaving Safari and desktop unchanged."
tags: [research, codebase, ios, pwa, standalone, svelte, navigation]
status: ready
last_updated: 2026-08-06T21:58:54-0400
last_updated_by: kolbick
---

# Research: Visibly iOS-Native Standalone Shell for Kolb-Bot

## Research Question

How should Kolb-Bot become visibly and behaviorally iOS-native when launched from an iPhone or iPad home-screen shortcut while preserving the currently deployed Safari and desktop experiences?

## Summary

Kolb-Bot already has a reliable pre-paint boundary for installed iOS mode: `src/app.html:53-64` adds `ios`, `standalone`, and `ios-standalone` classes before the first paint, while `src/lib/utils/pwa.ts:6-39` reasserts the same state after Svelte mounts. That boundary is narrower than the existing `$mobile` store and can isolate a native shell without changing Safari or desktop.

The present implementation is infrastructure polish rather than a distinct shell. It adds metadata, safe-area utilities, overscroll rules, and a few padding classes, but the application still renders the same route shell, left sidebar, navbars, floating controls, and composer. Height and inset ownership are duplicated across several components; safe-area helpers override rather than add to ordinary padding; one composer mount lacks bottom inset coverage; and keyboard-aware visual viewport logic exists only for floating menus.

The developer selected a full-app standalone shell: an explicit reactive iOS-standalone store, a persistent native bottom navigation bar, Menu presented as a sheet, shared visual-viewport tracking for keyboard geometry, OS-controlled orientation, and strict preservation of today's Safari behavior. New behavior must therefore branch on iOS standalone state rather than `$mobile`, while existing `html.ios` Safari rules remain unchanged.

## Detailed Findings

### 1. Installed-mode detection is already a viable isolation boundary

- The synchronous head script identifies iPhone, iPad, iPod, and touch-capable iPads reporting as Mac, then combines that with `display-mode: standalone` or `navigator.standalone` (`src/app.html:53-64`).
- Runtime helpers repeat the platform and display-mode checks, adding an Android app-referrer fallback (`src/lib/utils/pwa.ts:6-39`). The root layout invokes them after mount (`src/routes/+layout.svelte:1050`).
- The duplicate writers use idempotent `classList.toggle(name, boolean)` calls. For iOS they converge on the same `html.ios-standalone` state.
- Current standalone-specific declarations already use that class for document overscroll, dynamic-height behavior, splash safe areas, and toaster placement (`static/static/custom.css:762-773`, `static/static/custom.css:811-819`).
- Ordinary iOS Safari receives `html.ios` but not `html.ios-standalone`; desktop receives neither. This is the correct boundary for all new visual and behavioral changes.
- The application has no reactive store representing this state. Components currently branch on the broad viewport-width store `mobile` (`src/lib/stores/index.ts:29`), which also affects Safari and narrow desktop windows.

### 2. Shell height and scrolling are owned by several independent layers

- The authenticated route wrapper is a full-height `overflow-auto` flex surface (`src/routes/(app)/+layout.svelte:455-520`).
- The main chat independently repeats `h-screen max-h-[100dvh]` rather than inheriting its parent's height (`src/lib/components/chat/Chat.svelte:3773-3780`).
- The sidebar repeats the same viewport contract on both its fixed outer drawer and inner scroller (`src/lib/components/layout/Sidebar.svelte:1106-1122`).
- Chat uses nested scroll containers for the pane and message history (`src/lib/components/chat/Chat.svelte:3897-3910`). Document-level overscroll suppression does not remove nested scroller behavior.
- Root touch handlers implement nav-scoped pull-to-refresh for the non-standalone web experience and explicitly return when the `standalone` class is present (`src/routes/+layout.svelte:1013-1048`). This already demonstrates the expected behavior-gating convention.
- Any standalone shell must account for all repeated height owners. Changing only the route wrapper or only the composer would leave another full-height layer controlling layout.

### 3. Current mobile navigation is a web drawer, not native application chrome

- `$mobile` is initialized from `window.innerWidth < 768` and updated on window resize (`src/routes/+layout.svelte:1127-1138`). It is a responsive breakpoint, not an installed-app capability.
- Sidebar initialization force-closes navigation on mobile and persists desktop state in local storage (`src/lib/components/layout/Sidebar.svelte:649-663`).
- The mobile sidebar is a fixed, full-height left slide-over with its own scroll surface (`src/lib/components/layout/Sidebar.svelte:1106-1122`). Below the breakpoint it overlays content rather than participating in the app layout.
- Chat width displacement is controlled separately through Tailwind's `md:` breakpoint and `--sidebar-width` (`src/lib/components/chat/Chat.svelte:3773-3780`). The JS and CSS channels happen to share a 768px boundary but are not one system.
- The developer chose a standalone-only persistent bottom bar with Chat, New, Search, and Menu actions. Menu should reveal existing navigation content as a bottom sheet; Safari and desktop retain the current sidebar and breakpoint behavior.

### 4. The composer has a visible safe-area inconsistency and no shell-level keyboard geometry

- The main composer is normal relative flex content rather than fixed visual-viewport content (`src/lib/components/chat/MessageInput.svelte:1586-1592`). Its editor grows to a capped internal scroller (`src/lib/components/chat/MessageInput.svelte:1715-1723`).
- The conversation composer wrapper includes `pb-safe` (`src/lib/components/chat/Chat.svelte:3949-3953`). The landing/new-chat composer wrapper does not (`src/lib/components/chat/Chat.svelte:4071-4075`). Sending the first message swaps branches and remounts the composer.
- `interactive-widget=resizes-content` is declared in the viewport metadata (`src/app.html:34-36`), but the composer and route shell do not observe `window.visualViewport`.
- Rich-text composition safeguards, touch-aware Enter behavior, Escape handling, and focus restoration are concentrated in `MessageInput.svelte` and must remain intact. These are interaction semantics, not shell geometry (`src/lib/components/chat/MessageInput.svelte:1743-1866`).
- The developer chose shared visual-viewport tracking for the standalone shell, composer, tab bar, and sheets rather than relying on `100dvh` alone.

### 5. Keyboard-aware visual viewport behavior already has a proven codebase pattern

- The reusable dropdown normalizes `window.visualViewport` geometry, measures the trigger and natural content height, flips placement, clamps the panel, and derives a visible max height (`src/lib/components/common/Dropdown.svelte:101-109`, `src/lib/components/common/Dropdown.svelte:160-207`).
- It coalesces updates with `requestAnimationFrame`, performs delayed settling passes during keyboard animation, and listens to visual-viewport resize and scroll (`src/lib/components/common/Dropdown.svelte:214-229`, `src/lib/components/common/Dropdown.svelte:309-322`).
- The message-input More menu opts into this reusable path (`src/lib/components/chat/MessageInput/InputMenu.svelte:112-119`).
- The model selector independently duplicates the same geometry and listener pattern rather than using `Dropdown` (`src/lib/components/chat/ModelSelector/Selector.svelte:105-169`, `src/lib/components/chat/ModelSelector/Selector.svelte:562-581`).
- These implementations prove the runtime API and event cadence already work in the repository, but they only position portaled floating controls. They do not publish shell-wide keyboard or viewport state.

### 6. Safe-area utilities currently override spacing and are not standalone-specific

- Tailwind defines `safe-top`, `safe-bottom`, `safe-left`, and `safe-right` padding values (`tailwind.config.js:21-26`). Their generated utility names differ from the hand-written helpers used by the shell.
- Global `.pt-safe`, `.pb-safe`, `.pl-safe`, `.pr-safe`, and `.px-safe` helpers are unscoped (`static/static/custom.css:790-809`). They apply wherever referenced, including Safari, although inset values are often zero.
- Because the custom stylesheet is unlayered while Tailwind utilities are layered, a helper such as `.pb-safe` replaces a sibling Tailwind bottom-padding declaration instead of adding to it.
- The conversation composer combines `pb-2 pb-safe` (`src/lib/components/chat/Chat.svelte:3951`), while the channel composer combines `pb-[1rem] pb-safe` (`src/lib/components/channel/Channel.svelte:381`). The ordinary spacing collapses when the inset is zero and is not added when it is nonzero.
- Chat top padding is conditional on `$mobile` (`src/lib/components/chat/Navbar.svelte:82-85`), leaving wider standalone iPad/landscape layouts outside the inset path. Channel navigation applies the helper unconditionally (`src/lib/components/channel/Navbar.svelte:55-57`).
- Left and right inset helpers have no current shell consumers, which leaves landscape notch and rounded-corner handling incomplete.
- The current Safari behavior must remain as deployed. Existing helper behavior should not be retroactively moved or removed for Safari; new native-shell spacing should use standalone-specific selectors and additive `calc()`/`max()` ownership.

### 7. Full-app sheet behavior crosses multiple floating-control implementations

- Shared dropdowns portal content to `document.body` and position it as fixed content (`src/lib/components/common/Dropdown.svelte:41-64`, `src/lib/components/common/Dropdown.svelte:160-207`).
- Model selection has a parallel portal and fixed-position implementation (`src/lib/components/chat/ModelSelector/Selector.svelte:82-152`).
- The sidebar uses a third fixed slide-over implementation (`src/lib/components/layout/Sidebar.svelte:1106-1122`).
- A full standalone shell cannot be achieved by CSS decoration alone because the selected navigation behavior changes interaction structure: a persistent bottom bar and Menu sheet need explicit component state.
- The developer chose one explicit reactive iOS-standalone store, allowing affected components to select standalone presentation without changing `$mobile` behavior.

### 8. Launch identity and manifests form one cross-layer contract

- Initial HTML requests the credentialed runtime manifest and dynamic Apple touch icon (`src/app.html:14-30`).
- Backend identity is derived from the token cookie, with exact ABBY email matching shared by manifest and icon routes (`backend/open_webui/main.py:2749-2772`).
- Runtime manifest generation selects persona-specific names and icons (`backend/open_webui/main.py:2775-2842`), while the Apple touch-icon route uses the same predicate (`backend/open_webui/main.py:2844-2853`).
- Client branding updates the Apple icon link and Apple-specific title after the session user resolves (`src/lib/utils/pwa.ts:74-85`, `src/routes/+layout.svelte:1141`). It does not rewrite or refetch the manifest.
- The runtime and static manifests differ in icon paths, description, share target, and theme-color coverage. Both currently lock `portrait-primary` (`backend/open_webui/main.py:2833`, `static/static/site.webmanifest:21`).
- Precedent commit `56a094a34` previously removed orientation locking to respect OS rotation. The developer chose to restore OS-controlled orientation and require safe-area/tab-bar behavior in portrait and landscape.
- Static PWA assets must remain canonical under `static/static/`; application startup repopulates backend runtime static content from that source.

### 9. Launch and theme metadata are not a substitute for visible native chrome

- The app sets startup images, capability flags, status-bar style, and viewport metadata in the document head (`src/app.html:14-41`).
- Pre-paint theme logic updates root classes, `theme-color`, status-bar metadata, and splash selection (`src/app.html:68-157`).
- Runtime theme changes update status-bar style through `updateIosStatusBarStyle()` (`src/lib/utils/pwa.ts:44-58`, `src/lib/components/chat/Settings/General.svelte:155-181`).
- These paths influence launch and browser metadata but do not replace the route shell, navigation, or composer. This explains why the deployed patch is difficult to perceive after launch.

### 10. Verification coverage is the principal unresolved risk

- No focused tests for `isIOS()`, `isStandalonePwa()`, safe-area selector boundaries, visual-viewport state, or standalone navigation were found.
- Existing `npm run check` baseline is already noisy; the previously measured baseline is 8,322 errors and 209 warnings, so success must compare against the baseline or use scoped tests/builds.
- Production frontend build is a meaningful compilation gate and passed for the current revision with an increased Node heap.
- Real installed-device checks remain mandatory for status-bar insets, keyboard transitions, bottom navigation, sheet presentation, rotation, overscroll, and app-resume behavior.

## Code References

- `src/app.html:14-64` — PWA metadata, viewport behavior, and pre-paint installed-mode classes.
- `src/app.html:68-157` — pre-paint theme, status-bar, and splash initialization.
- `src/lib/utils/pwa.ts:6-39` — runtime iOS and standalone detection.
- `src/lib/utils/pwa.ts:44-85` — runtime status-bar and per-user PWA metadata updates.
- `src/lib/stores/index.ts:29` — existing width-based mobile state.
- `src/routes/+layout.svelte:1013-1050` — touch policy and standalone initialization.
- `src/routes/+layout.svelte:1127-1141` — responsive state and user-branding subscription.
- `src/routes/(app)/+layout.svelte:455-520` — authenticated full-height route shell and sidebar boundary.
- `src/lib/components/layout/Sidebar.svelte:649-663` — mobile/desktop sidebar initialization and transition behavior.
- `src/lib/components/layout/Sidebar.svelte:1106-1122` — fixed full-height sidebar drawer.
- `src/lib/components/chat/Chat.svelte:3773-3780` — chat viewport-height and sidebar-width contract.
- `src/lib/components/chat/Chat.svelte:3897-3953` — nested message scrollers and conversation composer mount.
- `src/lib/components/chat/Chat.svelte:4071-4075` — landing composer mount without safe-area padding.
- `src/lib/components/chat/MessageInput.svelte:1586-1592` — composer outer surface.
- `src/lib/components/chat/MessageInput.svelte:1715-1866` — editor sizing, composition safeguards, and keyboard behavior.
- `src/lib/components/chat/Navbar.svelte:82-92` — chat top chrome and mobile safe-area branch.
- `src/lib/components/channel/Navbar.svelte:55-62` — channel top chrome and current safe-area helper.
- `src/lib/components/common/Dropdown.svelte:160-229` — reusable visual-viewport positioning and settling pattern.
- `src/lib/components/common/Dropdown.svelte:309-322` — visual-viewport listener lifecycle.
- `src/lib/components/chat/ModelSelector/Selector.svelte:105-169` — parallel model-selector viewport geometry.
- `static/static/custom.css:744-824` — current iOS, standalone, safe-area, overscroll, and momentum rules.
- `tailwind.config.js:21-26` — Tailwind safe-area padding extensions.
- `backend/open_webui/main.py:2749-2853` — exact-email PWA identity, dynamic manifest, and touch-icon routing.
- `static/static/site.webmanifest:1-23` — static manifest identity and orientation settings.

## Integration Points

### Inbound References

- `src/routes/+layout.svelte:1050` invokes runtime standalone class initialization.
- `src/routes/+layout.svelte:1141` applies client PWA branding whenever the session user changes.
- `src/routes/(app)/+layout.svelte:517-520` mounts the shared Sidebar and route content.
- `src/routes/(app)/+page.svelte:15` and `src/routes/(app)/c/[id]/+page.svelte:7` both render the shared Chat surface.
- `src/lib/components/chat/Chat.svelte:3953` and `src/lib/components/chat/Chat.svelte:4072` mount the same MessageInput in separate branches.
- `src/lib/components/chat/MessageInput/InputMenu.svelte:112-119` opts into the shared visual-viewport-aware dropdown path.

### Outbound Dependencies

- Mode detection depends on browser `navigator`, `matchMedia`, `navigator.standalone`, and `document.referrer` (`src/lib/utils/pwa.ts:6-29`).
- Shell responsiveness depends on the global `mobile` and `showSidebar` stores (`src/lib/stores/index.ts:29`, `src/lib/components/layout/Sidebar.svelte:649-663`).
- Safe-area values depend on `viewport-fit=cover` (`src/app.html:34-36`) and CSS `env(safe-area-inset-*)` (`static/static/custom.css:744-809`).
- Keyboard-aware floating controls depend on `window.visualViewport`, `requestAnimationFrame`, and delayed settling updates (`src/lib/components/common/Dropdown.svelte:160-229`).
- Persona identity depends on the token cookie and user lookup (`backend/open_webui/main.py:2754-2772`).

### Infrastructure Wiring

- `/manifest.json` is a credentialed runtime route, not the static webmanifest (`src/app.html:30`, `backend/open_webui/main.py:2775-2842`).
- `/apple-touch-icon.png` is also dynamically personalized (`backend/open_webui/main.py:2844-2853`).
- `/static` exposes built runtime assets; canonical deployment copies must originate under `static/static/`.
- `html.ios-standalone` is available before Svelte hydration and is therefore safe for first-paint CSS isolation (`src/app.html:53-64`).

## Architecture Insights

- Capability and responsive state are different dimensions. `$mobile` should continue to answer width questions; a dedicated standalone store should answer installed-iOS behavior questions.
- CSS classes are required for flash-free first paint, while a reactive store is required for component presentation changes. The existing duplicate detection supports this two-layer arrangement.
- The route wrapper, Chat, Sidebar, and composer mounts jointly own the shell. Native transformation cannot be complete if only one layer changes.
- A persistent native bottom bar changes layout and navigation state; it should not be implemented as decoration on the existing left drawer.
- Visual-viewport handling should be centralized rather than copied a third time. The repository's proven listener cadence is immediate RAF plus 50/150/300 ms settled updates.
- Safe-area spacing must be additive and owned by stable shell boundaries. Existing generic helpers should not be repurposed in a way that changes Safari's deployed behavior.
- Manifest, touch icon, client title, static fallback, and runtime assets are one identity contract. Orientation changes must be made consistently in runtime and static manifests.
- Production compilation and real-device testing are more informative gates than the noisy global Svelte check baseline.

## Precedents & Lessons

5 similar change families were analyzed.

### Precedent: iOS standalone detection and safe-area polish

**Commit(s)**: `ffecfa973` — "Polish iOS home-screen PWA for a more native feel" (2026-08-06)

**Blast radius**: 14 files across launch metadata, runtime theme/state, shell UI, CSS/build configuration, and manifests.

**Follow-up fixes**:
- `ccb95d58f` — "Format iOS PWA integration" (2026-08-06) — formatting only; no later behavioral shell correction was found.

**Takeaway**: The first patch established detection and metadata but did not create a visibly different shell. New rules must consistently use the iOS-standalone boundary.

### Precedent: per-user PWA identity

**Commit(s)**: `665bfc593` — "Add ElevenLabs voice mode and per-user iOS PWA icons" (2026-08-02)

**Follow-up fixes**:
- `e504547b2` — replaced broad non-admin branding with exact ABBY email matching.
- `88e92749c` — centralized the backend identity predicate.

**Takeaway**: Persona identity must remain exact and synchronized across manifest, icon route, client metadata, and deployed static assets.

### Precedent: iPhone safe-area coverage

**Commit(s)**: `83a3e53d8` — "Add padding to compensate for iPhone nav bar" (2024-09-08)

**Follow-up fixes**:
- `008febb6d` and `98ba3f842` later styling refactors silently removed composer/sidebar protection.
- `ffecfa973` restored broader coverage in 2026.

**Takeaway**: Attach inset ownership to stable shell boundaries and add regression checks for every composer/navbar/navigation mount.

### Precedent: dynamic manifest repairs

**Commit(s)**: `83ad488e3` — "Do not use hardcoded manifest.json" (2024-04-02)

**Follow-up fixes**:
- `2649d29a3`, `6e58d9992`, `1639fbb54`, and `f3f45209e` repaired manifest links, static icon paths, PWA restoration, and credentialed fetching.
- `56a094a34` removed orientation locking to respect OS rotation.

**Takeaway**: Treat URL, credentials, icons, fallback data, orientation, and backend response as one contract; restore OS-controlled orientation consistently.

### Precedent: shared mobile viewport ownership

**Commit(s)**: `0e8765a76` — "fix: mobile viewport" (2024-02-16)

**Follow-up fixes**:
- `bdf7ed7f0` extended `100dvh` handling into shared Chat and route-layout surfaces after leaf-only sizing proved incomplete.

**Takeaway**: Keyboard and viewport behavior belongs at shared shell boundaries rather than only in the composer.

### Composite Lessons

- Gate every new visible or behavioral change on iOS standalone state; do not widen `$mobile` semantics.
- Verify all independent height owners and all composer/nav/sidebar mounts.
- Centralize visual-viewport observation and reuse the repository's proven settling cadence.
- Keep current Safari behavior stable, including existing `html.ios` rules.
- Restore rotation support rather than reintroducing historical portrait locking.
- Verify canonical static assets in the running container after startup.
- Real installed-device validation is mandatory for keyboard, status bar, home indicator, sheets, navigation, rotation, and resume.

## Historical Context (from `.rpiv/artifacts/`)

- `.rpiv/artifacts/handoffs/2026-08-02_15-13-23.md` — prior iOS PWA, static-asset, and real-device verification context.

## Developer Context

**Q (`src/lib/components/chat/Navbar.svelte:82-92`, `src/lib/components/layout/Sidebar.svelte:1106-1122`): How broad should the first native-shell release be?**
A: Full app shell, including navigation, sidebar/menu presentation, model/attachment controls, settings surfaces, composer, safe areas, and keyboard behavior.

**Q (`src/app.html:53-64`, `src/lib/utils/pwa.ts:32-39`, `src/lib/stores/index.ts:29`): Should standalone mode remain CSS-only or become explicit component state?**
A: Add an explicit standalone Svelte store. Preserve the pre-paint CSS class for flash-free styling and use the store for component behavior.

**Q (`src/lib/components/layout/Sidebar.svelte:649-663`, `src/lib/components/layout/Sidebar.svelte:1106-1122`): What should replace the current web-style mobile drawer?**
A: A persistent standalone-only native bottom bar for Chat, New, Search, and Menu. Menu presents the existing navigation content as a bottom sheet.

**Q (`src/app.html:34-36`, `src/lib/components/common/Dropdown.svelte:160-207`, `src/lib/components/common/Dropdown.svelte:309-322`): Should the standalone shell actively track the visual viewport?**
A: Yes. Publish keyboard height and visible viewport variables/state for the shell, composer, bottom bar, and sheets.

**Q (`backend/open_webui/main.py:2833`, `static/static/site.webmanifest:21`): Should the native shell restore rotation support?**
A: Respect OS rotation. Remove manifest orientation locking and handle portrait and landscape safe areas.

**Q (`static/static/custom.css:762-788`, `static/static/custom.css:821-824`): Does "Safari unchanged" mean today's deployed behavior or pre-patch behavior?**
A: Preserve today's deployed Safari behavior. Scope every new shell change to iOS standalone mode.

## Related Research

- None.

## Open Questions

No architectural questions remain. Real-device measurements and browser behavior are verification tasks for design, implementation, and validation rather than unresolved scope decisions.
