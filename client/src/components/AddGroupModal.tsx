import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, Plus } from "lucide-react";

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

type GroupFormData = z.infer<typeof groupSchema>;

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddGroupModal({ isOpen, onClose }: AddGroupModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [members, setMembers] = useState<{ name: string; email?: string }[]>([
    { name: "", email: "" }
  ]);

  const form = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      // Create the group first
      const group = await apiRequest("POST", "/api/groups", data) as any;
      
      // Add members to the group
      const validMembers = members.filter(member => member.name.trim());
      if (validMembers.length > 0) {
        await Promise.all(
          validMembers.map(member =>
            apiRequest("POST", `/api/groups/${group.id}/members`, {
              name: member.name.trim(),
              email: member.email?.trim() || null,
            })
          )
        );
      }
      
      return group;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Group created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      form.reset();
      setMembers([{ name: "", email: "" }]);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to create group. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addMember = () => {
    setMembers([...members, { name: "", email: "" }]);
  };

  const removeMember = (index: number) => {
    if (members.length > 1) {
      setMembers(members.filter((_, i) => i !== index));
    }
  };

  const updateMember = (index: number, field: 'name' | 'email', value: string) => {
    const updatedMembers = [...members];
    updatedMembers[index] = { ...updatedMembers[index], [field]: value };
    setMembers(updatedMembers);
  };

  const onSubmit = (data: GroupFormData) => {
    createGroupMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-add-group">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter group name"
                      {...field}
                      data-testid="input-group-name"
                    />
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
                    <Input
                      placeholder="What's this group for?"
                      {...field}
                      data-testid="input-group-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Group Members</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addMember}
                  data-testid="button-add-member"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Member
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {members.map((member, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder="Member name"
                      value={member.name}
                      onChange={(e) => updateMember(index, 'name', e.target.value)}
                      className="flex-1"
                      data-testid={`input-member-name-${index}`}
                    />
                    <Input
                      placeholder="Email (optional)"
                      value={member.email || ''}
                      onChange={(e) => updateMember(index, 'email', e.target.value)}
                      className="flex-1"
                      data-testid={`input-member-email-${index}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeMember(index)}
                      disabled={members.length === 1}
                      data-testid={`button-remove-member-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={onClose}
                data-testid="button-cancel-group"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                disabled={createGroupMutation.isPending}
                data-testid="button-submit-group"
              >
                {createGroupMutation.isPending ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}