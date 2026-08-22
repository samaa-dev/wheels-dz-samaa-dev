/**
 * Firebase Messages Service
 * إدارة نظام المراسلة بين المشترين والبائعين
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { getFirebaseFirestore } from './config';
import { mapFirebaseErrorToArabic } from './mapAuthError';
import { fields, toIso, toIsoOrNow } from './docData';

// ===== Types & Interfaces =====

export interface Message {
  id: string;
  
  // معرفات الأطراف
  senderId: string; // معرف المرسل
  receiverId: string; // معرف المستقبل
  listingId: string; // معرف الإعلان المرتبط
  
  // محتوى الرسالة
  content: string; // نص الرسالة
  messageType: 'text' | 'offer' | 'system'; // نوع الرسالة
  
  // في حالة العروض
  offerPrice?: number; // السعر المعروض (للعروض)
  offerStatus?: 'pending' | 'accepted' | 'rejected' | 'counter'; // حالة العرض
  
  // حالة الرسالة
  isRead: boolean; // هل تم قراءة الرسالة
  isDelivered: boolean; // هل تم تسليم الرسالة
  
  // التواريخ
  createdAt: string; // تاريخ الإرسال - ISO string
  readAt?: string; // تاريخ القراءة - ISO string
  
  // معلومات إضافية
  parentMessageId?: string; // معرف الرسالة الأصلية (للردود)
  attachments?: string[]; // مرفقات (روابط صور مثلاً)
  
  // معلومات تقنية
  senderName: string; // اسم المرسل (للعرض)
  listingTitle: string; // عنوان الإعلان (للعرض)
  listingCoverImage?: string | undefined; // صورة الإعلان (للعرض)
}

export interface Conversation {
  id: string;
  
  // معرفات الأطراف
  participants: string[]; // [buyerId, sellerId]
  listingId: string; // معرف الإعلان
  
  // آخر رسالة
  lastMessage: {
    content: string;
    senderId: string;
    createdAt: string;
    messageType: Message['messageType'];
  };
  
  // إحصائيات
  unreadCount: { [userId: string]: number }; // عدد الرسائل غير المقروءة لكل مستخدم
  messagesCount: number; // إجمالي عدد الرسائل
  
  // حالة المحادثة
  status: 'active' | 'archived' | 'blocked'; // حالة المحادثة
  
  // التواريخ
  createdAt: string; // تاريخ بداية المحادثة - ISO string
  updatedAt: string; // تاريخ آخر تحديث - ISO string
  
  // معلومات إضافية للعرض
  listingTitle: string;
  listingCoverImage?: string | undefined;
  listingPrice: number;
  otherUserName: string; // اسم الطرف الآخر (يتم تعبئته حسب المستخدم الحالي)
}

// ===== Helper Functions =====

/**
 * تحويل Firestore document إلى Message object
 */
function docToMessage(doc: QueryDocumentSnapshot<DocumentData>): Message {
  const data = fields(doc.data());
  const readAt = toIso(data.readAt);
  
  return {
    id: doc.id,
    senderId: data.senderId,
    receiverId: data.receiverId,
    listingId: data.listingId,
    content: data.content,
    messageType: data.messageType || 'text',
    ...(data.offerPrice != null ? { offerPrice: data.offerPrice } : {}),
    ...(data.offerStatus ? { offerStatus: data.offerStatus } : {}),
    isRead: data.isRead || false,
    isDelivered: data.isDelivered || false,
    createdAt: toIsoOrNow(data.createdAt),
    ...(readAt ? { readAt } : {}),
    ...(data.parentMessageId ? { parentMessageId: data.parentMessageId } : {}),
    attachments: data.attachments || [],
    senderName: data.senderName || '',
    listingTitle: data.listingTitle || '',
    ...(data.listingCoverImage ? { listingCoverImage: data.listingCoverImage } : {}),
  };
}

/**
 * تحويل Firestore document إلى Conversation object
 */
