-- AI 问答质量日志表
-- 目的:让产品方(MYTax owner)能回顾真实用户怎么问、AI 答得对不对、
--      哪些问题最高频 —— 指导知识库 / 计算器 / 提示词的迭代。
--
-- 隐私:本表只允许 service role(server 端 admin client)写入与读取。
--      未建立任何 RLS policy => 默认拒绝所有匿名 / 已登录用户的直接访问。
--      问题文本可能含收入数字,仅存于 owner 自己的 Supabase,不外传第三方。

create table if not exists public.ai_chat_logs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id) on delete set null,
  locale             text,
  question           text,
  answer             text,
  answer_length      integer default 0,
  used_rag           boolean default false,
  used_precalc       boolean default false,
  used_deterministic boolean default false,
  agent_intent       text,
  agent_tool_name    text,
  agent_needs_follow_up boolean default false,
  agent_missing_fields text[] default '{}',
  created_at         timestamptz default now()
);

alter table public.ai_chat_logs
  add column if not exists agent_intent text;

alter table public.ai_chat_logs
  add column if not exists agent_tool_name text;

alter table public.ai_chat_logs
  add column if not exists agent_needs_follow_up boolean default false;

alter table public.ai_chat_logs
  add column if not exists agent_missing_fields text[] default '{}';

-- 启用 RLS 但不加任何 policy => 仅 service role 可读写。
alter table public.ai_chat_logs enable row level security;

-- 按时间倒序查看最新问答(owner 抽查用)。
create index if not exists ai_chat_logs_created_idx
  on public.ai_chat_logs (created_at desc);
