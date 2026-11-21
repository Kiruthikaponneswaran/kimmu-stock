import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

// One factory builds the slice + thunks for every master (products, customers, ...)
export function makeCrud(name, path) {
  const load = createAsyncThunk(`${name}/load`, () => api(path));
  const save = createAsyncThunk(`${name}/save`, (item) =>
    item.id ? api(`${path}/${item.id}`, { method: 'PUT', body: item }) : api(path, { method: 'POST', body: item }));
  const remove = createAsyncThunk(`${name}/remove`, async (id) => { await api(`${path}/${id}`, { method: 'DELETE' }); return id; });

  const slice = createSlice({
    name,
    initialState: { items: [], status: 'idle', error: null },
    reducers: {},
    extraReducers: (b) => b
      .addCase(load.pending, (s) => { s.status = 'loading'; })
      .addCase(load.fulfilled, (s, a) => { s.status = 'done'; s.items = a.payload; })
      .addCase(load.rejected, (s, a) => { s.status = 'error'; s.error = a.error.message; })
      .addCase(remove.fulfilled, (s, a) => { s.items = s.items.filter((i) => i.id !== a.payload); }),
  });
  return { reducer: slice.reducer, load, save, remove };
}
