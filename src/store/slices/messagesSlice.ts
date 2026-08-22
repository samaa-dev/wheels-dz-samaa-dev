/**
 * Redux Slice for Messages
 * إدارة حالة نظام المراسلة
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import {
  sendMessage,
  getConversationMessages,
  getUserConversations,
  markMessagesAsRead,
  respondToOffer,
  getTotalUnreadMessages,
  archiveConversation,
  blockConversation,
  type Message,
  type Conversation,
} from '../../lib/firebase/messages';

// ===== State Types =====

interface MessagesState {
  // الرسائل
  messages: { [conversationKey: string]: Message[] }; // مفتوح بـ "listingId-userId1-userId2"
  messagesLoading: boolean;
  messagesError: string | null;
  
  // المحادثات
  conversations: Conversation[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  
  // الرسائل غير المقروءة
  totalUnreadCount: number;
  unreadLoading: boolean;
  
  // المحادثة النشطة
  activeConversation: {
    listingId: string;
    otherUserId: string;
  } | null;
  
  // حالة الإرسال
  sendingMessage: boolean;
  sendError: string | null;
}

const initialState: MessagesState = {
  messages: {},
  messagesLoading: false,
  messagesError: null,
  
  conversations: [],
  conversationsLoading: false,
  conversationsError: null,
  
  totalUnreadCount: 0,
  unreadLoading: false,
  
  activeConversation: null,
  
  sendingMessage: false,
  sendError: null,
};

// ===== Helper Functions =====

/**
 * توليد مفتاح للمحادثة
 */
function getConversationKey(listingId: string, userId1: string, userId2: string): string {
  const sortedUserIds = [userId1, userId2].sort();
  return `${listingId}-${sortedUserIds[0]}-${sortedUserIds[1]}`;
}

// ===== Async Thunks =====

/**
 * إرسال رسالة جديدة
 */
export const sendMessageThunk = createAsyncThunk(
  'messages/sendMessage',
  async (messageData: {
    receiverId: string;
    listingId: string;
    content: string;
    messageType?: Message['messageType'];
    offerPrice?: number;
    parentMessageId?: string;
    senderId: string;
    senderName: string;
    listingTitle: string;
    listingCoverImage?: string;
  }) => {
    const messageId = await sendMessage(messageData);
    return { messageId, messageData };
  }
);

/**
 * جلب رسائل محادثة
 */
export const fetchConversationMessagesThunk = createAsyncThunk(
  'messages/fetchConversationMessages',
  async ({
    listingId,
    userId1,
    userId2,
    limit = 50,
  }: {
    listingId: string;
    userId1: string;
    userId2: string;
    limit?: number;
  }) => {
    const messages = await getConversationMessages(listingId, userId1, userId2, limit);
    const conversationKey = getConversationKey(listingId, userId1, userId2);
    return { conversationKey, messages };
  }
);

/**
 * جلب جميع محادثات المستخدم
 */
export const fetchUserConversationsThunk = createAsyncThunk(
  'messages/fetchUserConversations',
  async (userId: string) => {
    return await getUserConversations(userId);
  }
);

/**
 * تحديد الرسائل كمقروءة
 */
export const markMessagesAsReadThunk = createAsyncThunk(
  'messages/markAsRead',
  async ({
    listingId,
    receiverId,
    senderId,
  }: {
    listingId: string;
    receiverId: string;
    senderId: string;
  }) => {
    await markMessagesAsRead(listingId, receiverId, senderId);
    return { listingId, receiverId, senderId };
  }
);

/**
 * الرد على عرض سعر
 */
export const respondToOfferThunk = createAsyncThunk(
  'messages/respondToOffer',
  async ({
    messageId,
    response,
    counterPrice,
  }: {
    messageId: string;
    response: 'accepted' | 'rejected' | 'counter';
    counterPrice?: number;
  }) => {
    await respondToOffer(messageId, response, counterPrice);
    return { messageId, response, counterPrice };
  }
);

