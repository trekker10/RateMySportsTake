"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const client = new Anthropic();

export interface DuplicateGroup {
  reason: "same_url" | "semantic";
  label: string;
  takes: { take_id: string; date_made: string; raw_text: string; source_url: string | null }[];
}

export async function checkDuplicateTakes(expertId: string): Promise<{
  success: boolean;
  groups?: DuplicateGroup[];
  error?: string;
}> {
  try {
    const supabase = createAdminClient();
    const { data: takes } = await supabase
      .from("takes")
      .select("take_id, raw_text, source_url, date_made")
      .eq("expert_id", expertId)
      .order("date_made", { ascending: false });

    if (!takes || takes.length === 0) return { success: true, groups: [] };

    const groups: DuplicateGroup[] = [];

    // ── 1. Same source URL ───────────────────────────────────────────────
    const byUrl = new Map<string, typeof takes>();
    for (const t of takes) {
      if (!t.source_url) continue;
      const key = t.source_url.trim().toLowerCase();
      if (!byUrl.has(key)) byUrl.set(key, []);
      byUrl.get(key)!.push(t);
    }
    for (const [url, group] of byUrl) {
      if (group.length > 1) {
        groups.push({
          reason: "same_url",
          label: `Same source URL: ${url}`,
          takes: group.map(t => ({
            take_id: t.take_id,
            date_made: t.date_made,
            raw_text: t.raw_text,
            source_url: t.source_url,
          })),
        });
      }
    }

    // ── 2. Semantic duplicates via AI ────────────────────────────────────
    const takeList = takes.map((t, i) => `[${i}] (${t.take_id}) ${t.raw_text}`).join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are reviewing sports takes from the same analyst for semantic duplicates.

Two takes are duplicates if they make essentially the same prediction or claim, even if worded differently. Minor differences in phrasing ("win in 6" vs "take care of business and win the series in 6") count as duplicates. Different predictions about the same topic do NOT count.

Here are the takes (index and take_id in parentheses):
${takeList}

Return ONLY a JSON array of duplicate groups. Each group is an array of take_ids that are semantically equivalent. Only include groups with 2+ takes. If none found, return [].

Example: [["uuid-a","uuid-b"],["uuid-c","uuid-d","uuid-e"]]

JSON only, no explanation:`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
    // Extract JSON array even if wrapped in markdown
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const semanticGroups: string[][] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    for (const ids of semanticGroups) {
      if (ids.length < 2) continue;
      const groupTakes = ids
        .map(id => takes.find(t => t.take_id === id))
        .filter((t): t is NonNullable<typeof t> => !!t);
      if (groupTakes.length < 2) continue;
      groups.push({
        reason: "semantic",
        label: "Semantically similar takes",
        takes: groupTakes.map(t => ({
          take_id: t.take_id,
          date_made: t.date_made,
          raw_text: t.raw_text,
          source_url: t.source_url,
        })),
      });
    }

    return { success: true, groups };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
