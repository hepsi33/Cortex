import { pgTable, text, timestamp, uuid, vector, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const profiles = pgTable('profiles', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role', { enum: ['admin', 'user', 'pro', 'demo_admin'] }).default('user').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected', 'active'] }).default('active').notNull(),
    stripeCustomerId: text('stripe_customer_id').unique(),
    stripeSubscriptionId: text('stripe_subscription_id').unique(),
    stripePriceId: text('stripe_price_id'),
    stripeCurrentPeriodEnd: timestamp('stripe_current_period_end'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const usage_tracking = pgTable('usage_tracking', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    day: text('day').notNull(), // Format: YYYY-MM-DD
    aiGenerations: integer('ai_generations').default(0).notNull(),
    repoCount: integer('repo_count').default(0).notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const workspaces = pgTable('workspaces', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const documents = pgTable('documents', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    content: text('content'),
    fileType: text('file_type'),
    status: text('status', { enum: ['pending', 'indexing', 'completed', 'failed'] }).default('pending').notNull(),
    chunkCount: integer('chunk_count').default(0).notNull(),
    processedCount: integer('processed_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const embeddings = pgTable('embeddings', {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'),
    vector: vector('vector', { dimensions: 768 }), // gemini-embedding-001 outputs 768 dims
});

export const chats = pgTable('chats', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }).notNull(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const messages = pgTable('messages', {
    id: uuid('id').defaultRandom().primaryKey(),
    chatId: uuid('chat_id').references(() => chats.id, { onDelete: 'cascade' }).notNull(),
    role: text('role', { enum: ['user', 'assistant'] }).notNull(),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
    user: one(profiles, {
        fields: [workspaces.userId],
        references: [profiles.id],
    }),
    documents: many(documents),
    chats: many(chats),
}));

export const usageTrackingRelations = relations(usage_tracking, ({ one }) => ({
    user: one(profiles, {
        fields: [usage_tracking.userId],
        references: [profiles.id],
    }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
    user: one(profiles, {
        fields: [documents.userId],
        references: [profiles.id],
    }),
    workspace: one(workspaces, {
        fields: [documents.workspaceId],
        references: [workspaces.id],
    }),
    embeddings: many(embeddings),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
    document: one(documents, {
        fields: [embeddings.documentId],
        references: [documents.id],
    }),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
    user: one(profiles, {
        fields: [chats.userId],
        references: [profiles.id],
    }),
    workspace: one(workspaces, {
        fields: [chats.workspaceId],
        references: [workspaces.id],
    }),
    document: one(documents, {
        fields: [chats.documentId],
        references: [documents.id],
    }),
    messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
    chat: one(chats, {
        fields: [messages.chatId],
        references: [chats.id],
    }),
}));

export const uploadChunks = pgTable('upload_chunks', {
    id: uuid('id').defaultRandom().primaryKey(),
    uploadId: text('upload_id').notNull(),
    chunkIndex: integer('chunk_index').notNull(),
    totalChunks: integer('total_chunks').notNull(),
    data: text('data').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof profiles.$inferSelect;
export type NewUser = typeof profiles.$inferInsert;
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type UsageTracking = typeof usage_tracking.$inferSelect;
export type NewUsageTracking = typeof usage_tracking.$inferInsert;
export type UploadChunk = typeof uploadChunks.$inferSelect;
export type NewUploadChunk = typeof uploadChunks.$inferInsert;
