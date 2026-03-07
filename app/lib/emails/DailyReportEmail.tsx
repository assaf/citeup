import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type {
  BotInsight,
  BotVisit,
  User,
  Account,
  Site,
} from "~/prisma";

interface DailyReportEmailProps {
  newUsers: User[];
  newSitesWithMetrics: Array<{
    site: Site & { account: Account & { users: User[] } };
    topBotVisits: BotVisit[];
    citationScores: { current: number; previous: number };
  }>;
  botInsights: (BotInsight & { site: Site })[];
  generatedAt: Date;
}

export default function DailyReportEmail({
  newUsers,
  newSitesWithMetrics,
  botInsights,
  generatedAt,
}: DailyReportEmailProps) {
  const formattedDate = new Date(generatedAt).toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
  });

  const botInsightMap = new Map(
    botInsights.map((insight) => [insight.siteId, insight])
  );

  return (
    <Html lang="en">
      <Head />
      <Preview>CiteUp Daily Report - {formattedDate}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={heading}>CiteUp Daily Report</Text>
            <Text style={subheading}>Generated: {formattedDate}</Text>
          </Section>

          {/* New Users Section */}
          {newUsers.length > 0 ? (
            <Section style={section}>
              <Text style={sectionHeading}>New Users (Past 24h)</Text>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={tableTh}>Email</th>
                    <th style={tableTh}>Account ID</th>
                    <th style={tableTh}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {newUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={tableTd}>{user.email}</td>
                      <td style={tableTd}>{user.accountId}</td>
                      <td style={tableTd}>
                        {user.createdAt.toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          ) : (
            <Section style={section}>
              <Text style={sectionHeading}>New Users (Past 24h)</Text>
              <Text style={emptyText}>None in the past 24 hours.</Text>
            </Section>
          )}

          {/* New Sites Section */}
          {newSitesWithMetrics.length > 0 ? (
            <Section style={section}>
              <Text style={sectionHeading}>New Sites (Past 24h)</Text>
              {newSitesWithMetrics.map(
                ({ site, topBotVisits, citationScores }) => {
                  const insight = botInsightMap.get(site.id);
                  const change = citationScores.current - citationScores.previous;
                  const changePercent =
                    citationScores.previous === 0
                      ? citationScores.current > 0
                        ? 100
                        : 0
                      : (change / citationScores.previous) * 100;

                  return (
                    <Section key={site.id} style={siteCard}>
                      <Text style={siteDomain}>{site.domain}</Text>
                      <Text style={accountInfo}>
                        Account: {site.account.id} | Users:{" "}
                        {site.account.users.map((u: User) => u.email).join(", ")}
                      </Text>

                      {topBotVisits.length > 0 && (
                        <>
                          <Text style={subSectionHeading}>
                            Top Bot Visits
                          </Text>
                          <ul style={botVisitsList}>
                            {topBotVisits.map((visit) => (
                              <li key={visit.id} style={botVisitItem}>
                                {visit.botType}: {visit.count} visits
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {insight && (
                        <>
                          <Text style={subSectionHeading}>
                            Bot Insight (Updated today)
                          </Text>
                          <Text style={insightText}>
                            {insight.content.split("\n").slice(0, 2).join(" ")}
                          </Text>
                        </>
                      )}

                      <Hr style={sectionDivider} />
                    </Section>
                  );
                }
              )}
            </Section>
          ) : (
            <Section style={section}>
              <Text style={sectionHeading}>New Sites (Past 24h)</Text>
              <Text style={emptyText}>None in the past 24 hours.</Text>
            </Section>
          )}

          {/* Account Metrics Section */}
          <Section style={section}>
            <Text style={sectionHeading}>
              Account Metrics (Citation Query Score)
            </Text>
            {newSitesWithMetrics.map(({ site, citationScores }) => {
              const change = citationScores.current - citationScores.previous;
              const changePercent =
                citationScores.previous === 0
                  ? citationScores.current > 0
                    ? 100
                    : 0
                  : (change / citationScores.previous) * 100;
              const changeColor =
                change > 0 ? "#28a745" : change < 0 ? "#dc3545" : "#6c757d";

              return (
                <Section key={site.id} style={metricCard}>
                  <Row>
                    <Text style={{ ...accountName, margin: 0 }}>
                      {site.account.hostname || site.account.id}
                    </Text>
                  </Row>
                  <Row>
                    <Text style={metricText}>
                      Current:{" "}
                      <strong>{citationScores.current}</strong> | Previous 24h:{" "}
                      {citationScores.previous}
                    </Text>
                  </Row>
                  <Row>
                    <Text style={{ ...metricText, color: changeColor }}>
                      Change: {change > 0 ? "+" : ""}
                      {change} ({changePercent > 0 ? "+" : ""}
                      {changePercent.toFixed(2)}%)
                    </Text>
                  </Row>
                </Section>
              );
            })}
          </Section>

          {/* Footer */}
          <Hr style={footerDivider} />
          <Section style={footer}>
            <Text style={footerText}>
              This is an automated report sent daily at 6 AM Pacific. Do not
              reply to this email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/* Styles using TailwindCSS 4.0 utility values */
const main = {
  backgroundColor: "#ffffff",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
};

const container = {
  maxWidth: "640px",
  margin: "0 auto",
  padding: "20px 0",
};

const header = {
  textAlign: "center" as const,
  paddingBottom: "20px",
};

const heading = {
  fontSize: "32px",
  fontWeight: 700,
  margin: "0 0 8px 0",
  color: "#1a1a1a",
  borderBottom: "2px solid #0066cc",
  paddingBottom: "10px",
};

const subheading = {
  fontSize: "14px",
  color: "#666666",
  margin: "8px 0 0 0",
};

const section = {
  marginBottom: "30px",
  paddingBottom: "20px",
};

const sectionHeading = {
  fontSize: "20px",
  fontWeight: 600,
  color: "#333333",
  marginBottom: "15px",
  margin: "0 0 15px 0",
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  margin: "15px 0",
};

const tableTh = {
  backgroundColor: "#f5f5f5",
  fontWeight: 600,
  textAlign: "left" as const,
  padding: "10px",
  borderBottom: "1px solid #dddddd",
  fontSize: "14px",
};

const tableTd = {
  padding: "10px",
  borderBottom: "1px solid #dddddd",
  fontSize: "14px",
};

const siteCard = {
  backgroundColor: "#f9f9f9",
  padding: "15px",
  marginBottom: "15px",
  borderRadius: "4px",
};

const siteDomain = {
  fontSize: "16px",
  fontWeight: 600,
  margin: "0 0 8px 0",
};

const accountInfo = {
  fontSize: "12px",
  color: "#666666",
  margin: "0 0 12px 0",
};

const subSectionHeading = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#333333",
  margin: "12px 0 8px 0",
};

const botVisitsList = {
  margin: "8px 0",
  paddingLeft: "20px",
};

const botVisitItem = {
  fontSize: "13px",
  color: "#555555",
  margin: "4px 0",
};

const insightText = {
  fontSize: "13px",
  color: "#555555",
  margin: "8px 0",
  lineHeight: "1.5",
};

const sectionDivider = {
  borderTop: "1px solid #eeeeee",
  margin: "15px 0",
};

const metricCard = {
  backgroundColor: "#f9f9f9",
  padding: "15px",
  marginBottom: "15px",
  borderRadius: "4px",
};

const accountName = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#1a1a1a",
};

const metricText = {
  fontSize: "13px",
  color: "#555555",
  margin: "4px 0",
};

const footerDivider = {
  borderTop: "1px solid #eeeeee",
  margin: "30px 0 20px 0",
};

const footer = {
  textAlign: "center" as const,
};

const footerText = {
  fontSize: "12px",
  color: "#999999",
  fontStyle: "italic" as const,
  margin: "0",
};

const emptyText = {
  fontSize: "14px",
  color: "#999999",
  fontStyle: "italic" as const,
};
