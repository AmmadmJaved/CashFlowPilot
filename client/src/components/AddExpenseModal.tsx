import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useProfile } from "@/hooks/useProfile";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GroupWithMembers } from "@shared/schema";
import { Users } from "lucide-react";

const expenseSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
  paidBy: z.string().min(1, "Paid by is required"),
  groupId: z.string().optional(),
  isShared: z.boolean().default(false),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupWithMembers[];
}

export default function AddExpenseModal({ isOpen, onClose, groups }: AddExpenseModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: "",
      description: "",
      category: "other",
      date: new Date().toISOString().split('T')[0],
      paidBy: profile?.publicName || "",
      groupId: "",
      isShared: false,
    },
  });

  // Update default values when profile loads
  React.useEffect(() => {
    if (profile?.publicName && !form.getValues().paidBy) {
      form.setValue("paidBy", profile.publicName);
    }
  }, [profile, form]);

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      return await apiRequest("POST", "/api/transactions", {
        ...data,
        type: "expense",
        amount: data.amount,
        groupId: data.isShared && data.groupId ? data.groupId : null,
        isShared: data.isShared,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/monthly"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: "Failed to add expense. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-add-expense">
        <DialogHeader>
          <DialogTitle>Add New Expense</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      data-testid="input-expense-amount"
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What did you spend on?"
                      {...field}
                      data-testid="input-expense-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="food">Food & Dining</SelectItem>
                      <SelectItem value="utilities">Utilities</SelectItem>
                      <SelectItem value="entertainment">Entertainment</SelectItem>
                      <SelectItem value="transportation">Transportation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      data-testid="input-expense-date"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paidBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Who paid for this expense?"
                      {...field}
                      data-testid="input-expense-paid-by"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isShared"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Split with Group</FormLabel>
                    <div className="text-sm text-gray-500">
                      Share this expense with group members
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-expense-shared"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {form.watch("isShared") && (
              <>
                <FormField
                  control={form.control}
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select Group</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedMembers([]); // Reset selected members when group changes
                        }} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-expense-group">
                            <SelectValue placeholder="Choose a group" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {groups.map((group) => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("groupId") && (
                  <div className="space-y-3">
                    <Label className="flex items-center">
                      <Users className="w-4 h-4 mr-2" />
                      Select Members to Split With
                    </Label>
                    <div className="border rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                      {(() => {
                        const selectedGroup = groups.find(g => g.id === form.watch("groupId"));
                        return selectedGroup?.members?.map((member) => (
                          <div key={member.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`member-${member.id}`}
                              checked={selectedMembers.includes(member.name)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedMembers([...selectedMembers, member.name]);
                                } else {
                                  setSelectedMembers(selectedMembers.filter(m => m !== member.name));
                                }
                              }}
                              data-testid={`checkbox-member-${member.id}`}
                            />
                            <Label 
                              htmlFor={`member-${member.id}`} 
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {member.name}
                              {member.email && (
                                <span className="text-gray-500 ml-1">({member.email})</span>
                              )}
                            </Label>
                          </div>
                        )) || <p className="text-sm text-gray-500">No members in this group</p>;
                      })()}
                    </div>
                    {selectedMembers.length > 0 && (
                      <p className="text-sm text-blue-600">
                        Splitting with {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''}: {selectedMembers.join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
            
            <div className="flex space-x-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1" 
                onClick={onClose}
                data-testid="button-cancel-expense"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-expense hover:bg-red-600 text-white"
                disabled={createExpenseMutation.isPending}
                data-testid="button-submit-expense"
              >
                {createExpenseMutation.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
