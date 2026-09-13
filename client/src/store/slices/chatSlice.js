// Chat state: conversation list and unread message count
import { createSlice } from '@reduxjs/toolkit';

const chatSlice = createSlice({
  name: 'chat',
  initialState: {
    conversations: [],
    unreadCount: 0,
  },
  reducers: {
    setConversations: (state, action) => {
      state.conversations = action.payload;
    },
    upsertConversation: (state, action) => {
      const index = state.conversations.findIndex((c) => c._id === action.payload._id);
      if (index >= 0) state.conversations[index] = action.payload;
      else state.conversations.unshift(action.payload);
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
  },
});

export const { setConversations, upsertConversation, setUnreadCount } = chatSlice.actions;
export default chatSlice.reducer;