function docToConversation(doc: QueryDocumentSnapshot<DocumentData>, currentUserId: string): Conversation {
  const data = fields(doc.data());
  
  return {
    id: doc.id,
    participants: data.participants || [],
    listingId: data.listingId,
    lastMessage: data.lastMessage || {},
    unreadCount: data.unreadCount || {},
    messagesCount: data.messagesCount || 0,
    status: data.status || 'active',
    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    listingTitle: data.listingTitle || '',
    ...(data.listingCoverImage ? { listingCoverImage: data.listingCoverImage } : {}),
    listingPrice: data.listingPrice || 0,
    otherUserName: data.otherUserName || '',
  };
}

// ===== Message Functions =====

/**
 * إرسال رسالة جديدة
 */
export async function sendMessage(messageData: {
  receiverId: string;
  listingId: string;
  content: string;
  messageType?: Message['messageType'];
  offerPrice?: number;
  parentMessageId?: string;
  senderId: string;
  senderName: string;
  listingTitle: string;
  listingCoverImage?: string | undefined;
}): Promise<string> {
  try {
    const firestore = getFirebaseFirestore();
    const messagesRef = collection(firestore, 'messages');
    
    const docRef = await addDoc(messagesRef, {
      senderId: messageData.senderId,
      receiverId: messageData.receiverId,
      listingId: messageData.listingId,
      content: messageData.content,
      messageType: messageData.messageType || 'text',
      ...(messageData.offerPrice != null ? { offerPrice: messageData.offerPrice, offerStatus: 'pending' } : {}),
      isRead: false,
      isDelivered: true,
      ...(messageData.parentMessageId ? { parentMessageId: messageData.parentMessageId } : {}),
      senderName: messageData.senderName,
      listingTitle: messageData.listingTitle,
      ...(messageData.listingCoverImage ? { listingCoverImage: messageData.listingCoverImage } : {}),
      attachments: [],
      createdAt: serverTimestamp(),
    });
    
    // تحديث أو إنشاء المحادثة
    await updateOrCreateConversation({
      listingId: messageData.listingId,
      participants: [messageData.senderId, messageData.receiverId],
      lastMessage: {
        content: messageData.content,
        senderId: messageData.senderId,
        createdAt: new Date().toISOString(),
        messageType: messageData.messageType || 'text',
      },
      listingTitle: messageData.listingTitle,
      listingCoverImage: messageData.listingCoverImage,
      receiverId: messageData.receiverId,
    });
    
    return docRef.id;
  } catch (error: any) {
    console.error('Error sending message:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب رسائل محادثة معينة
 */
export async function getConversationMessages(
  listingId: string,
  userId1: string,
  userId2: string,
  limitCount = 50
): Promise<Message[]> {
  try {
    const firestore = getFirebaseFirestore();
    const messagesRef = collection(firestore, 'messages');
    
    const q = query(
      messagesRef,
      where('listingId', '==', listingId),
      where('senderId', 'in', [userId1, userId2]),
      where('receiverId', 'in', [userId1, userId2]),
      orderBy('createdAt', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const snapshot = await getDocs(q);
    const messages = snapshot.docs.map(docToMessage);
    
    // ترتيب الرسائل من الأقدم للأحدث للعرض
    return messages.reverse();
  } catch (error: any) {
    console.error('Error fetching conversation messages:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * جلب جميع محادثات المستخدم
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  try {
    const firestore = getFirebaseFirestore();
    const conversationsRef = collection(firestore, 'conversations');
    
    const q = query(
      conversationsRef,
      where('participants', 'array-contains', userId),
      where('status', '==', 'active'),
      orderBy('updatedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => docToConversation(doc, userId));
  } catch (error: any) {
    console.error('Error fetching user conversations:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * تحديد الرسائل كمقروءة
 */
export async function markMessagesAsRead(
  listingId: string,
  receiverId: string,
  senderId: string
): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const messagesRef = collection(firestore, 'messages');
    
    const q = query(
      messagesRef,
      where('listingId', '==', listingId),
      where('receiverId', '==', receiverId),
      where('senderId', '==', senderId),
      where('isRead', '==', false)
    );
    
    const snapshot = await getDocs(q);
    
    // تحديث كل رسالة غير مقروءة
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, {
        isRead: true,
        readAt: serverTimestamp(),
      })
    );
    
    await Promise.all(updatePromises);
    
    // تحديث عداد الرسائل غير المقروءة في المحادثة
    await updateConversationUnreadCount(listingId, receiverId, 0);
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * الرد على عرض سعر
 */
export async function respondToOffer(
  messageId: string,
  response: 'accepted' | 'rejected' | 'counter',
  counterPrice?: number
): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const messageRef = doc(firestore, 'messages', messageId);
    
    const updateData: any = {
      offerStatus: response,
      updatedAt: serverTimestamp(),
    };
    
    if (response === 'counter' && counterPrice) {
      updateData.counterOfferPrice = counterPrice;
    }
    
    await updateDoc(messageRef, updateData);
  } catch (error: any) {
    console.error('Error responding to offer:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

// ===== Conversation Functions =====

/**
 * تحديث أو إنشاء محادثة
 */
async function updateOrCreateConversation(data: {
  listingId: string;
  participants: string[];
  lastMessage: Conversation['lastMessage'];
  listingTitle: string;
  listingCoverImage?: string | undefined;
  receiverId: string;
}): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const conversationsRef = collection(firestore, 'conversations');
    
    // البحث عن محادثة موجودة
    const q = query(
      conversationsRef,
      where('listingId', '==', data.listingId),
      where('participants', '==', data.participants)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // إنشاء محادثة جديدة
      await addDoc(conversationsRef, {
        participants: data.participants,
        listingId: data.listingId,
        lastMessage: data.lastMessage,
        unreadCount: {
          [data.receiverId]: 1,
        },
        messagesCount: 1,
        status: 'active',
        listingTitle: data.listingTitle,
        ...(data.listingCoverImage ? { listingCoverImage: data.listingCoverImage } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      // تحديث المحادثة الموجودة
      const conversationDoc = snapshot.docs[0];
      if (!conversationDoc) return;
      const currentData = fields(conversationDoc.data());
      
      await updateDoc(conversationDoc.ref, {
        lastMessage: data.lastMessage,
        unreadCount: {
          ...currentData.unreadCount,
          [data.receiverId]: (currentData.unreadCount?.[data.receiverId] || 0) + 1,
        },
        messagesCount: (currentData.messagesCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error: any) {
    console.error('Error updating conversation:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * تحديث عداد الرسائل غير المقروءة
 */
async function updateConversationUnreadCount(
  listingId: string,
  userId: string,
  count: number
): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const conversationsRef = collection(firestore, 'conversations');
    
    const q = query(
      conversationsRef,
      where('listingId', '==', listingId),
      where('participants', 'array-contains', userId)
    );
    
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const conversationDoc = snapshot.docs[0];
      if (!conversationDoc) return;
      const currentData = fields(conversationDoc.data());
      
      await updateDoc(conversationDoc.ref, {
        unreadCount: {
          ...currentData.unreadCount,
          [userId]: count,
        },
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error: any) {
    console.error('Error updating conversation unread count:', error);
    // لا نرمي خطأ هنا لأنه ليس أساسياً
  }
}

/**
 * حساب إجمالي الرسائل غير المقروءة للمستخدم
 */
export async function getTotalUnreadMessages(userId: string): Promise<number> {
  try {
    const conversations = await getUserConversations(userId);
    return conversations.reduce((total, conv) => total + (conv.unreadCount[userId] || 0), 0);
  } catch (error: any) {
    console.error('Error getting total unread messages:', error);
    return 0;
  }
}

/**
 * أرشفة محادثة
 */
export async function archiveConversation(conversationId: string, userId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const conversationRef = doc(firestore, 'conversations', conversationId);
    
    await updateDoc(conversationRef, {
      status: 'archived',
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error archiving conversation:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}

/**
 * حظر محادثة
 */
export async function blockConversation(conversationId: string, userId: string): Promise<void> {
  try {
    const firestore = getFirebaseFirestore();
    const conversationRef = doc(firestore, 'conversations', conversationId);
    
    await updateDoc(conversationRef, {
      status: 'blocked',
      updatedAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error blocking conversation:', error);
    throw new Error(mapFirebaseErrorToArabic(error));
  }
}