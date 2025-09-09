import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useProfile } from "@/hooks/useProfile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DollarSign, Calendar, User, Tag, Users } from "lucide-react";
import { Switch } from "./ui/switch";
import { GroupWithMembers } from "@shared/schema";
import { useAuth } from "react-oidc-context";

const incomeSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine(
    (val) => !isNaN(Number(val)) && Number(val) > 0,
    "Amount must be a positive number"
  ),
  description: z.string().min(1, "Source is required"),
  date: z.string().min(1, "Date is required"),
  paidBy: z.string().min(1, "Received by is required"),
  category: z.string().default("other"),
  isShared: z.boolean().default(false),
  groupId: z.string().nullable().optional(), // only required if isShared=true
});

type IncomeFormData = z.infer<typeof incomeSchema>;

interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: GroupWithMembers[];
}


export default function AddIncomeModal({ isOpen, onClose, groups }: AddIncomeModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const auth = useAuth();
  const token = auth.user?.id_token;

  const form = useForm<IncomeFormData>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: "",
      description: "",
      date: new Date().toISOString().split('T')[0],
      paidBy: profile?.publicName || "",
      category: "other",
      isShared: false,
      groupId: null,
    },
  });

  // Update default values when profile loads
  React.useEffect(() => {
    if (profile?.publicName && !form.getValues().paidBy) {
      form.setValue("paidBy", profile.publicName);
    }
  }, [profile, form]);


  const createIncomeMutation = useMutation({
    mutationFn: async (data: IncomeFormData) => {
      return await apiRequest("POST", "/api/transactions", {
        ...data,
        type: "income",
        amount: data.amount,
        category: data.category,
        isShared: data.isShared,
        groupId: data.isShared ? data.groupId : null,
      }, token);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Income added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/monthly"] });
      form.reset({
        amount: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        paidBy: profile?.publicName || "",
        category: "other",
      });
      onClose();
    },
    onError: (error) => {
      console.error('Income creation error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add income",
        variant: "destructive",
      });
    },
  });

   const isShared = form.watch("isShared");
  const selectedGroupId = form.watch("groupId");
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  const onSubmit = (data: IncomeFormData) => {
    createIncomeMutation.mutate(data);
  };

  const incomeCategories = [
    { value: "other", label: "📋 Other", description: "Other income sources (default)" },
    { value: "salary", label: "💼 Salary/Wages", description: "Regular employment income" },
    { value: "freelance", label: "💻 Freelance", description: "Project-based work" },
    { value: "business", label: "🏢 Business", description: "Business revenue" },
    { value: "investment", label: "📈 Investment", description: "Stocks, dividends, interest" },
    { value: "rental", label: "🏠 Rental", description: "Property rental income" },
    { value: "bonus", label: "🎁 Bonus", description: "Performance bonuses" },
    { value: "gift", label: "🎉 Gift", description: "Money received as gift" },
    { value: "refund", label: "🔄 Refund", description: "Money returned" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            Add Income
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
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Amount (₨)
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      step="0.01"
                      placeholder="Enter amount..."
                      className="text-lg font-semibold"
                      data-testid="input-income-amount"
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
                   <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger data-testid="select-income-category">
                        <SelectValue placeholder="Other (default category)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {incomeCategories.map((category) => (
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
                  <FormLabel>Description/Source</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Monthly salary, freelance project..."
                      data-testid="input-income-description"
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
                      data-testid="input-income-date"
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
                    Received By
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Enter name..."
                      data-testid="input-income-received-by"
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
                               <Select onValueChange={field.onChange} value={field.value ?? undefined}>
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
                data-testid="button-cancel-income"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createIncomeMutation.isPending}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                data-testid="button-add-income"
              >
                {createIncomeMutation.isPending ? "Adding..." : "Add Income"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}