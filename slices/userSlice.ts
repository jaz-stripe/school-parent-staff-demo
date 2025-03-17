// slices/userSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserState {
  id: number | null;
  firstName: string;
  lastName: string;
  email: string;
  emoji: string;
  role: 'parent' | 'staff' | null;
  isLoggedIn: boolean;
  hasPaymentMethod: boolean;
}

const initialState: UserState = {
  id: null,
  firstName: '',
  lastName: '',
  email: '',
  emoji: '',
  role: null,
  isLoggedIn: false,
  hasPaymentMethod: false,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<Partial<UserState>>) {
      return { ...state, ...action.payload, isLoggedIn: true };
    },
    clearUser(state) {
      return { ...initialState };
    },
    setHasPaymentMethod(state, action: PayloadAction<boolean>) {
      state.hasPaymentMethod = action.payload;
    },
  },
});

export const { setUser, clearUser, setHasPaymentMethod } = userSlice.actions;
export default userSlice.reducer;
