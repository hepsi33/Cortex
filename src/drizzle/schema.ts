import { pgTable, text, timestamp, uuid, vector, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role', { enum: ['admin', 'user'] }).default('user').notNull(),
    status: text('status', { enum: ['pending', 'approved', 'rejected'] }).default('pending').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const workspaces = pgTable('workspaces', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    name: text('name').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const documents = pgTable('documents', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
    workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    content: text('content'),
    fileType: text('file_type'),
    status: text('status', { enum: ['pending', 'indexing', 'completed', 'failed'] }).default('pending').notNull(),
    chunkCount: integer('chunk_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const embeddings = pgTable('embeddings', {
    id: uuid('id').defaultRandom().primaryKey(),
    documentId: uuid('document_id').references(() => documents.id, { onDelete: 'cascade' }).notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata'),
    vector: vector('vector', { dimensions: 3072 }), // Gemini gemini-embedding-001 outputs 3072 dims
});

export const chats = pgTable('chats', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
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
    user: one(users, {
        fields: [workspaces.userId],
        references: [users.id],
    }),
    documents: many(documents),
    chats: many(chats),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
    user: one(users, {
        fields: [documents.userId],
        references: [users.id],
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
    user: one(users, {
        fields: [chats.userId],
        references: [users.id],
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


export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
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
