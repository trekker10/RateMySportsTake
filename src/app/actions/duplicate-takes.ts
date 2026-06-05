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
    // Limit to 60 takes to keep context manageable; most recent first (already ordered)
    const takeSample = takes.slice(0, 60);
    const takeList = takeSample.map(t => `${t.take_id}\t${t.raw_text.slice(0, 200)}`).join("\n");

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: "You output only valid JSON. No prose, no markdown, no code fences. Just the raw JSON value.",
      messages: [
        {
          role: "user",
          content: `Find semantically duplicate sports takes below. Two takes are duplicates if they make essentially the same prediction, even if worded differently. Different opinions about the same topic are NOT duplicates.

Takes (take_id TAB text):
${takeList}

Output ONLY a raw JSON array of groups, with no explanation or markdown. Each group is an array of take_ids that are duplicates of each other. Only include groups with 2+ takes. If none found, output exactly: []

Example output: [["id-a","id-b"],["id-c","id-d","id-e"]]`,
        },
      ],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";
    // Strip markdown code fences if present
    const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    let semanticGroups: string[][] = [];
    try {
      semanticGroups = JSON.parse(stripped);
    } catch {
      // Try to extract just the array portion
      const jsonMatch = stripped.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try { semanticGroups = JSON.parse(jsonMatch[0]); } catch { /* no dupes found */ }
      }
    }

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
