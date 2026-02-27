import { useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";

export default function PublicSmartLinkRedirect() {
  const { slug } = useParams();
  const location = useLocation();

  const redirectUrl = useMemo(() => {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    if (!projectId || !slug) return "";

    const params = new URLSearchParams(location.search);
    params.set("slug", slug);
    params.set("domain", window.location.hostname.toLowerCase());

    return `https://${projectId}.supabase.co/functions/v1/redirect?${params.toString()}`;
  }, [slug, location.search]);

  useEffect(() => {
    if (!redirectUrl) return;
    // Redirect immediately — don't wait for anything
    window.location.replace(redirectUrl);
  }, [redirectUrl]);

  // Minimal loading UI — user should barely see this
  return (
    <main className="min-h-screen bg-background flex items-center justify-center">
      {!redirectUrl ? (
        <p className="text-xs text-destructive">Link inválido.</p>
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      )}
    </main>
  );
}