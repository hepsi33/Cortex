-- Enable pgvector
create extension if not exists vector;

-- Documents table
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  filename text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  status text default 'UPLOADED',
  -- status values: UPLOADED, PARSING, OCR_PROCESSING, TEXT_CLEANING,
  --                CHUNKING, EMBEDDING, INDEXING, VERIFYING, READY,
  --                FAILED, FAILED_VALIDATION
  current_stage text,
  error_message text,
  retry_count integer default 0,
  chunk_count integer default 0,
  page_count integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Document chunks + vectors (replaces Qdrant entirely)
create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  content text not null,
  embedding vector(384),
  chunk_index integer not null,
  page_number integer,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Vector similarity search index
create index on document_chunks
using ivfflat (embedding vector_cosine_ops)
with (lists = 100);

-- Conversations
create table conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  document_id uuid references documents(id) on delete cascade,
  title text,
  created_at timestamptz default now()
);

-- Messages
create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb default '[]',
  created_at timestamptz default now()
);

-- Processing logs (full audit trail)
create table processing_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade,
  stage text not null,
  status text not null,
  message text,
  error text,
  stack_trace text,
  duration_ms integer,
  created_at timestamptz default now()
);

-- Vector search function
create or replace function match_chunks(
  query_embedding vector(384),
  match_document_id uuid,
  match_count int default 5
)
returns table(
  id uuid,
  content text,
  chunk_index integer,
  page_number integer,
  metadata jsonb,
  similarity float
)
language sql stable
as $$
  select
    id,
    content,
    chunk_index,
    page_number,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from document_chunks
  where document_id = match_document_id
    and embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

-- Auto update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_updated_at
  before update on documents
  for each row execute function update_updated_at();

-- Row Level Security
alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table processing_logs enable row level security;

create policy "Users see own documents"
  on documents for all
  using (auth.uid() = user_id);

create policy "Users see own chunks"
  on document_chunks for all
  using (
    document_id in (
      select id from documents where user_id = auth.uid()
    )
  );

create policy "Users see own conversations"
  on conversations for all
  using (auth.uid() = user_id);

create policy "Users see own messages"
  on messages for all
  using (
    conversation_id in (
      select id from conversations where user_id = auth.uid()
    )
  );
