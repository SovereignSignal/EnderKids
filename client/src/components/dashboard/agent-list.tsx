import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Agent } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Settings, Activity, Clock, MapPin } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AgentStatus {
  id: number;
  name: string;
  type: string;
  connected: boolean;
  world?: string;
  position?: { x: number; y: number; z: number };
  lastCommand?: string;
  lastCommandResponse?: string;
  connectTime?: number;
  currentActivity?: string;
}

export function AgentList() {
  const [_, setLocation] = useLocation();
  const [agentStatuses, setAgentStatuses] = useState<Map<number, AgentStatus>>(new Map());
  
  const { data: agents, isLoading } = useQuery<Agent[]>({
    queryKey: ["/api/agents"],
  });
  
  // Get connected agents
  const { data: connectedAgents } = useQuery<AgentStatus[]>({
    queryKey: ["/api/agents/server/connected"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });
  
  // Update agent statuses when connected agents data changes
  useEffect(() => {
    if (connectedAgents) {
      const statusMap = new Map<number, AgentStatus>();
      connectedAgents.forEach((agent) => {
        statusMap.set(agent.id, agent);
      });
      setAgentStatuses(statusMap);
    }
  }, [connectedAgents]);

  const handleControlClick = (agentId: number) => {
    setLocation(`/agent/${agentId}`);
  };
  
  // Format connection time
  const formatConnectionTime = (connectTime?: number): string => {
    if (!connectTime) return "Not connected";
    
    const now = Date.now();
    const diffMs = now - connectTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    
    if (diffHrs > 0) {
      return `${diffHrs}h ${diffMins % 60}m`;
    } else if (diffMins > 0) {
      return `${diffMins}m`;
    } else {
      return "Just now";
    }
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

  // Set up WebSocket connection for real-time updates
  useEffect(() => {
    // Check if WebSocket is supported by the browser
    if (!('WebSocket' in window)) {
      console.error('WebSockets not supported');
      return;
    }
    
    // Create WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    
    // Connection opened
    socket.addEventListener('open', () => {
      console.log('Connected to WebSocket server');
      
      // Subscribe to all agent updates
      if (agents) {
        agents.forEach(agent => {
          socket.send(JSON.stringify({
            type: 'subscribe',
            agentId: agent.id
          }));
        });
      }
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle agent status updates
        if (data.type === 'agent_status' && data.agentId && data.status) {
          setAgentStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(data.agentId, {
              id: data.agentId,
              name: agents?.find(a => a.id === data.agentId)?.name || `Agent ${data.agentId}`,
              type: agents?.find(a => a.id === data.agentId)?.type || 'unknown',
              connected: data.status.connected,
              world: data.status.world,
              position: data.status.position,
              currentActivity: data.status.lastAction,
              connectTime: data.status.timeConnected
            });
            return newMap;
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle errors
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    // Handle connection close
    socket.addEventListener('close', () => {
      console.log('Disconnected from WebSocket server');
    });
    
    // Cleanup function to close WebSocket connection when component unmounts
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [agents]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      {agents.map((agent) => {
        const agentStatus = agentStatuses.get(agent.id);
        const isConnected = agentStatus?.connected || false;
        
        return (
          <Card key={agent.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className={`p-3 text-white ${agent.type === 'miner' ? 'bg-[#825432]' : agent.type === 'farmer' ? 'bg-[#558B2F]' : agent.type === 'explorer' ? 'bg-[#1565C0]' : 'bg-[#26A69A]'}`}>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">{agent.name}</CardTitle>
                <div className="flex gap-2">
                  {isConnected && (
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      Online
                    </Badge>
                  )}
                  <Badge variant={agent.status === 'active' ? 'success' : agent.status === 'pending' ? 'warning' : 'secondary'}>
                    {agent.status.charAt(0).toUpperCase() + agent.status.slice(1)}
                  </Badge>
                </div>
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
              
              {/* Connection and status information */}
              {isConnected && (
                <div className="mb-4 space-y-2 bg-gray-50 p-2 rounded-md">
                  {agentStatus?.world && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-1 text-blue-500" />
                      <span>World: {agentStatus.world}</span>
                    </div>
                  )}
                  {agentStatus?.position && (
                    <div className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 mr-1 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 3L3 10.53v.98l6.84 2.65L12.48 21h.98L21 3z" />
                      </svg>
                      <span>Position: {Math.round(agentStatus.position.x)}, {Math.round(agentStatus.position.y)}, {Math.round(agentStatus.position.z)}</span>
                    </div>
                  )}
                  {agentStatus?.currentActivity && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Activity className="h-4 w-4 mr-1 text-purple-500" />
                      <span>Activity: {agentStatus.currentActivity}</span>
                    </div>
                  )}
                  {agentStatus?.connectTime && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-1 text-green-500" />
                      <span>Connected: {formatConnectionTime(agentStatus.connectTime)}</span>
                    </div>
                  )}
                </div>
              )}
              
              <div className="mb-4">
                <h4 className="font-medium text-sm mb-1">Description:</h4>
                <p className="text-sm bg-gray-100 p-2 rounded">
                  {agent.description || `A ${agent.type} agent`}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  className={`${isConnected ? 'bg-green-600 hover:bg-green-700' : 'bg-[#26A69A] hover:bg-[#26A69A]/90'} text-white shadow-inner`}
                  onClick={() => handleControlClick(agent.id)}
                  disabled={agent.status !== 'active'}
                >
                  {isConnected ? 'Control Now' : 'Control'}
                </Button>
                <Button variant="outline" className="text-gray-500 flex items-center">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
