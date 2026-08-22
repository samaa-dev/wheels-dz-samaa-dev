# إنشاء فهارس Firestore المطلوبة

## 🔥 الفهارس المركبة المطلوبة

يحتاج الموقع إلى إنشاء فهارس مركبة (Composite Indexes) في Firestore لتسريع الاستعلامات.

### طريقة الإنشاء

#### الطريقة الأولى: من Firebase Console

1. اذهب إلى [Firebase Console](https://console.firebase.google.com/)
2. اختر مشروعك
3. **Firestore Database** → **Indexes** → **Composite**
4. اضغط **Create Index**

#### الطريقة الثانية: التشغيل والانتظار التلقائي

1. شغّل الموقع وتصفح الصفحات
2. ستظهر أخطاء في Console مع روابط مباشرة لإنشاء الفهارس
3. اضغط على الروابط وسيتم إنشاؤها تلقائياً

---

### 📋 الفهارس المطلوبة

#### 1. فهرس الإعلانات النشطة
- **Collection**: `listings`
- **Fields**:
  - `status` (Ascending)
  - `createdAt` (Descending)

#### 2. فهرس إعلانات المستخدم
- **Collection**: `listings`
- **Fields**:
  - `sellerId` (Ascending)
  - `createdAt` (Descending)

#### 3. فهرس الإعلانات المميزة
- **Collection**: `listings`
- **Fields**:
  - `status` (Ascending)
  - `featured` (Ascending)
  - `createdAt` (Descending)

---

### ⚡ حل بديل مؤقت

الكود يتضمن **fallback mechanism** يعمل بدون فهارس:

```javascript
// إذا فشل الاستعلام مع الفهرس، يتم استخدام استعلام بسيط
// ثم ترتيب النتائج من جانب العميل (client-side sorting)
```

هذا يعني أن الموقع سيعمل حتى بدون إنشاء الفهارس، لكن:
- **مع الفهارس**: استعلامات سريعة من الخادم
- **بدون فهارس**: جلب جميع البيانات ثم ترتيبها محلياً (أبطأ)

---

### 🚨 علامات تحتاج فهارس

ابحث عن هذه الرسائل في Console:

```
Composite index not found, falling back to simple query
Recent listings index not found, using client-side sorting
Featured listings composite index not found, using fallback
```

عندما تختفي هذه الرسائل، يعني أن الفهارس تعمل بشكل صحيح.

---

### 📊 مثال إنشاء فهرس يدوياً

في Firebase Console → Firestore → Indexes:

```
Collection ID: listings
Fields:
  - status: Ascending
  - createdAt: Descending
Query scope: Collection
```

**ملاحظة**: إنشاء الفهارس قد يستغرق بضع دقائق، خاصة إذا كانت البيانات موجودة مسبقاً.