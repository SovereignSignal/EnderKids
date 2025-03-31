import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Agent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings } from "lucide-react";

export function AgentList() {
  const [_, setLocation] = useLocation();
  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });

  const handleControlClick = (agentId: number) => {
    setLocation(`/agent/${agentId}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((id) => (
          <Card key={id} className="overflow-hidden">
            <CardHeader className="bg-[#26A69A] p-3 text-white">
              <Skeleton className="h-6 w-24 bg-white/30" />
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex items-start mb-4">
                <Skeleton className="h-16 w-16 rounded mr-3" />
                <div>
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="mb-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-full" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="text-center p-8 bg-white rounded-lg shadow-md">
        <h3 className="text-xl font-semibold mb-2">No Agents Yet</h3>
        <p className="text-gray-600 mb-4">
          You haven't created any agents yet. Create your first agent to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {agents.map((agent) => (
        <Card key={agent.id} className="overflow-hidden hover:shadow-lg transition-shadow">
          <CardHeader className={`p-3 text-white ${agent.type === 'miner' ? 'bg-[#825432]' : 'bg-[#26A69A]'}`}>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">{agent.name}</CardTitle>
              <Badge variant={agent.status === 'active' ? 'success' : agent.status === 'pending' ? 'warning' : 'secondary'}>
                {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex items-start mb-4">
              <div className="w-16 h-16 rounded bg-gray-200 mr-3 flex items-center justify-center">
                <svg className="h-10 w-10 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">ID: <span className="font-mono">agent_{agent.id}</span></p>
                <p className="text-sm text-gray-600">Created: {new Date(agent.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="mb-4">
              <h4 className="font-medium text-sm mb-1">Description:</h4>
              <p className="text-sm bg-gray-100 p-2 rounded">
                {agent.description || `A ${agent.type} agent`}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button 
                className="bg-[#26A69A] hover:bg-[#26A69A]/90 text-white shadow-inner" 
                onClick={() => handleControlClick(agent.id)}
                disabled={agent.status !== 'active'}
              >
                Control
              </Button>
              <Button variant="outline" className="text-gray-500 flex items-center">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