/**
 * جلب إجمالي الرسائل غير المقروءة
 */
export const fetchTotalUnreadMessagesThunk = createAsyncThunk(
  'messages/fetchTotalUnread',
  async (userId: string) => {
    return await getTotalUnreadMessages(userId);
  }
);

/**
 * أرشفة محادثة
 */
export const archiveConversationThunk = createAsyncThunk(
  'messages/archiveConversation',
  async ({
    conversationId,
    userId,
  }: {
    conversationId: string;
    userId: string;
  }) => {
    await archiveConversation(conversationId, userId);
    return conversationId;
  }
);

/**
 * حظر محادثة
 */
export const blockConversationThunk = createAsyncThunk(
  'messages/blockConversation',
  async ({
    conversationId,
    userId,
  }: {
    conversationId: string;
    userId: string;
  }) => {
    await blockConversation(conversationId, userId);
    return conversationId;
  }
);

// ===== Slice Definition =====

const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    // تعيين المحادثة النشطة
    setActiveConversation: (
      state,
      action: PayloadAction<{ listingId: string; otherUserId: string } | null>
    ) => {
      state.activeConversation = action.payload;
    },
    
    // مسح أخطاء الإرسال
    clearSendError: (state) => {
      state.sendError = null;
    },
    
    // مسح أخطاء الرسائل
    clearMessagesError: (state) => {
      state.messagesError = null;
    },
    
    // مسح أخطاء المحادثات
    clearConversationsError: (state) => {
      state.conversationsError = null;
    },
    
    // إضافة رسالة جديدة محلياً (للتحديث الفوري)
    addMessageLocally: (
      state,
      action: PayloadAction<{
        conversationKey: string;
        message: Message;
      }>
    ) => {
      const { conversationKey, message } = action.payload;
      if (!state.messages[conversationKey]) {
        state.messages[conversationKey] = [];
      }
      state.messages[conversationKey].push(message);
    },
    
    // تحديث عداد الرسائل غير المقروءة محلياً
    updateUnreadCountLocally: (state, action: PayloadAction<number>) => {
      state.totalUnreadCount = Math.max(0, state.totalUnreadCount + action.payload);
    },
    
    // مسح رسائل محادثة معينة
    clearConversationMessages: (state, action: PayloadAction<string>) => {
      delete state.messages[action.payload];
    },
    
    // إعادة تعيين حالة المراسلة
    resetMessagesState: (state) => {
      state.messages = {};
      state.conversations = [];
      state.totalUnreadCount = 0;
      state.activeConversation = null;
      state.messagesError = null;
      state.conversationsError = null;
      state.sendError = null;
    },
  },
  extraReducers: (builder) => {
    // إرسال رسالة
    builder
      .addCase(sendMessageThunk.pending, (state) => {
        state.sendingMessage = true;
        state.sendError = null;
      })
      .addCase(sendMessageThunk.fulfilled, (state) => {
        state.sendingMessage = false;
        state.sendError = null;
        // ملاحظة: الرسالة ستتم إضافتها عبر addMessageLocally أثناء الإرسال
      })
      .addCase(sendMessageThunk.rejected, (state, action) => {
        state.sendingMessage = false;
        state.sendError = action.error.message || 'فشل في إرسال الرسالة';
      });

    // جلب رسائل المحادثة
    builder
      .addCase(fetchConversationMessagesThunk.pending, (state) => {
        state.messagesLoading = true;
        state.messagesError = null;
      })
      .addCase(fetchConversationMessagesThunk.fulfilled, (state, action) => {
        state.messagesLoading = false;
        state.messagesError = null;
        const { conversationKey, messages } = action.payload;
        state.messages[conversationKey] = messages;
      })
      .addCase(fetchConversationMessagesThunk.rejected, (state, action) => {
        state.messagesLoading = false;
        state.messagesError = action.error.message || 'فشل في جلب الرسائل';
      });

    // جلب المحادثات
    builder
      .addCase(fetchUserConversationsThunk.pending, (state) => {
        state.conversationsLoading = true;
        state.conversationsError = null;
      })
      .addCase(fetchUserConversationsThunk.fulfilled, (state, action) => {
        state.conversationsLoading = false;
        state.conversationsError = null;
        state.conversations = action.payload;
      })
      .addCase(fetchUserConversationsThunk.rejected, (state, action) => {
        state.conversationsLoading = false;
        state.conversationsError = action.error.message || 'فشل في جلب المحادثات';
      });

    // تحديد كمقروء
    builder
      .addCase(markMessagesAsReadThunk.fulfilled, (state, action) => {
        const { listingId, receiverId, senderId } = action.payload;
        const conversationKey = getConversationKey(listingId, receiverId, senderId);
        
        // تحديث حالة القراءة في الرسائل
        if (state.messages[conversationKey]) {
          state.messages[conversationKey] = state.messages[conversationKey].map(msg => ({
            ...msg,
            isRead: msg.receiverId === receiverId ? true : msg.isRead,
          }));
        }
        
        // تحديث المحادثة
        state.conversations = state.conversations.map(conv => ({
          ...conv,
          unreadCount: conv.listingId === listingId 
            ? { ...conv.unreadCount, [receiverId]: 0 }
            : conv.unreadCount,
        }));
      });

    // جلب إجمالي غير المقروء
    builder
      .addCase(fetchTotalUnreadMessagesThunk.pending, (state) => {
        state.unreadLoading = true;
      })
      .addCase(fetchTotalUnreadMessagesThunk.fulfilled, (state, action) => {
        state.unreadLoading = false;
        state.totalUnreadCount = action.payload;
      })
      .addCase(fetchTotalUnreadMessagesThunk.rejected, (state) => {
        state.unreadLoading = false;
      });

    // الرد على العرض
    builder
      .addCase(respondToOfferThunk.fulfilled, (state, action) => {
        const { messageId, response } = action.payload;
        
        // تحديث الرسالة في جميع المحادثات
        Object.keys(state.messages).forEach(key => {
          const list = state.messages[key];
          if (!list) return;
          state.messages[key] = list.map(msg => 
            msg.id === messageId ? { ...msg, offerStatus: response } : msg
          );
        });
      });

    // أرشفة المحادثة
    builder
      .addCase(archiveConversationThunk.fulfilled, (state, action) => {
        const conversationId = action.payload;
        state.conversations = state.conversations.filter(conv => conv.id !== conversationId);
      });

    // حظر المحادثة
    builder
      .addCase(blockConversationThunk.fulfilled, (state, action) => {
        const conversationId = action.payload;
        state.conversations = state.conversations.filter(conv => conv.id !== conversationId);
      });
  },
});

