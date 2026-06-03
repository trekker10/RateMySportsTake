import Link from "next/link";
import Avatar from "@/components/Avatar";
import { scoreToGrade, gradeColor, type TakeScoreConfig } from "@/lib/takescore";
import { expertUrl } from "@/lib/expert-url";

interface RibbonExpert {
  expert_id: string;
  slug: string | null;
  name: string;
  overall_rating: number;
  avatar_url: string | null;
  outlet: string | null;
}

interface Props {
  experts: RibbonExpert[];
  gradeConfig: TakeScoreConfig;
}

// Deterministic pastel bg for monogram avatars
const PASTELS = ["#fde68a", "#a7f3d0", "#bfdbfe", "#fca5a5", "#ddd6fe", "#fed7aa", "#fbcfe8"];
function monoColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PASTELS[Math.abs(h) % PASTELS.length];
}

function rankColor(rank: number): string {
  if (rank <= 3) return "#e2241a";
  if (rank <= 7) return "#1a1a1a";
  return "#c4bda8";
}

function splitName(full: string): [string, string] {
  const parts = full.trim().split(" ");
  if (parts.length === 1) return [parts[0], ""];
  const last = parts.pop()!;
  return [parts.join(" "), last];
}

export default function LeaderboardRibbon({ experts, gradeConfig }: Props) {
  const top10 = experts.slice(0, 10);
  if (top10.length === 0) return null;

  // Render cards twice for the seamless infinite loop
  const cards = (ariaHidden?: boolean) =>
    top10.map((expert, i) => {
      const rank = i + 1;
      const grade = scoreToGrade(expert.overall_rating, gradeConfig);
      const gColor = gradeColor(grade);
      const [first, last] = splitName(expert.name);
      const bgColor = monoColor(expert.name);

      return (
        <Link
          key={ariaHidden ? `dup-${expert.expert_id}` : expert.expert_id}
          href={expertUrl(expert)}
          className="ribbon-card"
          aria-hidden={ariaHidden ? "true" : undefined}
          tabIndex={ariaHidden ? -1 : undefined}
        >
          {/* Letter grade — top-right corner */}
          <span className="ribbon-grade" style={{ color: gColor }}>{grade}</span>

          {/* Rank numeral */}
          <div className="ribbon-rank" style={{ color: rankColor(rank) }}>
            {String(rank).padStart(2, "0")}
          </div>

          {/* Portrait */}
          <div className="ribbon-avatar" style={{ backgroundColor: bgColor }}>
            <Avatar
              name={expert.name}
              avatarUrl={expert.avatar_url}
              className="w-full h-full object-cover"
              textClassName="ribbon-avatar-initials"
            />
          </div>

          {/* Name + CTA */}
          <div className="ribbon-meta">
            <div className="ribbon-name">
              {first}{last && <><br />{last}</>}
            </div>
            <div className="ribbon-prof">
              VIEW PROFILE
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M1 11L11 1M11 1H4M11 1V8" />
              </svg>
            </div>
          </div>
        </Link>
      );
    });

  return (
    <section className="ribbon-section" aria-label="Current standings — top analysts">
      {/* Header row */}
      <div className="ribbon-head">
        <div className="ribbon-title">
          CURRENT STANDINGS
          <span className="ribbon-live">
            <span className="ribbon-dot" aria-hidden="true" />
            LIVE
          </span>
        </div>
        <div className="ribbon-sub">top 10 analysts · ranked by TakeScore</div>
      </div>

      {/* Scrolling track */}
      <div className="ribbon-track-mask">
        <div className="ribbon-track">
          {cards()}
          {cards(true)}
        </div>
      </div>
    </section>
  );
}
