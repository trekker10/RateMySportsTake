import type { Metadata } from "next";
import FeedbackForm from "./FeedbackForm";

export const metadata: Metadata = {
  title: "Send Feedback — RateMySportsTake",
  description: "Tell us what's working, what's missing, or what's broken.",
};

export default function FeedbackPage() {
  const INK = "#15201a";

  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "flex-start",
      padding: "16px 0 72px",
    }}>
      <div style={{
        maxWidth: 600,
        width: "100%",
        background: "#fff",
        border: `3px solid ${INK}`,
        boxShadow: `9px 9px 0 ${INK}`,
        padding: "42px 46px 46px",
      }}
        className="feedback-card"
      >
        <FeedbackForm />
      </div>

      <style>{`
        @media (max-width: 880px) {
          .feedback-card {
            padding: 30px 22px 34px !important;
            box-shadow: 6px 6px 0 #15201a !important;
          }
        }
      `}</style>
    </div>
  );
}
