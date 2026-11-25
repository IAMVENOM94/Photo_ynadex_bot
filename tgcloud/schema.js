import { table, integer, text } from 'sdk/db';
export const drafts = table('drafts', {
  userId: integer('user_id').primaryKey(),
  stage: text('stage').notNull(),
  badge: text('badge'), first: text('first'), last: text('last'),
  fileId: text('file_id'), publicUrl: text('public_url'),
});
export const locks = table('locks', {
  name: text('name').primaryKey(), owner: text('owner').notNull(),
  expires: integer('expires').notNull(),
});
