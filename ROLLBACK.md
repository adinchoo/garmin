# ROLLBACK v1.0.0
Restore backup or git checkout, clear PWA cache
Patches: 001 rm ios css offline restore SW, 002 rm login auth-guard restore app index, 003 keep RLS safe restore app core nutrition, 005 restore nutrition app do NOT drop bucket, 006 restore trends app nutrition home index rm date-utils
Data loss: dropping bucket deletes photos, dropping RLS makes public
Safe: client files rollback safe
