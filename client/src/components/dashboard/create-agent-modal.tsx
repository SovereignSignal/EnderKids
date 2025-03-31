import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Construction, Pickaxe } from "lucide-react";

interface CreateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const agentSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }).max(50),
  type: z.enum(["builder", "miner", "farmer", "explorer"]),
  description: z.string().optional(),
});

type AgentFormValues = z.infer<typeof agentSchema>;

export function CreateAgentModal({ isOpen, onClose }: CreateAgentModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: "",
      type: "builder",
      description: "",
    },
  });

  const createAgentMutation = useMutation({
    mutationFn: async (data: AgentFormValues) => {
      const response = await apiRequest("POST", "/api/agents", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      form.reset();
      onClose();
      toast({
        title: "Agent requested",
        description: "Your agent request has been submitted for approval!",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create agent",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (values: AgentFormValues) => {
    createAgentMutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">Create New Agent</DialogTitle>
          <DialogDescription className="text-center">
            Submit a request for a new Minecraft agent.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., BuilderBot" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Type</FormLabel>
                  <FormControl>
                    <RadioGroup 
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-4"
                    >
                      <FormItem className="flex flex-col items-center space-y-2 border rounded p-3 cursor-pointer hover:bg-gray-50">
                        <FormControl>
                          <RadioGroupItem value="builder" className="sr-only" />
                        </FormControl>
                        <Construction className="h-8 w-8 text-[#26A69A]" />
                        <FormLabel className="font-medium">Builder</FormLabel>
                      </FormItem>
                      
                      <FormItem className="flex flex-col items-center space-y-2 border rounded p-3 cursor-pointer hover:bg-gray-50">
                        <FormControl>
                          <RadioGroupItem value="miner" className="sr-only" />
                        </FormControl>
                        <Pickaxe className="h-8 w-8 text-[#825432]" />
                        <FormLabel className="font-medium">Miner</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="What will this agent do?"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="bg-[#FF9800] hover:bg-[#FF9800]/90 shadow-inner"
                disabled={createAgentMutation.isPending}
              >
                {createAgentMutation.isPending ? "Requesting..." : "Request Agent"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
