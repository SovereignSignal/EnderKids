import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Agent, Command } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MinecraftConnection } from "@/lib/minecraft";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ArrowLeft, Mic } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CommandHistoryItem {
  id: number;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
}

export function AgentControlPanel() {
  const { agentId } = useParams<{ agentId: string }>();
  const [_, setLocation] = useLocation();
  const [command, setCommand] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [worldName, setWorldName] = useState("");
  const [commandHistory, setCommandHistory] = useState<CommandHistoryItem[]>([]);
  const historyContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get agent details
  const { data: agent, isLoading: isLoadingAgent } = useQuery<Agent>({
    queryKey: [`/api/agents/${agentId}`],
  });

  // Get command history
  const { data: commands, isLoading: isLoadingCommands } = useQuery<Command[]>({
    queryKey: [`/api/commands/agent/${agentId}`],
    enabled: !!agentId,
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!agent || !agentId) return;
    
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
      
      // Subscribe to agent updates
      socket.send(JSON.stringify({
        type: 'subscribe',
        agentId: parseInt(agentId)
      }));
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle agent status updates
        if (data.type === 'agent_status' && data.agentId && data.status) {
          const status = data.status;
          
          setIsConnected(status.connected);
          
          if (status.position) {
            setPosition(status.position);
          }
          
          if (status.world) {
            setWorldName(status.world);
          }
          
          // Add agent responses to command history
          if (status.lastCommandResponse && status.lastCommandResponse !== '') {
            const existingResponseIndex = commandHistory.findIndex(
              item => item.type === 'bot' && item.content === status.lastCommandResponse
            );
            
            // Only add new responses
            if (existingResponseIndex === -1) {
              setCommandHistory(prev => [
                ...prev,
                {
                  id: Date.now(),
                  type: 'bot',
                  content: status.lastCommandResponse,
                  timestamp: new Date()
                }
              ]);
            }
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle errors
    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection error",
        description: "Could not connect to real-time service",
        variant: "destructive",
      });
    });
    
    // Handle connection close
    socket.addEventListener('close', () => {
      console.log('Disconnected from WebSocket server');
    });
    
    // Initially connect to Minecraft
    const connectToMinecraft = async () => {
      try {
        const minecraft = new MinecraftConnection();
        const agentStatus = await minecraft.getAgentStatus(agent.id);
        
        if (!agentStatus || !agentStatus.connected) {
          // Agent not connected, connect it
          const connectedAgent = await minecraft.connectAgent(agent.id, agent.name);
          setIsConnected(connectedAgent.connected);
          if (connectedAgent.position) {
            setPosition(connectedAgent.position);
          }
          if (connectedAgent.currentWorld) {
            setWorldName(connectedAgent.currentWorld);
          }
        } else {
          // Agent already connected
          setIsConnected(agentStatus.connected);
          if (agentStatus.position) {
            setPosition(agentStatus.position);
          }
          if (agentStatus.currentWorld) {
            setWorldName(agentStatus.currentWorld);
          }
        }
      } catch (error) {
        console.error("Failed to connect to Minecraft:", error);
        toast({
          title: "Connection failed",
          description: "Could not connect to Minecraft server",
          variant: "destructive",
        });
      }
    };
    
    connectToMinecraft();
    
    // Cleanup function to close WebSocket connection when component unmounts
    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [agent, agentId, toast, commandHistory]);

  // Process commands
  useEffect(() => {
    if (commands) {
      const history: CommandHistoryItem[] = [];
      
      commands.forEach((cmd) => {
        // Add user command
        history.push({
          id: cmd.id * 2 - 1,
          type: "user",
          content: cmd.command,
          timestamp: new Date(cmd.createdAt),
        });
        
        // Add bot response if available
        if (cmd.response) {
          history.push({
            id: cmd.id * 2,
            type: "bot",
            content: cmd.response,
            timestamp: new Date(cmd.createdAt),
          });
        }
      });
      
      // Sort by timestamp (newest last)
      history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setCommandHistory(history);
    }
  }, [commands]);

  // Auto-scroll to bottom when new commands are added
  useEffect(() => {
    if (historyContainerRef.current) {
      historyContainerRef.current.scrollTop = historyContainerRef.current.scrollHeight;
    }
  }, [commandHistory]);

  // Send command mutation
  const sendCommandMutation = useMutation({
    mutationFn: async (command: string) => {
      const response = await apiRequest("POST", "/api/commands", {
        agentId: parseInt(agentId),
        command,
      });
      return response.json();
    },
    onSuccess: (newCommand) => {
      setCommand("");
      queryClient.invalidateQueries({ queryKey: [`/api/commands/agent/${agentId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Command failed",
        description: error instanceof Error ? error.message : "Failed to send command",
        variant: "destructive",
      });
    },
  });

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    
    sendCommandMutation.mutate(command);
  };

  const handleQuickCommand = (cmd: string) => {
    sendCommandMutation.mutate(cmd);
  };

  const handleBackClick = () => {
    setLocation("/dashboard");
  };

  if (isLoadingAgent) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardHeader className="bg-[#26A69A] px-6 py-4 text-white">
            <Skeleton className="h-8 w-64 bg-white/30" />
          </CardHeader>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-full mb-6" />
            <Skeleton className="h-24 w-full mb-6" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="mb-8">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold mb-2">Agent Not Found</h2>
            <p className="text-gray-600 mb-4">The agent you're trying to control doesn't exist.</p>
            <Button onClick={handleBackClick}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <Card className="mb-8">
        <CardHeader className="bg-[#26A69A] px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Control {agent.name}</h2>
            <Button 
              variant="ghost" 
              className="bg-[#333333] hover:bg-[#333333]/90 text-white"
              onClick={handleBackClick}
            >
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Agent Status */}
          <div className="flex items-center mb-6">
            <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-700">
              {isConnected 
                ? `Online - Connected to "${worldName}"` 
                : "Offline - Not connected to a world"}
            </span>
          </div>
          
          {/* Agent Location */}
          <div className="bg-gray-100 p-4 rounded-md mb-6">
            <h3 className="font-medium mb-2">Current Location</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-gray-500">X</div>
                <div className="font-mono font-medium">{position.x}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Y</div>
                <div className="font-mono font-medium">{position.y}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Z</div>
                <div className="font-mono font-medium">{position.z}</div>
              </div>
            </div>
          </div>
          
          {/* Command Interface */}
          <div className="mb-6">
            <h3 className="font-medium mb-3">Send Command</h3>
            <form onSubmit={handleSendCommand} className="flex space-x-2">
              <div className="relative flex-grow">
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  placeholder="Type a command... (e.g., /build house)"
                  className="w-full border rounded py-2 px-3 focus:outline-none focus:ring-2 focus:ring-[#26A69A]"
                  disabled={!isConnected || sendCommandMutation.isPending}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className="text-[#26A69A] hover:text-[#26A69A]/80"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <Button 
                type="submit"
                className="bg-[#26A69A] hover:bg-[#26A69A]/90 shadow-inner"
                disabled={!isConnected || !command.trim() || sendCommandMutation.isPending}
              >
                {sendCommandMutation.isPending ? "Sending..." : "Send"}
              </Button>
            </form>
            
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-2">Quick Commands:</h4>
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickCommand("/come")}
                  disabled={!isConnected || sendCommandMutation.isPending}
                >
                  /come
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickCommand("/follow me")}
                  disabled={!isConnected || sendCommandMutation.isPending}
                >
                  /follow me
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickCommand("/build house")}
                  disabled={!isConnected || sendCommandMutation.isPending}
                >
                  /build house
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickCommand("/mine")}
                  disabled={!isConnected || sendCommandMutation.isPending}
                >
                  /mine
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleQuickCommand("/stop")}
                  disabled={!isConnected || sendCommandMutation.isPending}
                >
                  /stop
                </Button>
              </div>
            </div>
          </div>
          
          {/* Command History */}
          <div>
            <h3 className="font-medium mb-3">Command History</h3>
            <div 
              ref={historyContainerRef}
              className="bg-gray-100 rounded-md p-3 h-64 overflow-y-auto"
            >
              {isLoadingCommands ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : commandHistory.length === 0 ? (
                <div className="text-center text-gray-500 p-4">
                  No commands yet. Send your first command!
                </div>
              ) : (
                <div className="space-y-3">
                  {commandHistory.map((item) => (
                    <div key={item.id} className="flex">
                      <span className={`text-xs rounded px-2 py-1 mr-2 text-white ${
                        item.type === "user" ? "bg-[#26A69A]" : "bg-[#8BC34A]"
                      }`}>
                        {item.type === "user" ? "YOU" : "BOT"}
                      </span>
                      <div className="flex-grow">
                        <p className={`text-sm ${item.type === "user" ? "font-mono" : ""}`}>
                          {item.content}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
