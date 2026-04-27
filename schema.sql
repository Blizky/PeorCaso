PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  pending_email TEXT NULL,
  pending_email_token TEXT NULL,
  pending_email_expires_at TEXT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  name TEXT NOT NULL,
  access_level TEXT NOT NULL CHECK (access_level IN ('owner', 'admin', 'moderator', 'contributor', 'user')),
  flag TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK (purpose IN ('invite', 'reset_password', 'activate_account')),
  expires_at TEXT NOT NULL,
  sent_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  used_at TEXT NULL,
  created_by INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL,
  author_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  post_date TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_alt TEXT NOT NULL DEFAULT '',
  video_url TEXT NULL,
  likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  content_markdown TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('visible', 'pending', 'removed')),
  approved_by INTEGER NULL,
  approved_at TEXT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  parent_comment_id INTEGER NULL,
  user_id INTEGER NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'visible', 'spam', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (post_id, user_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS youtube_video_imports (
  video_id TEXT PRIMARY KEY,
  playlist_id TEXT NOT NULL,
  post_id INTEGER NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('report_post', 'report_comment', 'support', 'other')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'rejected')),
  post_id INTEGER NULL,
  comment_id INTEGER NULL,
  user_id INTEGER NULL,
  guest_name TEXT NULL,
  guest_email TEXT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  assigned_to INTEGER NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (post_id IS NULL OR comment_id IS NULL),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_access_level ON users (access_level, name);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pending_email ON users (pending_email) WHERE pending_email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_pending_email_token ON users (pending_email_token) WHERE pending_email_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_invites_user_id ON user_invites (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_invites_token_hash ON user_invites (token_hash);
CREATE INDEX IF NOT EXISTS idx_user_invites_open ON user_invites (used_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON categories (sort_order, name);

CREATE INDEX IF NOT EXISTS idx_posts_post_date ON posts (post_date DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts (category_id);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts (author_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts (status, post_date DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_status_created ON comments (post_id, status, created_at ASC, id ASC);
CREATE INDEX IF NOT EXISTS idx_comments_user_status_created ON comments (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments (parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_created ON post_likes (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_video_imports_playlist_id ON youtube_video_imports (playlist_id, post_id);

CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON tickets (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to_status ON tickets (assigned_to, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_open_post ON tickets (post_id)
  WHERE post_id IS NOT NULL AND status IN ('open', 'in_progress');
CREATE UNIQUE INDEX IF NOT EXISTS idx_tickets_open_comment ON tickets (comment_id)
  WHERE comment_id IS NOT NULL AND status IN ('open', 'in_progress');
