## 2025-05-15 - [Improving Chatbot Accessibility]
**Learning:** Found that several interactive elements in the `ChatbotWidget` (toggle button, settings, close button, and message input) were missing ARIA labels and focus states. This pattern likely exists in other icon-only buttons across the app.
**Action:** Always ensure icon-only buttons have an `aria-label` and that hover-based visual feedback (like scaling) is also triggered by `onFocus` for keyboard accessibility.
