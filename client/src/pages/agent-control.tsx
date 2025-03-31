import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { AgentControlPanel } from "@/components/agent/agent-control-panel";

export default function AgentControl() {
  const { agentId } = useParams<{ agentId: string }>();
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Redirect to home if not logged in
    if (!isLoading && !user) {
      setLocation("/");
    }
  }, [user, isLoading, setLocation]);

  // Show loading state if checking auth
  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-64px-100px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#26A69A]"></div>
      </div>
    );
  }

  // Don't render if not logged in
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <AgentControlPanel />
    </div>
  );
}
