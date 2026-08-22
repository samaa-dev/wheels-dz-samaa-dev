# إعداد Firebase و Redux للموقع

## 📋 الخطوات المطلوبة

### 1. إعداد Firebase في الكونسول

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. أنشئ مشروع جديد أو استخدم مشروع موجود
3. **Authentication**: 
   - فعّل Email/Password
   - فعّل Google Provider
   - أضف المجالات المصرّحة: `localhost`, `127.0.0.1`, ونطاق الإنتاج
4. **Firestore Database**:
   - أنشئ قاعدة بيانات في وضع الإنتاج
   - انسخ محتوى `firestore.rules` والصقه في Rules
5. **Storage**:
   - فعّل Firebase Storage
   - انسخ محتوى `storage.rules` والصقه في Rules
6. **Project Settings**:
   - انسخ إعدادات الويب (Web Config)

### 2. إعداد متغيرات البيئة

1. انسخ ملف `.env.example` إلى `.env`:
   ```bash
   cp .env.example .env
   ```

2. املأ متغيرات البيئة في `.env`:
   ```
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

### 3. تثبيت التبعيات

```bash
npm install
```

### 4. تشغيل الموقع

```bash
npm run dev
```

## 🔧 ما تم تغييره

### ✅ التغييرات المكتملة

- **تم تثبيت الحزم**: `firebase`, `@reduxjs/toolkit`, `react-redux`
- **Firebase Configuration**: إعداد اتصال آمن مع Firebase مع دعم SSR
- **Redux Store**: شرائح للمصادقة، الإعلانات، المفضّلة، وواجهة المستخدم
- **Firebase Services**: طبقات منطقية للمصادقة، المستخدمين، الإعلانات، والتخزين
- **ترجمة الأخطاء**: رسائل خطأ Firebase مترجمة للعربية
- **Authentication**: تسجيل دخول بالبريد وGoogle، إعادة تعيين كلمة المرور
- **Compatibility Layer**: hooks توافق مع واجهة `useApp()` القديمة
- **Security Rules**: قواعد أمان Firestore وStorage

### 🔄 الصفحات المحدثة

- `/login` - تسجيل دخول حقيقي بالبريد وGoogle
- `/register` - إنشاء حساب حقيقي (بدون OTP وهمي)
- `/` - جلب الإعلانات من Firestore
- `/listings` - تصفح الإعلانات الحقيقية
- جميع الصفحات الأخرى تستخدم Redux بدلاً من Context

### 📁 الملفات الجديدة

```
src/
├── lib/firebase/
│   ├── config.ts        # إعداد Firebase
│   ├── auth.ts          # خدمات المصادقة
│   ├── users.ts         # إدارة المستخدمين
│   ├── listings.ts      # إدارة الإعلانات
│   ├── storage.ts       # رفع الصور
│   └── mapAuthError.ts  # ترجمة الأخطاء
├── store/
│   ├── index.ts         # إعداد المتجر
│   ├── hooks.ts         # Typed hooks
│   ├── listener.ts      # Auth state listener
│   └── slices/          # Redux slices
└── hooks/
    └── useApp.ts        # طبقة التوافق
```

### 📄 ملفات الإعداد

- `.env.example` - قالب متغيرات البيئة
- `firestore.rules` - قواعد أمان Firestore
- `storage.rules` - قواعد أمان Storage

## 🧪 اختبار سريع

1. **تسجيل حساب جديد** - `/register`
2. **تسجيل الدخول** - `/login` 
3. **تسجيل دخول بGoogle** (إذا كان مفعّلاً)
4. **إنشاء إعلان جديد** - `/create-listing`
5. **إضافة إلى المفضّلة** - في أي إعلان
6. **كشف رقم هاتف** - (حد أقصى 5)

## 🐛 الإصلاحات التقنية المطبقة

### ✅ إصلاح Firestore Composite Index
- **المشكلة**: استعلامات مركبة (status + createdAt) تفشل بدون فهارس
- **الحل**: نظام Fallback يستخدم استعلامات بسيطة ثم ترتيب محلي
- **الملفات**: `src/lib/firebase/listings.ts`
- **التفاصيل**: انظر `FIRESTORE_INDEXES.md`

### ✅ إصلاح Redux Non-Serializable Timestamp
- **المشكلة**: Firebase Timestamp objects في Redux state
- **الحل**: تحويل صريح للبيانات في `getUserProfile()` و `getUserById()`
- **الملفات**: `src/lib/firebase/auth.ts`, `src/lib/firebase/users.ts`
- **Redux Config**: تم تحديث `serializableCheck` لتجاهل Timestamps

### ✅ إصلاح React SSR Hydration Mismatch
- **المشكلة**: اختلاف HTML بين الخادم والعميل في FiltersPanel
- **الحل**: إضافة حالة `mounted` لتأجيل defaultValue
- **الملفات**: `src/components/listings/FiltersPanel.tsx`
- **ملاحظة**: قد يكون سبب المشكلة إضافات المتصفح (bis_skin_checked)

## 🚀 النشر

قبل النشر تأكد من:
- إضافة نطاق الإنتاج في Firebase Console
- تحديث متغيرات البيئة للإنتاج
- تفعيل الفهارس المطلوبة في Firestore (ستظهر في Console عند أول استعلام)

## 🔍 استكشاف الأخطاء

- تأكد أن ملف `.env` موجود ومملوء بالقيم الصحيحة
- تحقق من كونسول المتصفح للأخطاء
- تأكد أن قواعد الأمان منسوخة بشكل صحيح
- تحقق من حالة Firebase في Network tab

## 📝 ملاحظات

- **SSR Safe**: كل استدعاءات Firebase محمية من أخطاء SSR
- **Backward Compatible**: واجهة `useApp()` تعمل كما كانت
- **Real-time Updates**: Redux يحدّث الواجهة فوراً
- **Error Handling**: رسائل خطأ واضحة بالعربية
- **Security**: قواعد أمان صارمة للبيانات والصور