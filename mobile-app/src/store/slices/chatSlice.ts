import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  timestamp: string;
}

export interface ChatState {
  messages: ChatMessage[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}
const initialState: ChatState = {
  messages: [],
  unreadCount: 0,
  isLoading: false,
  error: null
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
      // Increment unread count if it's received (handled further up if needed, but we can do it here or via a specific action)
    },
    incrementUnread: (state) => {
      state.unreadCount += 1;
    },
    resetUnread: (state) => {
      state.unreadCount = 0;
    },
    setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.messages = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    }
  }
});

export const { addMessage, incrementUnread, resetUnread, setMessages, setLoading, setError } = chatSlice.actions;
export default chatSlice.reducer;
