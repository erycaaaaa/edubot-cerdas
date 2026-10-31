# Design System

Last inspected: 2026-09-28. CURRENT means visible in source. PROPOSED means guidance for future work, not an implemented component or token. No visual/accessibility audit has been completed.

## 1. Design System Purpose

Provide a practical reference for consistent, understandable UI while preserving EduBuz's established warm palette and existing components. Distinguish code-derived design choices from proposed refinements. Sources: [Tailwind theme](../frontend-vite/tailwind.config.js), [global CSS](../frontend-vite/src/styles/globals.css), and [frontend pages](../frontend-vite/src/pages/StudentChat.tsx).

## 2. Design Philosophy

Admin UI (2026-09-28): /admin/dashboard reuses the warm cream/brown/olive palette and AccountMenu. Summary cards show actual school/teacher counts. School and teacher tables scroll inside their containers on small screens; forms have visible labels, busy/disabled submission, explicit empty/error/success states, and separate invitation/access labels. /accept-invite has password confirmation and session/error states. A 390px fixture browser layout was checked; no full accessibility certification is claimed.


- **User-Centered:** prioritize asking questions, understanding answers, and reviewing safety actions.
- **Minimalism:** proposed direction is to avoid new decoration that competes with learning content.
- **Consistency:** the same action should have consistent wording, states, and appearance.
- **Productivity:** keep common actions easy to find and reduce repeated entry.
- **Clarity:** distinguish loading, missing data, denied access, and service failure.
- **Accessibility:** preserve readable text, keyboard access, and understandable feedback.

These are maintenance principles, not a claim that every existing page meets them.

## 3. Visual Direction

CURRENT: warm cream, brown actions, olive accents, rounded cards, emoji avatars, shadows, and animated blobs. Indonesian interface copy coexists with English reward names.

PROPOSED: clean, simple, calm, academic, professional, lightweight, and productive. Preserve the established visual identity while reducing unnecessary gradients, shadow stacking, color variation, and animation in future changes. Existing decorative UI is documented rather than silently redesigned.

## 4. Color Palette

### Current Primary, Secondary, Background, Surface, and Text

| Tailwind token | Value | CSS variable / observed purpose |
| --- | --- | --- |
| surface | #FFFFFF | --color-surface; white panels |
| card-soft | #FDF6EE | --color-card-soft; page/soft backgrounds |
| brand | #B9895F | --color-brand; primary actions |
| brand.hover | #A67950 | --color-brand-hover |
| brand.light | #F7EFE6 | Soft brand fill; no matching global variable |
| olive | #776938 | --color-olive; secondary accent |
| olive.hover | #66592F | Secondary hover; no matching global variable |
| olive.light | #F1EEDB | Soft secondary fill; no matching global variable |
| txt.main | #332F2D | --color-text-main |
| txt.secondary | #5D594C | --color-text-secondary |
| txt.muted | #BDB2A0 | --color-muted; muted text/borders |

Pages frequently hardcode the same hex values instead of consuming tokens. Strike levels use yellow #FFD700, orange #FF8C00, and red #FF4444 in teacher UI, with pale background variants. These status colors are page conventions, not centrally defined semantic tokens. Contrast compliance has not been established.

### Success, Warning, Error, Info, and Border

CURRENT: warning/error colors appear inline in teacher/chat pages rather than as central semantic tokens. Muted #BDB2A0 with transparency is commonly used for borders. A complete central success/info palette is not defined.

PROPOSED: use existing olive for non-critical affirmative/informational accents with text/icons where appropriate; retain existing warning/error hues pending contrast verification. Do not invent primary-50 through primary-700 values or claim a numbered shade system exists. Introduce semantic aliases only when implemented consistently.

### Current dark theme

initializeTheme runs before React mounts. useTheme stores light/dark in edubuz_theme, initially falls back to the system preference, sets the root dark class/colorScheme, and synchronizes toggles across components and tabs. Shared account controls expose the toggle.

Dark CSS variables: surface #242320, card-soft #191917, main text #f4eee5, secondary text #cdc4b6, muted #6b655d. globals.css also overrides selected legacy literal utility classes, forms, hover surfaces, olive/brand text, and borders. Tailwind colors remain literal hex values, so changing CSS variables alone does not recolor every utility. Coverage and contrast still need a browser audit.

## 5. Semantic Color Rules

