---
"ritulaya": patch
---

Prediction, theme, and interaction polish

- Share cycle predictions across screens through a single store, computed once instead of per screen
- Use one teal accent color for all primary actions, distinct from the cycle phase colors
- Standardize touch interactions on Pressable with pressed-state feedback
- Wrap period logging in a database transaction so it is applied atomically
