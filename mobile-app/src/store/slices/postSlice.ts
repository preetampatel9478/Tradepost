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
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
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

export const likePost = createAsyncThunk<ApiPost, { postId: string }, { rejectValue: string }>(
  'posts/likePost',
  async ({ postId }, { rejectWithValue }) => {
    try {
      const res = await api.post(`/posts/${postId}/like`);
      return res.data as ApiPost;
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e));
    }
  }
);

export const unlikePost = createAsyncThunk<ApiPost, { postId: string }, { rejectValue: string }>(
  'posts/unlikePost',
  async ({ postId }, { rejectWithValue }) => {
    try {
      const res = await api.delete(`/posts/${postId}/like`);
      return res.data as ApiPost;
    } catch (e) {
      return rejectWithValue(getApiErrorMessage(e));
    }
  }
);

export const createComment = createAsyncThunk<
  { postId: string; likeCount: number; commentCount: number; comment: any },
  { postId: string; content: string; parentCommentId?: string },
  { rejectValue: string }
>('posts/createComment', async ({ postId, content, parentCommentId }, { rejectWithValue }) => {
  try {
    const res = await api.post('/comments', { postId, content, parentCommentId });
    const payload = res.data as any;
    return {
      postId,
      likeCount: Number(payload?.post?.likeCount) || 0,
      commentCount: Number(payload?.post?.commentCount) || 0,
      comment: payload?.comment,
    };
  } catch (e) {
    return rejectWithValue(getApiErrorMessage(e));
  }
});

export interface PostState {
  posts: ApiPost[];
  isLoading: boolean;
  error: string | null;
}

function sortPostsNewestFirst(posts: ApiPost[]): ApiPost[] {
  return [...posts].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    const safeATime = Number.isFinite(aTime) ? aTime : 0;
    const safeBTime = Number.isFinite(bTime) ? bTime : 0;
    return safeBTime - safeATime;
  });
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
      state.posts = sortPostsNewestFirst(action.payload);
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
    },
    patchPostEngagement: (
      state,
      action: PayloadAction<{ postId: string; likeCount?: number; commentCount?: number; isLiked?: boolean }>
    ) => {
      const { postId, likeCount, commentCount, isLiked } = action.payload;
      const index = state.posts.findIndex((p) => p._id === postId);
      if (index === -1) return;
      const current = state.posts[index];
      state.posts[index] = {
        ...current,
        ...(typeof likeCount === 'number' ? { likeCount } : {}),
        ...(typeof commentCount === 'number' ? { commentCount } : {}),
        ...(typeof isLiked === 'boolean' ? { isLiked } : {}),
      };
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.posts = sortPostsNewestFirst(action.payload);
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
      })
      .addCase(likePost.fulfilled, (state, action) => {
        const index = state.posts.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) state.posts[index] = action.payload;
      })
      .addCase(unlikePost.fulfilled, (state, action) => {
        const index = state.posts.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) state.posts[index] = action.payload;
      })
      .addCase(createComment.fulfilled, (state, action) => {
        const { postId, likeCount, commentCount } = action.payload;
        const index = state.posts.findIndex((p) => p._id === postId);
        if (index === -1) return;
        const current = state.posts[index];
        state.posts[index] = { ...current, likeCount, commentCount };
      });
  },
});

export const { setLoading, setPosts, addPost, updatePost, deletePost, setError, patchPostEngagement } =
  postSlice.actions;
export default postSlice.reducer;