PROPOSED: primary identifies the main action; success confirms completed work; warning requests attention; error explains a failed/blocked action; info supplies neutral context; neutral colors organize surfaces and supporting text. Never use color alone for strikes or failures. Do not use warning colors for ordinary decoration. Contrast must be verified for each actual foreground/background pairing.

## 6. Typography

### Font Family

CURRENT: no custom font family is declared in the inspected Tailwind extension/global CSS. Use the configured/default UI sans stack rather than inventing a brand font.

### Type Scale

The following is a PROPOSED role mapping to existing Tailwind utility classes, not new implemented tokens. Rem values describe the standard utility scale; actual rendered pixels depend on root size.

| Role | Utility / size | Weight | Usage |
| --- | --- | --- | --- |
| display | text-5xl / 3rem; md:text-6xl / 3.75rem | bold | Landing hero; observed source |
| h1 | text-3xl / 1.875rem | bold | Proposed app page heading |
| h2 | text-2xl / 1.5rem | bold | Proposed major section |
| h3 | text-xl / 1.25rem | semibold | Proposed card/section title |
| body | text-base / 1rem | normal | Proposed default reading text |
| small | text-sm / 0.875rem | normal or semibold | Controls/supporting text |
| caption | text-xs / 0.75rem | normal | Short metadata; avoid for essential instructions |

CURRENT pages also use varied sizes and small arbitrary text utilities. Standardize only within a justified change; keep readable line lengths and avoid dense essential text.

## 7. Spacing System

CURRENT: default Tailwind utilities with recurring p-4/p-6/p-8 and gap-2/gap-3; no named xs/sm design spacing aliases.

PROPOSED mapping for consistency:

| Role | Utility step / value | Usage |
| --- | --- | --- |
| xs | 1 / 0.25rem | Tight icon detail |
| sm | 2 / 0.5rem | Related inline items |
| md | 4 / 1rem | Control/content spacing |
| lg | 6 / 1.5rem | Panel padding |
| xl | 8 / 2rem | Larger card sections |

Use existing scale steps rather than random pixel values. This is not an enforced eight-point system.

## 8. Border Radius

CURRENT uses rounded-xl, rounded-2xl, rounded-3xl, and rounded-full.

| Proposed role | Existing utility | Typical use |
| --- | --- | --- |
| Small | rounded-lg | Compact controls |
| Medium | rounded-xl | Inputs and buttons |
| Large | rounded-2xl or rounded-3xl | Cards and panels |
| Pill | rounded-full | Badges and avatars |

No custom radius token scale is implemented; preserve established page shapes until a component consolidation is made.

## 9. Shadows

CURRENT ranges from shadow-sm through shadow-xl/2xl in panels and overlays. PROPOSED: shadow-none for flat layout, shadow-sm for normal cards, shadow-md for elevated interaction, and larger shadows only for genuine overlays. Avoid layered shadows on nested content. No custom shadow tokens exist.

## 10. Layout

CURRENT: Landing uses max-w-7xl and px-6, with a sticky navbar and responsive grids. StudentChat uses a w-72 sidebar, max-w-4xl composer, p-4/md:p-6 messages, and max-w-md warning modal. TeacherDashboard combines sidebar navigation, summary cards, student lists/tables, and detail overlays. Avatar pages use max-w-5xl, a horizontal snap preview of up to three w-64 cards, and a full grid of one/sm:two/lg:three columns. EXP history is a keyboard-focusable max-h-64 scroll region showing up to 30 events in Asia/Jakarta time. These are page-specific layouts, not one universal maximum width.

PROPOSED: preserve existing widths where useful, keep readable chat content, use consistent page padding, and allow tables/overlays to fit narrow screens. Header/sidebar should not obscure the active task.

## 11. Responsive Design

CURRENT Tailwind config does not override screens. Pages use md and lg utilities with page-local mobile navigation state.

| Viewport convention | Default threshold | Observed behavior / guidance |
| --- | --- | --- |
| Mobile | Base styles below relevant breakpoint | Collapsed navigation, narrow cards/message widths |
| Tablet | md: 768px | Landing multi-column layout and some chat metadata |
| Desktop | lg: 1024px | Chat desktop sidebar styling |
| Other default screens | sm: 640px; xl: 1280px; 2xl: 1536px | Available framework defaults, not proof every page uses them |

PROPOSED checks: narrow phone, tablet, desktop, keyboard zoom, long text, and open sidebar/modal. Actual browser behavior remains unverified; CSS breakpoint availability does not certify JS-driven visibility.

## 12. UI Components

### Existing Reusable Components and Assets

