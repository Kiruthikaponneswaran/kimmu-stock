export const money = (n) => 'AED ' + Number(n || 0).toLocaleString('en-AE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
export const int = (n) => Number(n || 0).toLocaleString('en-AE');
export const fmtDate = (s) => (s ? new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '-');
export const MOVE_LABELS = { sale: 'Sale', sale_return: 'Sale return', purchase: 'Purchase receipt', production_in: 'Production output', production_out: 'Production use', adjustment: 'Adjustment', opening: 'Opening stock' };
export const compact = (n) => Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n || 0);
export const COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444'];
export const MOVE_CHIP = { sale: 'sale', sale_return: 'purchase', purchase: 'purchase', production_in: 'production', production_out: 'low', adjustment: 'ok', opening: 'ok' };
