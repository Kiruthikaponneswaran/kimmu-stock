import { configureStore } from '@reduxjs/toolkit';
import auth from './authSlice';
import { makeCrud } from './crudSlice';

export const productsCrud = makeCrud('products', '/products');
export const categoriesCrud = makeCrud('categories', '/categories');
export const customersCrud = makeCrud('customers', '/customers');
export const suppliersCrud = makeCrud('suppliers', '/suppliers');
export const usersCrud = makeCrud('users', '/users');
export const salesCrud = makeCrud('sales', '/sales');
export const purchasesCrud = makeCrud('purchases', '/purchases');
export const productionCrud = makeCrud('production', '/production');
export const bomsCrud = makeCrud('boms', '/boms');
export const expensesCrud = makeCrud('expenses', '/expenses');
export const chartCrud = makeCrud('chart', '/chart');

export const makeStore = () => configureStore({
  reducer: {
    auth,
    products: productsCrud.reducer, categories: categoriesCrud.reducer, customers: customersCrud.reducer,
    suppliers: suppliersCrud.reducer, users: usersCrud.reducer, sales: salesCrud.reducer,
    purchases: purchasesCrud.reducer, production: productionCrud.reducer, boms: bomsCrud.reducer,
    expenses: expensesCrud.reducer, chart: chartCrud.reducer,
  },
});