Update 2026-09-28: ProtectedRoute supplies session loading, access-denied and retry screens; lazy routes separate page loading. ForgotPassword/ResetPassword now show email-link recovery states. useDesktopNavigation provides shared desktop navigation behavior. Browser accessibility/responsive acceptance remains pending.

| Item | Current use / source |
| --- | --- |
| BingoLogo | Existing logo component with focus-visible styling; [source](../frontend-vite/src/components/BingoLogo.tsx) |
| AnimatedBlobs | Decorative animated color blobs; [source](../frontend-vite/src/components/AnimatedBlobs.tsx) |
| AccountMenu | Native dialog drawer, profile/points, role navigation, theme and logout; [source](../frontend-vite/src/components/AccountMenu.tsx) |
| AvatarCard | Collectible card, ownership/equipped/affordability states; [source](../frontend-vite/src/components/AvatarCard.tsx) |
| ExpHistory | Up to 30 transactions, WIB date/time and current clock; [source](../frontend-vite/src/components/ExpHistory.tsx) |
| RewardGuide | Available +1 chat/+2 feedback versus unavailable future reward activities; [source](../frontend-vite/src/components/RewardGuide.tsx) |
| HelpfulFeedback | Per-answer helpful action with busy/success/error/retry states; [source](../frontend-vite/src/components/HelpfulFeedback.tsx) |
| logoboni.png | Raster asset in frontend-vite/public |
| Lucide icons | Imported by pages for controls and navigation |
| Emoji avatars | Student/profile identity and dashboard decoration |
| Buttons, fields, cards, modals | Mostly implemented inline within pages; no shared UI component directory found |

### Avatar card presentation

Cards have a 4:3 illustration, collection number/edition, title, rarity, description, server price, ownership label and unlock/equip button. Common uses green framing, Rare blue, Legendary gold. Rarity is decorative and does not grant privileges. Owned/equipped/locked states use text and icons. Insufficient EXP displays the missing amount and disables unlock; all actions disable while a mutation is pending.

Configure optional name, description, image, imageFit, rarity, number, and edition in [avatarCards.ts](../frontend-vite/src/config/avatarCards.ts). Empty/failed images fall back to the server emoji. See the [asset guide](../frontend-vite/public/avatars/README.md). Profile/chat identity remains the server emoji, not the card artwork.

### Inline Patterns and Proposed Reuse

These patterns exist in pages, not as a shared exported UI library unless stated above.

| Pattern | Current source/pattern | Proposed behavior |
| --- | --- | --- |
| Button | Brand filled, olive action, outline/neutral, icon-only | Consistent sizes, disabled/loading/focus states |
| Input | Auth forms and chat composer; rounded bordered controls | Persistent labels, associated errors, stable submit state |
| Select | Teacher filters / registration choices | Keyboard-accessible labels and options |
| Textarea | No shared textarea component established | Add only when a real multiline feature needs it |
| Card | Inline rounded white/cream panels | Consistent padding and hierarchy |
| Modal | Student warning / teacher student detail | Focus entry/restore, keyboard dismissal where appropriate |
| Dropdown | No shared dropdown component established | Prefer existing native select when sufficient |
| Navbar / Sidebar | Landing and dashboard/chat navigation | Clear active item and usable mobile toggle |
| Tabs | Parent dashboard tabs | Selected state and keyboard semantics |
| Badge | Role/status/progress/strike labels | Text plus color; no fake progress data |
| Alert | Inline auth errors and strike warnings | Correct severity and actionable language |
| Toast | No shared toast implementation found | Proposed only if transient feedback needs it; avoid adding a library by default |
| Table | Teacher student overview | Meaningful headers and mobile overflow |
| Empty / Loading / Error | Page-local render branches | Separate states, preserve user context |

## 13. Component States

PROPOSED review contract: every interactive pattern considers default, hover, focus-visible, active, disabled, loading, error, and relevant success states. Existing pages implement these unevenly. Disabled actions must not submit; loading must prevent accidental duplicates; errors must include text. Do not rely on hover alone or remove focus outlines without a visible replacement.

## 14. Forms

CURRENT: React local state, page-specific validation/messages, and utility-styled controls; no shared form library.

PROPOSED: labels above fields, explicit required/optional meaning, helper text before submission, specific errors associated with fields, password visibility with accessible labels, preserved non-sensitive input after failure, and a disabled/busy submit state while awaiting response. Server validation remains authoritative. The implemented recovery pages use Supabase email links, busy/error/success states and password confirmation; verify keyboard, contrast and email/browser behavior.