// ===== Actions & Selectors =====

export const {
  setActiveConversation,
  clearSendError,
  clearMessagesError,
  clearConversationsError,
  addMessageLocally,
  updateUnreadCountLocally,
  clearConversationMessages,
  resetMessagesState,
} = messagesSlice.actions;

// Selectors
export const selectMessages = (state: { messages: MessagesState }) => state.messages;

export const selectConversationMessages = (
  state: { messages: MessagesState },
  listingId: string,
  userId1: string,
  userId2: string
) => {
  const conversationKey = getConversationKey(listingId, userId1, userId2);
  return state.messages.messages[conversationKey] || [];
};

export const selectActiveConversation = (state: { messages: MessagesState }) =>
  state.messages.activeConversation;

export const selectTotalUnreadCount = (state: { messages: MessagesState }) =>
  state.messages.totalUnreadCount;

export const selectConversations = (state: { messages: MessagesState }) =>
  state.messages.conversations;

export const selectMessagesLoading = (state: { messages: MessagesState }) =>
  state.messages.messagesLoading;

export const selectConversationsLoading = (state: { messages: MessagesState }) =>
  state.messages.conversationsLoading;

export const selectSendingMessage = (state: { messages: MessagesState }) =>
  state.messages.sendingMessage;

export default messagesSlice.reducer;