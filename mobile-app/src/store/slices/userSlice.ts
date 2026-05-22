import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  allianceCount: number;
  isVerified: boolean;
}

export interface UserState {
  currentUser: UserProfile | null;
  users: UserProfile[];
  isLoading: boolean;
}
const initialState: UserState = {
  currentUser: null,
  users: [],
  isLoading: false
};

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setCurrentUser: (state, action: PayloadAction<UserProfile>) => {
      state.currentUser = action.payload;
    },
    setUsers: (state, action: PayloadAction<UserProfile[]>) => {
      state.users = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }
  }
});

export const { setCurrentUser, setUsers, setLoading } = userSlice.actions;
export default userSlice.reducer;
