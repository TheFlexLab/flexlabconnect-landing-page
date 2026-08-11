import UnsubscribeClient from "./UnsubscribeClient";

type UnsubscribePageProps = {
  searchParams: Promise<{
    token?: string | string[];
  }>;
};

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const params = await searchParams;
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = rawToken?.trim() || "";

  return <UnsubscribeClient token={token} />;
}
