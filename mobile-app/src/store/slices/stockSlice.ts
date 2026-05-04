import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Stock {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

export interface StockState {
  stocks: Stock[];
  watchlist: string[];
  isLoading: boolean;
}

const initialState: StockState = {
  stocks: [],
  watchlist: [],
  isLoading: false
};

const stockSlice = createSlice({
  name: 'stocks',
  initialState,
  reducers: {
    setStocks: (state, action: PayloadAction<Stock[]>) => {
      state.stocks = action.payload;
    },
    updateStock: (state, action: PayloadAction<Stock>) => {
      const index = state.stocks.findIndex(s => s.id === action.payload.id);
      if (index !== -1) state.stocks[index] = action.payload;
      else state.stocks.push(action.payload);
    },
    addToWatchlist: (state, action: PayloadAction<string>) => {
      if (!state.watchlist.includes(action.payload)) {
        state.watchlist.push(action.payload);
      }
    },
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      state.watchlist = state.watchlist.filter(id => id !== action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    }
  }
});

export const { setStocks, updateStock, addToWatchlist, removeFromWatchlist, setLoading } = stockSlice.actions;
export default stockSlice.reducer;
