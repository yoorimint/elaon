import { supabase } from "./supabase";

export type BotConfig = {
  id: number;
  enabled: boolean;
  daily_count: number;
  window_start_hour: number;
  window_end_hour: number;
  bot_user_id: string | null;
  post_counter: number;
  updated_at: string;
};

export async function getBotConfig(): Promise<BotConfig | null> {
  const { data, error } = await supabase
    .from("bot_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BotConfig | null) ?? null;
}

export async function updateBotConfig(patch: Partial<BotConfig>): Promise<void> {
  const { error } = await supabase
    .from("bot_config")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
}

export type BotPostRow = {
  id: string;
  slug: string;
  title: string;
  body: string;
  backtest_slug: string | null;
  comment_count: number;
  created_at: string;
};

export async function listBotPosts(limit = 100): Promise<BotPostRow[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id,slug,title,body,backtest_slug,comment_count,created_at")
    .eq("category", "bot")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []) as BotPostRow[];
}

export async function updateBotPost(
  id: string,
  patch: { title?: string; body?: string },
): Promise<void> {
  const { error } = await supabase.from("posts").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteBotPost(id: string): Promise<void> {
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
