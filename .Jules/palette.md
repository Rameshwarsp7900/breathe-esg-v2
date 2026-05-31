## 2025-05-15 - [Improving Chatbot Accessibility]
**Learning:** Found that several interactive elements in the `ChatbotWidget` (toggle button, settings, close button, and message input) were missing ARIA labels and focus states. This pattern likely exists in other icon-only buttons across the app.
**Action:** Always ensure icon-only buttons have an `aria-label` and that hover-based visual feedback (like scaling) is also triggered by `onFocus` for keyboard accessibility.

## 2024-05-31 - [Sidebar Navigation Accessibility]
**Learning:** For conditional UI elements (like the tenant switcher), prefer `aria-label` directly on the input over a separate `<label>` element that might become orphaned if the input is not rendered. Consistent with previous learnings, keyboard focus states must be explicitly handled when using inline styles.
**Action:** Use `aria-label` for inputs in conditional renders. Implement `onFocus` and `onBlur` for all custom-styled interactive components.
