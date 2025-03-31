import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/auth-context";
import { AgentStats } from "@/components/dashboard/agent-stats";
import { AgentList } from "@/components/dashboard/agent-list";
import { PendingRequestsList } from "@/components/dashboard/pending-requests";
import { CreateAgentModal } from "@/components/dashboard/create-agent-modal";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const [_, setLocation] = useLocation();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

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

  // Don't render the dashboard if not logged in
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Welcome Banner */}
      <div className="bg-[#5B8731] rounded-lg p-6 mb-8 text-white shadow-lg">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome to BlockBots!</h1>
        <p className="mb-4">Create and manage your Minecraft agents to help you build amazing worlds.</p>
        <Button 
          className="bg-[#FF9800] hover:bg-[#FF9800]/90 text-white shadow-inner"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-5 w-5 mr-1" /> Create New Agent
        </Button>
      </div>

      {/* Agent Statistics */}
      <AgentStats />

      {/* Agent List */}
      <h2 className="text-xl font-bold mb-4 border-b pb-2">My Agents</h2>
      <AgentList />

      {/* Pending Requests (Admin Only) */}
      {user.isAdmin && (
        <>
          <h2 className="text-xl font-bold mb-4 border-b pb-2">Pending Requests</h2>
          <PendingRequestsList />
        </>
      )}

      {/* Create Agent Modal */}
      <CreateAgentModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
      />
    </div>
  );
}
