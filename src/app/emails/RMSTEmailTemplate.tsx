import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Img,
  Heading,
  Text,
  Button,
  Hr,
  Font,
} from "@react-email/components";

export interface RMSTEmailTemplateProps {
  previewText?: string;
  heroImageUrl?: string;
  heading?: string;
  body?: string;
  ctaText?: string;
  ctaUrl?: string;
  fromName?: string;
  unsubscribeUrl?: string;
}

export function RMSTEmailTemplate({
  previewText = "",
  heroImageUrl = "",
  heading = "",
  body = "",
  ctaText = "VISIT RATE/MY/SPORTS/TAKE",
  ctaUrl = "https://ratemysportstake.com",
  unsubscribeUrl = "https://ratemysportstake.com/unsubscribe",
}: RMSTEmailTemplateProps) {
  return (
    <Html lang="en">
      <Head>
        <Font
          fontFamily="Arial"
          fallbackFontFamily="sans-serif"
        />
      </Head>
      {previewText && <Preview>{previewText}</Preview>}
      <Body style={{ backgroundColor: "#f3f4f6", margin: 0, padding: "32px 0", fontFamily: "Arial, sans-serif" }}>
        <Container style={{ maxWidth: 560, margin: "0 auto", backgroundColor: "#ffffff", border: "2px solid #15201a" }}>

          {/* Header / Logo */}
          <Section style={{ backgroundColor: "#15201a", padding: "16px 24px" }}>
            <Text style={{ margin: 0, fontFamily: "Arial Black, Arial, sans-serif", fontWeight: 900, fontSize: 16, letterSpacing: "0.05em", color: "#ffffff" }}>
              RATE/MY/SPORTS/TAKE
            </Text>
          </Section>

          {/* Hero image */}
          {heroImageUrl ? (
            <Section style={{ padding: 0 }}>
              <Img src={heroImageUrl} alt="" width="100%" style={{ display: "block", width: "100%" }} />
            </Section>
          ) : null}

          {/* Body */}
          <Section style={{ padding: "32px 32px 24px" }}>
            {heading && (
              <Heading
                as="h1"
                style={{
                  margin: "0 0 16px",
                  fontFamily: "Arial Black, Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: 26,
                  letterSpacing: "-0.02em",
                  color: "#15201a",
                  lineHeight: 1.15,
                }}
              >
                {heading}
              </Heading>
            )}
            {body && body.split("\n").map((line, i) =>
              line.trim() === "" ? null : (
                <Text key={i} style={{ margin: "0 0 14px", fontSize: 15, lineHeight: 1.6, color: "#3a4239" }}>
                  {line}
                </Text>
              )
            )}
            {ctaText && ctaUrl && (
              <Button
                href={ctaUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: "#e2241a",
                  color: "#ffffff",
                  fontFamily: "Arial Black, Arial, sans-serif",
                  fontWeight: 900,
                  fontSize: 13,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  padding: "14px 28px",
                  textDecoration: "none",
                  borderRadius: 0,
                }}
              >
                {ctaText}
              </Button>
            )}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: "#e5e7eb", margin: 0 }} />
          <Section style={{ padding: "16px 32px" }}>
            <Text style={{ margin: 0, fontSize: 11, color: "#9ca3af", textAlign: "center" as const }}>
              © Rate/My/Sports/Take ·{" "}
              <a href={unsubscribeUrl} style={{ color: "#9ca3af" }}>
                Unsubscribe
              </a>
            </Text>
          </Section>

        </Container>
      </Body>
    </Html>
  );
}
