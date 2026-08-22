# دليل استكشاف الأخطاء وحلها

## 🔧 المشاكل الشائعة والحلول

### 1. 🔥 خطأ Firestore: "The query requires an index"

**الأعراض:**
```
Error fetching active listings: The query requires an index
```

**السبب:**
Firestore يحتاج إنشاء فهارس مركبة للاستعلامات المعقدة.

**الحل:**
1. **تلقائي**: شغّل الموقع وتصفح الصفحات، ستظهر روابط في Console لإنشاء الفهارس
2. **يدوي**: انظر ملف `FIRESTORE_INDEXES.md` للتفاصيل
3. **مؤقت**: الكود يستخدم fallback mechanism - الموقع سيعمل لكن أبطأ

**تأكد من الإصلاح:**
اختفاء رسائل `Console.warn` مثل:
```
Composite index not found, falling back to simple query
```

---

### 2. ⚠️ تحذير Redux: "non-serializable value detected"

**الأعراض:**
```
A non-serializable value was detected in the action
SerializableStateInvariantMiddleware took 123ms
```

**السبب:**
Firebase Timestamp objects في Redux state.

**الحل المطبق:**
- تحويل صريح للـ Timestamps في `getUserProfile()`
- إعدادات Redux لتجاهل Timestamp objects

**تأكد من الإصلاح:**
لا يجب ظهور تحذيرات Redux Serializable في Console.

---

### 3. 🌐 خطأ React: "Hydration failed"

**الأعراض:**
```
Warning: Text content did not match. Server: "..." Client: "..."
Warning: An error occurred during hydration
```

**السبب المحتمل:**
- إضافات المتصفح تضيف خصائص مثل `bis_skin_checked`
- اختلاف في renderingبين الخادم والعميل

**الحلول:**
1. **جرّب متصفح Incognito** (بدون إضافات)
2. **عطّل إضافات المتصفح** مؤقتاً
3. **الحل المطبق**: إضافة `mounted` state في FiltersPanel

**للمطورين:**
إضافة هذا النمط لأي component به مشكلة hydration:
```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// استخدام mounted قبل render المحتوى الديناميكي
```

---

### 4. 🔒 خطأ Firebase: "Permission denied"

**الأعراض:**
```
FirebaseError: Missing or insufficient permissions
```

**السبب:**
قواعد أمان Firestore أو Storage غير مطبقة بشكل صحيح.

**الحل:**
1. تأكد من نسخ محتوى `firestore.rules` إلى Firebase Console → Firestore → Rules
2. تأكد من نسخ محتوى `storage.rules` إلى Firebase Console → Storage → Rules
3. تأكد من **Publish** القواعد بعد النسخ

---

### 5. 🌍 خطأ الشبكة: "Network request failed"

**الأعراض:**
```
FirebaseError: Firebase: Error (auth/network-request-failed)
```

**الحل:**
1. تحقق من الإنترنت
2. تحقق من صحة متغيرات البيئة في `.env`
3. تأكد من تفعيل Authentication في Firebase Console
4. تحقق من الـ authorized domains

---

### 6. 🔑 خطأ التهيئة: "Firebase not initialized"

**الأعراض:**
```
Error: Firebase not initialized - make sure to call initializeFirebase() first
```

**السبب:**
المتغيرات البيئة ناقصة أو خاطئة.

**الحل:**
1. تأكد من وجود ملف `.env` في الجذر
2. تأكد من صحة جميع متغيرات `VITE_FIREBASE_*`
3. أعد تشغيل dev server بعد تعديل `.env`

---

### 7. 📱 مشكلة SSR: "window is not defined"

**الأعراض:**
```
ReferenceError: window is not defined
```

**السبب:**
استخدام Browser APIs في كود SSR.

**الحل المطبق:**
جميع استدعاءات Firebase محاطة بفحص `typeof window !== 'undefined'`.

---

## 🔍 أدوات التشخيص

### Console Logs مفيدة

**نجح التهيئة:**
```
✅ Firebase initialized successfully
```

**مشكلة فهارس:**
```
⚠️ Composite index not found, falling back to simple query
```

**مشكلة أذونات:**
```
❌ Error fetching active listings: لا تملك الصلاحية للوصول
```

### Network Tab في DevTools

تحقق من:
- طلبات `firebaseapp.com` - يجب أن تكون 200 OK
- طلبات `googleapis.com` - للمصادقة
- Any 403/401 errors - مشاكل أذونات

### Redux DevTools

مراقبة:
- `auth/hydrateUser` actions
- `listings/fetchActive` actions  
- حالة `loading` و `error` في كل slice

---

## 🚨 الحالات الطارئة

### إذا توقف كل شيء عن العمل:

1. **أعد تشغيل dev server**:
   ```bash
   npm run dev
   ```

2. **امسح cache المتصفح** أو استخدم Incognito

3. **تحقق من Firebase Console**:
   - Authentication enabled?
   - Firestore created?
   - Rules published?

4. **تحقق من `.env`**:
   ```bash
   cat .env  # أو type .env في Windows
   ```

5. **آخر حل**: ارجع للـ mock data مؤقتاً بالتعليق على جلب البيانات من Firebase واستخدام `MOCK_LISTINGS` في `useAllListings`.

---

## 📞 طلب المساعدة

عند طلب المساعدة، شارك:
1. رسالة الخطأ كاملة من Console
2. خطوات إعادة إنتاج المشكلة
3. إصدار المتصفح ونوع الجهاز
4. هل تعمل في Incognito mode أم لا