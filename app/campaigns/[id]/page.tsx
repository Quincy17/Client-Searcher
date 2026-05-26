import { CampaignDetailClient } from "./CampaignDetailClient";

// Keep details dynamic so it polls the latest scraped leads accurately
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailsPage({ params }: PageProps) {
  const resolvedParams = await params;
  const sessionId = parseInt(resolvedParams.id, 10);

  return <CampaignDetailClient sessionId={sessionId} />;
}
