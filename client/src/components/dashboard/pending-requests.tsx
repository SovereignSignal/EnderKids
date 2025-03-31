import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Agent } from "@shared/schema";
import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PendingRequestsList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: pendingAgents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents/pending"],
    enabled: !!user?.isAdmin,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await apiRequest("PATCH", `/api/agents/${id}/status`, { status });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
    },
  });

  const handleApprove = async (agentId: number) => {
    try {
      await updateStatusMutation.mutateAsync({ id: agentId, status: "active" });
      toast({
        title: "Agent approved",
        description: "The agent request has been approved and is now active.",
      });
    } catch (error) {
      toast({
        title: "Approval failed",
        description: "There was an error approving the agent.",
        variant: "destructive",
      });
    }
  };

  const handleDecline = async (agentId: number) => {
    try {
      await updateStatusMutation.mutateAsync({ id: agentId, status: "inactive" });
      toast({
        title: "Agent declined",
        description: "The agent request has been declined.",
      });
    } catch (error) {
      toast({
        title: "Decline failed",
        description: "There was an error declining the agent.",
        variant: "destructive",
      });
    }
  };

  if (!user?.isAdmin) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden mb-8">
        <div className="p-4">
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full mb-4" />
          <Skeleton className="h-8 w-full" />
        </div>
      </Card>
    );
  }

  if (!pendingAgents || pendingAgents.length === 0) {
    return (
      <div className="text-center p-6 bg-white rounded-lg shadow-md mb-8">
        <h3 className="text-lg font-semibold">No Pending Requests</h3>
        <p className="text-gray-600 mt-2">There are no agent requests waiting for approval.</p>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden mb-8">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User ID</TableHead>
            <TableHead>Agent Type</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingAgents.map((agent) => (
            <TableRow key={agent.id}>
              <TableCell>
                <div className="font-medium">User {agent.userId}</div>
              </TableCell>
              <TableCell>
                <div className="capitalize">{agent.type}</div>
              </TableCell>
              <TableCell>{agent.name}</TableCell>
              <TableCell>
                {new Date(agent.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <Badge variant="warning">Pending</Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  className="mr-2 bg-green-500 hover:bg-green-600 text-white shadow-inner border-0"
                  onClick={() => handleApprove(agent.id)}
                  disabled={updateStatusMutation.isPending}
                >
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-red-500 hover:bg-red-600 text-white shadow-inner border-0"
                  onClick={() => handleDecline(agent.id)}
                  disabled={updateStatusMutation.isPending}
                >
                  Decline
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
