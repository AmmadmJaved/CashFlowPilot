import React, { useEffect } from "react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useProfile } from "@/hooks/useProfile";
import { GroupWithMembers } from "@shared/schema";
import { useAuth } from "react-oidc-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CreditCard, Calendar, User, Tag, Users, Minus, Plus } from "lucide-react";
import AnimatedButton from "./AnimatedButton";
import { use } from "passport";

// ------------------- Schemas -------------------
const baseSchema = {
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  paidBy: z.string().min(1, "Name is required"),
  category: z.string().default("other"),
  isShared: z.boolean().default(false),
  groupId: z.string().nullable().optional(),
};

const expenseSchema = z.object(baseSchema).extend({
  type: z.literal("expense"),
});

const incomeSchema = z.object(baseSchema).extend({
  type: z.literal("income"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;
type IncomeFormData = z.infer<typeof incomeSchema>;
type TransactionFormData = ExpenseFormData | IncomeFormData;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupWithMembers[];
}

export default function TransactionModal({ isOpen, onClose, groups }: TransactionModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const auth = useAuth();
  const token = auth.user?.id_token;

  const [tab, setTab] = React.useState<"expense" | "income">("expense");

  const schema = tab === "expense" ? expenseSchema : incomeSchema;

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      description: "",
      category: "other",
      date: new Date().toISOString().split("T")[0],
      paidBy: profile?.publicName || "",
      groupId: groups.length === 1 ? groups[0].id : null, // auto-assign if 1 group
      isShared: groups.length > 0, // set true only if groups exist
      type: "expense",
    },
  });

  useEffect(() => {
    if (profile?.publicName && !form.getValues().paidBy) {
      form.setValue("paidBy", profile.publicName);
    }
  }, [profile, form]);

  // Reset when tab changes
  useEffect(() => {
    form.reset({
      amount: "",
      description: "",
      category: "other",
      date: new Date().toISOString().split("T")[0],
      paidBy: profile?.publicName || "",
      groupId: null,
      isShared: false,
      type: tab,
    });
  }, [tab]);

  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormData) => {
      return await apiRequest(
        "POST",
        "/api/transactions",
        {
          ...data,
          groupId: groups.length === 1 ? groups[0].id : null, // enforce assignment
        },
        token
      );
    },
    onSuccess: (_, variables) => {
      toast({
        title: "Success",
        description: `${variables.type === "expense" ? "Expense" : "Income"} added successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/monthly"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/transactions"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      console.error("Transaction creation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add transaction",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TransactionFormData) => {
    createTransactionMutation.mutate(data);
  };

  const expenseCategories = [
    { value: "food", label: "🍽️ Food & Dining" },
    { value: "utilities", label: "⚡ Utilities" },
    { value: "shopping", label: "🛍️ Shopping" },
    { value: "rent", label: "🏠 Rent" },
    { value: "travel", label: "✈️ Travel" },
    { value: "other", label: "📋 Other" },
  ];

  const incomeCategories = [
    { value: "salary", label: "💼 Salary" },
    { value: "freelance", label: "💻 Freelance" },
    { value: "business", label: "🏢 Business" },
    { value: "investment", label: "📈 Investment" },
    { value: "gift", label: "🎉 Gift" },
    { value: "other", label: "📋 Other" },
  ];

  const isShared = form.watch("isShared");
  const selectedGroupId = form.watch("groupId");
  const selectedGroup = groups.find((g) => g.id === selectedGroupId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-cyan-500/30 bg-card shadow-2xl shadow-cyan-500/5">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground">Add Transaction</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "expense" | "income")} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4 bg-muted/60 border border-border rounded-lg p-1">
            <TabsTrigger value="expense" className="rounded-md data-[state=active]:bg-red-500 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium">Expense</TabsTrigger>
            <TabsTrigger value="income" className="rounded-md data-[state=active]:bg-green-500 data-[state=active]:text-white data-[state=active]:shadow-sm font-medium">Income</TabsTrigger>
          </TabsList>

          <TabsContent value="expense" color="red">
            <TransactionForm
              form={form}
              onSubmit={onSubmit}
              isShared={isShared}
              groups={groups}
              selectedGroup={selectedGroup}
              categories={expenseCategories}
              isLoading={createTransactionMutation.isPending}
              submitLabel="Add Expense"
              color="red"
              onClose={onClose}
            />
          </TabsContent>

          <TabsContent value="income" color="green">
            <TransactionForm
              form={form}
              onSubmit={onSubmit}
              isShared={isShared}
              groups={groups}
              selectedGroup={selectedGroup}
              categories={incomeCategories}
              isLoading={createTransactionMutation.isPending}
              submitLabel="Add Income"
              color="green"
              onClose={onClose}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ------------------- TransactionForm -------------------

function TransactionForm({
  form,
  onSubmit,
  isShared,
  groups,
  selectedGroup,
  categories,
  isLoading,
  submitLabel,
  color,
  onClose,
}: any) {

  const type = form.getValues().type; // income | expense
  const isIncome = type === "income";
  const auth = useAuth();
  // Auto-fill "Paid By" if only 1 group exists
  useEffect(() => {
    if (groups.length === 1) {
      form.setValue("paidBy", auth?.user?.profile?.name || "Unknown");
      form.setValue("isShared", true);
    }
  }, [groups, form]);
 
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">Amount (Rs)</FormLabel>
              <FormControl>
                <Input {...field} type="number" step="0.01" placeholder="Enter amount..." className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-cyan-500/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* category */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">Category</FormLabel>
              <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                <FormControl>
                  <SelectTrigger className="border-border bg-input text-foreground">
                    <SelectValue placeholder="Choose category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((c: any) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">Description</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g., Lunch or Salary" className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-cyan-500/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">Date</FormLabel>
              <FormControl>
                <Input {...field} type="date" className="border-border bg-input text-foreground focus:border-cyan-500 focus:ring-cyan-500/20" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* Paid By / Received By */}
        <FormField
          control={form.control}
          name="paidBy"
          defaultValue={auth?.user?.profile?.name || "Unknown"}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-medium text-foreground">{isIncome ? "Received By" : "Paid By"}</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  placeholder="Enter name..."
                  value={field.value || auth.user?.profile?.name || "Unknown"}
                  onChange={field.onChange}
                  className="border-border bg-input text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-cyan-500/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* group info */}
        {isShared && selectedGroup && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-sm text-foreground">
            Split equally among {selectedGroup.memberCount} members of "{selectedGroup.name}".
          </div>
        )}
        {groups.length === 1 && (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-sm text-foreground">
            This transaction will be shared with "{groups[0].name}" ({groups[0].memberCount} members).
          </div>
        )}

        {/* action buttons */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 border-border text-foreground hover:bg-muted">
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className={`flex-1 flex items-center justify-center gap-2 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6 py-2 ${
              isIncome 
                ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" 
                : "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700"
            }`}
          >
            {isLoading ? (
              "Saving..."
            ) : (
              <>
                {isIncome ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Minus className="w-4 h-4" />
                )}
                {isIncome ? "Add Income" : "Add Expense"}
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}