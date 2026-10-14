# 03 — Design System and UI Specification

## 1. Visual direction
**Name:** Graphite & Mint  
**Feel:** understated, calm, carefully crafted software.  
**Avoid:** blue/purple gradients, neon glow, glassmorphism, giant decorative icons, excessive cards, random illustrations, overly rounded everything, fake charts, and generic AI dashboard styling.

## 2. Colour tokens
```css
:root {
  color-scheme: dark;
  --background: #141719;
  --surface: #1C2023;
  --surface-elevated: #262C30;
  --accent: #94CDB5;
  --text-primary: #E7ECE9;
  --text-secondary: #9AA5A3;
  --border: #343C40;
  --success: #94CDB5;
  --warning: #E5B978;
  --danger: #E28C8C;
  --info: #8DBDE0;
}
```

## 3. Usage guidance
- Background `#141719`: main app canvas.
- Surface `#1C2023`: sidebar, primary panels, menus.
- Elevated surface `#262C30`: hover states, selected controls, inputs when needed.
- Mint `#94CDB5`: primary action, active navigation indicator, completed checkbox, chart emphasis, progress.
- Primary text `#E7ECE9`: headings and main content.
- Secondary text `#9AA5A3`: dates, descriptions, supporting labels.
- Border `#343C40`: subtle dividers and outlines.
- Warning/danger/info colours are semantic only.
- Use mint text on dark backgrounds or dark text on mint backgrounds as needed for readable contrast.
- Do not use mint for every icon or every border. It is an accent, not a fill colour for the entire UI.

## 4. Typography
- Use a clean sans-serif such as Geist or Inter.
- Use a small, consistent type scale; avoid oversized hero-style marketing typography inside the app.
- Suggested scale: 12px metadata, 14px secondary labels, 16px body/task rows, 20px section headings, 28–32px page title where appropriate.
- Use medium/semibold weights sparingly.
- Numbers in analytics should be easy to scan.
- Avoid using multiple unrelated font families.

## 5. Layout and spacing
- Use an 8px spacing rhythm where practical.
- Desktop content should have a clear primary column and optional secondary rail; do not fill every empty area with a card.
- Prefer task rows with subtle dividers over a card per task.
- Use cards only when they group genuinely related information.
- Sidebar should be compact and stable.
- Keep content width comfortable; do not stretch text-heavy lists across ultrawide screens.
- Avoid excessive shadows. Use borders and tonal contrast for hierarchy.
- Border radii should be restrained and consistent (e.g. 8–12px controls, 12–16px larger panels).

## 6. Desktop layout
- Left navigation sidebar.
- Main column: greeting/date, concise progress summary, today’s tasks.
- Optional right rail: calendar, habit summary, or daily progress.
- Reports get their own page; do not crowd all charts onto Home.
- Settings are separate pages/sections.
- Custom tabs should be visible in a manageable sidebar group with add/manage controls.

## 7. Mobile layout
- Use compact header and bottom navigation: Home, Daily, Work, Habits, More.
- Reports and Settings live under More or an accessible secondary route.
- One main column; no desktop right rail.
- Use a horizontal date strip where helpful.
- Task rows should show title and relevant metadata without overflow.
- Use a bottom sheet or accessible modal for add/edit task forms where appropriate.
- Ensure bottom navigation does not cover content; respect safe areas.
- Avoid horizontal scrolling at common phone widths.
- Target touch controls around 44px minimum.
- Charts should reflow vertically and remain legible.
- Test at 320px, 375px, 390px, 768px, 1024px, and wide desktop widths.

## 8. Components
- AppShell, Sidebar, MobileBottomNav, PageHeader
- TaskRow, TaskCheckbox, TaskForm, TaskDetails
- PriorityBadge, CategoryPill, DateStrip, Calendar
- ProgressSummary, CompletionDonut, TrendChart
- HabitRow, HabitTemplateForm, TargetProgress
- CarryForwardDialog, ReminderSettingsForm
- EmptyState, ErrorState, LoadingSkeleton, Toast/InlineFeedback
- ConfirmDialog, AccessibleDropdown, SearchInput

## 9. Iconography and motion
- Use Lucide outline icons only when they communicate navigation or actions.
- Keep icon sizes consistent (e.g. 16–20px).
- No decorative icon next to every label.
- Motion should be subtle and purposeful (checkbox feedback, dialog transitions); respect reduced-motion preferences.
- No glow effects or animated gradients.

## 10. Interaction states
Every interactive component needs default, hover, focus-visible, disabled, loading, success, and error states as applicable.
- Checkbox: unchecked, checked, keyboard focus.
- Buttons: primary mint action, neutral secondary action, destructive action.
- Forms: validation and field-level error messages.
- Dialogs: keyboard accessible, focus managed, dismiss behaviour explicit.
- Charts: legends, labels, and accessible summaries.
- Empty state: explain what to do next without fake data.

## 11. Responsive and accessibility requirements
- Semantic HTML and accessible labels.
- Keyboard navigation and visible focus.
- Sufficient text contrast; do not use secondary text so dim it becomes unreadable.
- Do not communicate status through colour alone.
- Avoid hover-only interactions on mobile.
