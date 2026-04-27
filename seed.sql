BEGIN TRANSACTION;

DELETE FROM tickets;
DELETE FROM post_likes;
DELETE FROM comments;
DELETE FROM posts;
DELETE FROM categories;
DELETE FROM user_invites;
DELETE FROM users;
DELETE FROM sqlite_sequence WHERE name IN ('tickets', 'comments', 'posts', 'categories', 'user_invites', 'users');

INSERT INTO users (
  id,
  email,
  password_hash,
  password_salt,
  name,
  access_level,
  flag,
  is_active,
  created_at,
  updated_at
) VALUES
  (
    1,
    'admin@peorcaso.com',
    'pbkdf2$0507fd6cd365c1a230761c53eda04d5b0ced6451558a26e8383253a2e61dc999',
    '45f69f8770e0576743514f74ca3b8e90',
    'Ana Admin',
    'admin',
    '',
    1,
    '2026-04-10T09:00:00.000Z',
    '2026-04-10T09:00:00.000Z'
  ),
  (
    2,
    'moderator@peorcaso.com',
    'pbkdf2$1337ee624544374faf2ec84b038795da1926be1adeaa187e4724b87dbe673fa3',
    '9815446f6b3e1d5a8c5558338b2e7612',
    'Mara Moderator',
    'moderator',
    'is_comment_moderator',
    1,
    '2026-04-12T11:30:00.000Z',
    '2026-04-12T11:30:00.000Z'
  ),
  (
    3,
    'reader@example.com',
    'pbkdf2$d2b4d4745c53789230f01ca130a68f1855d96634e2b115a0ca771db1eee3e153',
    'b85573b05573248ce4a4422ceae837d4',
    'Rene Reader',
    'user',
    'is_patreon',
    1,
    '2026-04-20T14:45:00.000Z',
    '2026-04-20T14:45:00.000Z'
  );

INSERT INTO categories (id, name, slug, description, sort_order, created_at, updated_at) VALUES
  (1, 'Analysis', 'analysis', 'Long-form breakdowns and case context.', 1, '2026-04-10T09:05:00.000Z', '2026-04-10T09:05:00.000Z'),
  (2, 'Updates', 'updates', 'News, corrections, and follow-ups.', 2, '2026-04-10T09:06:00.000Z', '2026-04-10T09:06:00.000Z'),
  (3, 'Reports', 'reports', 'Shorter incident and response notes.', 3, '2026-04-10T09:07:00.000Z', '2026-04-10T09:07:00.000Z');

INSERT INTO posts (
  id,
  category_id,
  author_id,
  title,
  slug,
  post_date,
  image_url,
  image_alt,
  video_url,
  likes,
  content_markdown,
  status,
  approved_by,
  approved_at,
  created_at,
  updated_at
) VALUES
  (
    1,
    1,
    1,
    'The Empty Lot Timeline',
    'the-empty-lot-timeline',
    '2026-04-18',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
    'A fenced empty lot under gray daylight',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    42,
    '# The Empty Lot Timeline\n\nA step-by-step reconstruction of the public record.\n\n- Witness interviews\n- Permit history\n- Camera gaps',
    'visible',
    1,
    '2026-04-18T12:00:00.000Z',
    '2026-04-18T12:00:00.000Z',
    '2026-04-18T12:00:00.000Z'
  ),
  (
    2,
    2,
    1,
    'Statement From The Family Lawyer',
    'statement-from-the-family-lawyer',
    '2026-04-19',
    'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1200&q=80',
    'Documents on a desk beside a fountain pen',
    NULL,
    19,
    '## Summary\n\nThe lawyer says the dispute centers on missing correspondence and timing.',
    'visible',
    1,
    '2026-04-19T09:15:00.000Z',
    '2026-04-19T09:15:00.000Z',
    '2026-04-19T09:15:00.000Z'
  ),
  (
    3,
    3,
    2,
    'Unverified Parking Garage Tip',
    'unverified-parking-garage-tip',
    '2026-04-21',
    'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=80',
    'A dim parking garage ramp with concrete pillars',
    NULL,
    0,
    'A contributor summary that still needs editorial review.',
    'pending',
    NULL,
    NULL,
    '2026-04-21T08:30:00.000Z',
    '2026-04-21T08:30:00.000Z'
  ),
  (
    4,
    2,
    1,
    'Retracted Camera Footage Claim',
    'retracted-camera-footage-claim',
    '2026-04-15',
    'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
    'A security camera on a brick wall',
    NULL,
    3,
    'This post was pulled after the source backed away from the claim.',
    'removed',
    1,
    '2026-04-15T16:20:00.000Z',
    '2026-04-15T16:20:00.000Z',
    '2026-04-16T10:00:00.000Z'
  ),
  (
    5,
    1,
    1,
    'Map Of Known Timeline Gaps',
    'map-of-known-timeline-gaps',
    '2026-04-22',
    'https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=1200&q=80',
    'Pinned paper map with handwritten notes',
    NULL,
    8,
    'A work-in-progress map of places and times where records still conflict.',
    'visible',
    1,
    '2026-04-22T13:00:00.000Z',
    '2026-04-22T13:00:00.000Z',
    '2026-04-22T13:00:00.000Z'
  );

