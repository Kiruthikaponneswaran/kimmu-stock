import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

const remember = (data) => { localStorage.setItem('token', data.token); localStorage.setItem('session', JSON.stringify(data)); return data; };
export const login = createAsyncThunk('auth/login', async (creds) => remember(await api('/auth/login', { method: 'POST', body: creds })));
export const signup = createAsyncThunk('auth/signup', async (info) => remember(await api('/auth/signup', { method: 'POST', body: info })));

const slice = createSlice({
  name: 'auth',
  initialState: { user: null, rights: {}, token: null, ready: false },
  reducers: {
    hydrate(s) {
      const raw = localStorage.getItem('session');
      if (raw) { const d = JSON.parse(raw); s.user = d.user; s.rights = d.rights; s.token = d.token; }
      s.ready = true;
    },
    logout(s) { localStorage.clear(); s.user = null; s.rights = {}; s.token = null; },
  },
  extraReducers: (b) => {
    const set = (s, a) => { s.user = a.payload.user; s.rights = a.payload.rights; s.token = a.payload.token; };
    b.addCase(login.fulfilled, set).addCase(signup.fulfilled, set);
  },
});
export const { hydrate, logout } = slice.actions;
export default slice.reducer;
