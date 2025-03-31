import { useQuery } from "@tanstack/react-query";

interface AgentStats {
  activeAgents: number;
  pendingRequests: number;
  totalCommands: number;
}

export function AgentStats() {
  const { data: stats, isLoading } = useQuery<AgentStats>({
    queryKey: ["/api/stats"],
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-700">Active Agents</h3>
          <span className="text-2xl text-[#26A69A]">
            {isLoading ? "..." : stats?.activeAgents || 0}
          </span>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-700">Pending Requests</h3>
          <span className="text-2xl text-[#FF9800]">
            {isLoading ? "..." : stats?.pendingRequests || 0}
          </span>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-gray-700">Total Commands</h3>
          <span className="text-2xl text-[#8BC34A]">
            {isLoading ? "..." : stats?.totalCommands || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