## 15. Navigation

CURRENT active routes come from routes.ts, not App.tsx. Primary entry is landing -> role selection -> login/register -> role screen. Dashboards contain local secondary navigation/tabs. StudentChat links to /student/avatars; the overview links to /student/avatars/collection. AccountMenu exposes home, role destination, student EXP/collection, theme and logout. Profile.tsx remains unrouted. Other sidebar controls still need feature-by-feature verification.

PROPOSED: active states use text/shape as well as color, mobile menus provide clear close/focus behavior, and unavailable features are not styled as working navigation. Verify logout clears sessions rather than only navigating home.

## 16. Feedback

| State | Existing pattern | Maintenance guidance |
| --- | --- | --- |
| Loading | isLoading/page-local flags | Disable duplicate submissions and keep progress understandable |
| Error | Inline messages and caught API errors | Distinguish outages from student violations |
| Warning/blocked | Strike modal, warning colors, blocked chat state | Include explanatory text; preserve server authority |
| Empty | Dashboard empty/list states | Explain whether there is no data or retrieval failed |
| Reward | Header XP/EXP/level, card unlock/equip, HelpfulFeedback status, EXP history | Keep lifetime XP distinct from spendable EXP; source values from API and surface fetch failures |

Guidance in the last column is a proposed convention, not a claim of complete coverage.

PROPOSED: success confirms the completed action; errors state the failed action and recovery; warnings explain consequences; info gives context; loading states communicate pending work; confirmations are reserved for consequential actions such as destructive changes. Do not present HTTP success alone as successful chat or durable reward persistence.

## 17. Empty States

PROPOSED pattern: short title, one-sentence explanation, and a valid primary action when available. Example for no teacher notifications: "No notifications" plus an explanation that new incidents appear here; no unnecessary action is required. A failed fetch needs an error/retry state, not this empty state. Future notes/tasks empty states must wait for implemented workflows.

## 18. Accessibility

PROPOSED review requirements: semantic buttons/links and headings; keyboard access; visible focus; modal focus management; labels and associated error text; accessible names for icon controls; ARIA only where native semantics are insufficient. Use a proposed 44px touch-target goal for primary mobile actions and inspect actual layouts. Verify contrast, zoom/reflow, and text alternatives. No WCAG conformance claim is made.

## 19. Motion

CURRENT: Framer Motion, CSS transitions, springs, and repeating decorative effects. BingoLogo uses a 0.25s transform transition and 0.15s detail transitions; AnimatedBlobs repeats roughly 3.7–4.6s easeInOut animations. Chat has repeating loading and warning effects.

PROPOSED: short 150–250ms ease-out transitions for ordinary controls, motion only when it explains state, and reduced-motion alternatives for repeating/spring effects. Avoid new attention-seeking motion around reading or safety messages. These durations are guidance, not a global implemented token.

## 20. Design Anti-Patterns

Avoid random new colors, inconsistent same-purpose controls, arbitrary spacing, shadow-heavy nested panels, tiny essential text, color-only strikes, inaccessible contrast, and decoration that obscures learning content. Do not present demo data or broken progress as reliable metrics. Existing inconsistencies are review targets, not permission for unrelated redesign.

## 21. Design Tokens

CURRENT mappings are listed in section 4. Tailwind surface/card-soft/brand/olive/txt correspond to CSS --color-* variables where noted. CSS uses --color-muted for txt.muted. Light/hover variants do not all have matching variables. darkMode is class-based and useTheme provides shared persisted controls; full theme coverage is unverified. Typography/spacing/state proposals above are documentation roles, not new CSS variables.

## 22. Implementation Rules

Prefer existing semantic Tailwind tokens; keep corresponding CSS variables aligned if changed. Reuse existing assets/components. Document new shared component props/states only after implementation. Validate representative mobile/desktop, loading, empty, error, blocked, and keyboard states. Preserve branding unless a change is requested. Update this file with source evidence; track gaps in [tasks](06-PROJECT-TASKS.md).

## 23. Design Change Log

| Date | Change | Reason |
| --- | --- | --- |
| 2026-09-27 | Added shared account/theme, collectible cards, EXP history and reward feedback states | Document implemented UI |
| 2026-09-26 | Documented existing palette, components, and UI states | Establish code-derived design reference |
| 2026-09-26 | Added full typography/layout/state/navigation/accessibility/motion guidance with CURRENT/PROPOSED labels | Follow complete design brief without changing the UI |