INSERT INTO comments (
  id,
  post_id,
  parent_comment_id,
  user_id,
  body,
  status,
  created_at,
  updated_at
) VALUES
  (1, 1, NULL, 3, 'This timeline helped a lot. The permit gap is the strangest part.', 'visible', '2026-04-21T10:00:00.000Z', '2026-04-21T10:00:00.000Z'),
  (2, 1, 1, 2, 'We are checking whether a second permit record exists under an older parcel number.', 'visible', '2026-04-21T10:30:00.000Z', '2026-04-21T10:30:00.000Z'),
  (3, 2, NULL, 3, 'Can someone confirm whether the letter was filed before the interview?', 'pending', '2026-04-22T09:00:00.000Z', '2026-04-22T09:00:00.000Z'),
  (4, 2, NULL, 3, 'Visit shady-links.biz for the real leak.', 'spam', '2026-04-22T09:10:00.000Z', '2026-04-22T09:10:00.000Z'),
  (5, 5, NULL, 2, 'The transit timestamps on this map line up with the public video archive.', 'visible', '2026-04-22T17:45:00.000Z', '2026-04-22T17:45:00.000Z'),
  (6, 5, 5, 3, 'I still think one alley camera is missing from the map.', 'pending', '2026-04-22T18:00:00.000Z', '2026-04-22T18:00:00.000Z'),
  (7, 1, NULL, 2, 'The masked plate number in the clip should stay out of the article body.', 'visible', '2026-04-22T18:20:00.000Z', '2026-04-22T18:20:00.000Z');

INSERT INTO tickets (
  id,
  type,
  status,
  post_id,
  comment_id,
  user_id,
  guest_name,
  guest_email,
  subject,
  message,
  assigned_to,
  created_at,
  updated_at
) VALUES
  (
    1,
    'report_comment',
    'open',
    NULL,
    4,
    3,
    NULL,
    NULL,
    'Spam link in comment thread',
    'The comment is pushing an external link and looks like spam.',
    2,
    '2026-04-22T09:12:00.000Z',
    '2026-04-22T09:12:00.000Z'
  ),
  (
    2,
    'support',
    'in_progress',
    NULL,
    NULL,
    NULL,
    'Guest Reporter',
    'guest@example.com',
    'Access request for corrections',
    'A family representative wants a secure way to submit corrections and documents.',
    1,
    '2026-04-22T14:00:00.000Z',
    '2026-04-22T15:10:00.000Z'
  );

COMMIT;

-- Seed login credentials:
-- admin@peorcaso.com / Password123!
-- moderator@peorcaso.com / Password123!
-- reader@example.com / Password123!
