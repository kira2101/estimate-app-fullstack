
## Коммит: 1f609aea7b4afe385b28d0d27022b1249d4cc2e4
### Сообщение коммита:
```
Исправлена ошибка CORS
```
### Изменения:
```diff
diff --git a/backend/core/settings.py b/backend/core/settings.py
index e4e9525..79c0904 100644
--- a/backend/core/settings.py
+++ b/backend/core/settings.py
@@ -61,10 +61,7 @@ MIDDLEWARE = [
     'django.middleware.clickjacking.XFrameOptionsMiddleware',
 ]
 
-CORS_ALLOWED_ORIGINS = [
-    "http://localhost:5173",
-    "http://127.0.0.1:5173",
-]
+
 
 ROOT_URLCONF = 'core.urls'
 
