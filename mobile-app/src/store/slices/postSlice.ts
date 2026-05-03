import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';
import { getApiErrorMessage } from '../../utils/apiError';

export interface ApiPost {
  _id: string;
  author: {
    _id: string;
    userId: string;
    profilePhoto?: string;
  };
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  mediaUrls: string[];
  mentions?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export const fetchPosts = createAsyncThunk<ApiPost[], void, { rejectValue: string }>(
  'posts/fetchPosts',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/posts');
      return res.data as ApiPost[];
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e));
    }
  }
);

export const createPost = createAsyncThunk<
  ApiPost,
  { content: string; sentiment?: ApiPost['sentiment']; mediaUrls?: string[] },
  { rejectValue: string }
>('posts/createPost', async ({ content, sentiment = 'neutral', mediaUrls = [] }, { rejectWithValue }) => {
  try {
    const res = await api.post('/posts', {
      content,
      sentiment,
      mediaUrls,
    });
    return res.data as ApiPost;
  } catch (e) {
    return rejectWithValue(getApiErrorMessage(e));
  }
});

interface PostState {
  posts: ApiPost[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PostState = {
  posts: [],
  isLoading: false,
  error: null
};

const postSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    setLoading: (state) => { state.isLoading = true; },
    setPosts: (state, action: PayloadAction<ApiPost[]>) => {
      state.posts = action.payload;
      state.isLoading = false;
    },
    addPost: (state, action: PayloadAction<ApiPost>) => {
      state.posts.unshift(action.payload);
    },
    updatePost: (state, action: PayloadAction<ApiPost>) => {
      const index = state.posts.findIndex(p => p._id === action.payload._id);
      if (index !== -1) state.posts[index] = action.payload;
    },
    deletePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter(p => p._id !== action.payload);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.posts = action.payload;
        state.isLoading = false;
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to load posts';
      })
      .addCase(createPost.pending, (state) => {
        state.error = null;
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.posts.unshift(action.payload);
      })
      .addCase(createPost.rejected, (state, action) => {
        state.error = action.payload || 'Failed to create post';
      });
  },
});

export const { setLoading, setPosts, addPost, updatePost, deletePost, setError } = postSlice.actions;
export default postSlice.reducer;
