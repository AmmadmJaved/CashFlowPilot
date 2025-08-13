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
import { Users, CreditCard, Calendar, User, Tag } from "lucide-react";

const expenseSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  description: z.string().min(1, "Description is required"),
  category: z.string().default("other"),
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
        isShared: data.isShared,
        groupId: data.isShared ? data.groupId : null,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Expense added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/monthly"] });
      form.reset({
        amount: "",
        description: "",
        category: "other",
        date: new Date().toISOString().split('T')[0],
        paidBy: profile?.publicName || "",
        groupId: "",
        isShared: false,
      });
      setSelectedMembers([]);
      onClose();
    },
    onError: (error) => {
      console.error('Expense creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  const expenseCategories = [
    { value: "other", label: "📋 Other", description: "Miscellaneous expenses (default)" },
    { value: "food", label: "🍽️ Food & Dining", description: "Restaurants, groceries, takeout" },
    { value: "utilities", label: "⚡ Utilities", description: "Electricity, gas, water, internet" },
    { value: "entertainment", label: "🎬 Entertainment", description: "Movies, games, events" },
    { value: "transportation", label: "🚗 Transportation", description: "Fuel, public transport, rides" },
    { value: "shopping", label: "🛍️ Shopping", description: "Clothes, electronics, household items" },
    { value: "healthcare", label: "🏥 Healthcare", description: "Doctor visits, medicines, insurance" },
    { value: "education", label: "📚 Education", description: "Books, courses, tuition" },
    { value: "rent", label: "🏠 Rent/Housing", description: "Monthly rent, maintenance" },
    { value: "travel", label: "✈️ Travel", description: "Vacation, business trips" },
    { value: "subscription", label: "📱 Subscriptions", description: "Netflix, Spotify, software" },
  ];

  const isShared = form.watch("isShared");
  const selectedGroupId = form.watch("groupId");
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-red-600" />
            </div>
            Add Expense
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-red-600" />
                    Amount (₨)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="Enter amount..."
                      className="text-lg font-semibold"
                      data-testid="input-expense-amount"
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
                  <FormLabel className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-blue-600" />
                    Category
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-expense-category">
                        <SelectValue placeholder="Other (default category)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {expenseCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          <div>
                            <div className="font-medium">{category.label}</div>
                            <div className="text-sm text-gray-500">{category.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {...field}
                      placeholder="e.g., Lunch at restaurant, grocery shopping..."
                      data-testid="input-expense-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    Date
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="date"
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
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600" />
                    Paid By
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter name..."
                      data-testid="input-expense-paid-by"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {groups.length > 0 && (
              <FormField
                control={form.control}
                name="isShared"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        Shared Expense
                      </FormLabel>
                      <div className="text-sm text-gray-500">
                        Split this expense with a group
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-shared-expense"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {isShared && (
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Group</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-group">
                          <SelectValue placeholder="Choose a group" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div>
                              <div className="font-medium">{group.name}</div>
                              <div className="text-sm text-gray-500">
                                {group.memberCount} members
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isShared && selectedGroup && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Split Details</h4>
                <p className="text-sm text-blue-700">
                  This expense will be split equally among {selectedGroup?.memberCount || 0} members of "{selectedGroup?.name}"
                </p>
                {form.getValues().amount && selectedGroup && (
                  <p className="text-sm font-medium text-blue-800 mt-1">
                    Each member owes: ₨ {(parseFloat(form.getValues().amount || "0") / (selectedGroup.memberCount || 1)).toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
                data-testid="button-cancel-expense"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createExpenseMutation.isPending}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
                data-testid="button-add-expense"
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