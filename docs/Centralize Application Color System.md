# 🎨 Centralize Application Color System

## Objective

Refactor the project so that **all application colors are centralized in `styles.css`**.

The goal is to make the entire application's color scheme easy to change from a **single file**.

After this refactor, if I want to change the application's theme or color palette, I should only need to modify:

```text
styles.css
```

---

## Requirements

### 1. Audit Existing Colors

First, inspect the entire project and identify all hardcoded colors, including:

- Hex colors:
  - `#ffffff`
  - `#000000`
  - `#123456`
- `rgb(...)`
- `rgba(...)`
- `hsl(...)`
- `hsla(...)`
- CSS color names
- Inline styles containing colors
- Tailwind color classes, if applicable
- Component-specific color definitions
- SVG `fill` and `stroke` colors
- Icon colors
- Hover/focus/active colors
- Background colors
- Border colors
- Text colors

Do not assume colors only exist in `styles.css`. Search the entire application.

---

## 2. Centralize Colors in `styles.css`

Create a clean and reusable color system using CSS variables.

For example:

```css
:root {
  --color-background: ...;
  --color-surface: ...;
  --color-surface-hover: ...;

  --color-primary: ...;
  --color-primary-hover: ...;

  --color-secondary: ...;

  --color-text: ...;
  --color-text-muted: ...;
  --color-text-subtle: ...;

  --color-border: ...;
  --color-border-hover: ...;

  --color-success: ...;
  --color-warning: ...;
  --color-danger: ...;
  --color-info: ...;

  --color-overlay: ...;
}
```

Use **semantic variable names** rather than names based on the actual color.

### Good

```css
--color-primary
--color-background
--color-surface
--color-text
--color-border
```

### Avoid

```css
--brown
--dark-brown
--light-brown
--blue123
--my-custom-color
```

The variables should describe **what the color is used for**, not what the color looks like.

---

## 3. Reuse Existing Variables

If `styles.css` already contains CSS variables or a theme system:

- Reuse existing variables where appropriate.
- Remove duplicate variables.
- Consolidate similar colors.
- Do not create multiple variables representing essentially the same color.
- Keep the existing design language consistent.

Do not create another color/theme file unless there is a strong technical reason.

---

## 4. Replace Hardcoded Colors

Replace hardcoded colors throughout the project with the centralized CSS variables.

### Before

```css
background: #1a1a1a;
color: #ffffff;
border: 1px solid #333333;
```

### After

```css
background: var(--color-background);
color: var(--color-text);
border: 1px solid var(--color-border);
```

Do the same for:

- Components
- Pages
- Layouts
- Forms
- Cards
- Buttons
- Navigation
- Modals
- Tables
- Dropdowns
- Alerts
- Badges
- Inputs
- Icons
- SVGs
- Loading states
- Empty states
- Error states
- Success states
- Hover states
- Focus states
- Active states
- Disabled states

---

## 5. SVGs and Icons

Pay special attention to SVGs and icons.

Where appropriate, avoid hardcoded values such as:

```jsx
<svg fill="#ffffff">
```

or:

```jsx
<Icon color="#123456" />
```

Prefer inheriting the current text color or using the centralized variables.

For example:

```css
color: var(--color-primary);
```

or:

```jsx
<svg fill="currentColor">
```

when appropriate.

---

## 6. Preserve Existing Design

**Do not redesign the application.**

The purpose of this task is to centralize the existing color system, not to change the UI.

Preserve:

- Layout
- Spacing
- Typography
- Component structure
- Animations
- Functionality
- Responsive behavior
- Existing visual hierarchy

Only change the way colors are defined and consumed unless a small change is required to properly centralize the theme.

---

## 7. State Colors

Make sure all visual states are also centralized.

This includes:

```text
Default
Hover
Focus
Active
Disabled
Selected
Success
Warning
Error
Danger
Info
Loading
```

For example:

```css
--color-primary
--color-primary-hover
--color-primary-active
--color-primary-disabled

--color-success
--color-warning
--color-danger
--color-info
```

---

## 8. Single Source of Truth

The final architecture should follow this principle:

```text
                    styles.css
                        │
                        ▼
                CSS Color Variables
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
    Components       Pages          Layouts
        │               │               │
        └───────────────┼───────────────┘
                        ▼
                  Consistent Theme
```

There should be **one source of truth for application colors**.

I should NOT have to open individual component files just to change a color.

---

## 9. Verification

After completing the refactor:

1. Search the entire project again for hardcoded colors.
2. Identify any remaining colors.
3. Replace them if they should be part of the global theme.
4. Keep genuinely necessary exceptions only when required.
5. Verify that the application still looks consistent.
6. Check light/dark or other theme behavior if the project already supports it.
7. Make sure there are no broken CSS variables.
8. Make sure there are no unnecessary duplicate color definitions.

---

## 10. Do Not Modify Unrelated Code

Keep the changes strictly scoped to the color-system refactor.

Do **not**:

- Change business logic.
- Change API behavior.
- Change database logic.
- Change routing.
- Change authentication.
- Change component functionality.
- Change data structures.
- Add unnecessary dependencies.
- Perform unrelated refactoring.

---

# Final Goal

The final result should allow me to change the application's entire color scheme by editing **only `styles.css`**.

For example, changing:

```css
:root {
  --color-primary: ...;
  --color-background: ...;
  --color-surface: ...;
  --color-text: ...;
  --color-border: ...;
}
```

should automatically update the corresponding colors throughout the application.

---

# Final Report

After completing the work, provide a concise summary containing:

### Colors Centralized

Explain what categories of colors were centralized.

### Files Changed

List the files modified during the refactor.

### Remaining Hardcoded Colors

List any hardcoded colors that intentionally remain and explain why.

### Verification

Confirm that:

- Colors are centralized in `styles.css`.
- Components use the centralized variables.
- No unnecessary hardcoded theme colors remain.
- The existing UI and functionality were preserved.
- The application's color scheme can now be changed primarily from `styles.css`.