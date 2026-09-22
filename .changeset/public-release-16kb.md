---
"ritulaya": patch
---

Replace the retired SQLCipher Android library with its maintained, 16 KB-aligned
successor. Keep the existing encrypted database and Keystore-backed key, using
the updated Room open-helper integration. Add an artifact checker for native ELF
and package alignment. This requires a rebuilt Android app.
