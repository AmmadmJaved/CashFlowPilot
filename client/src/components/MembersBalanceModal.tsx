import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, DollarSign, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "react-oidc-context";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";

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
interface Member {
  id: string;
  name: string;
  openingBalance: number;
}

interface MembersBalanceModalProps {
  groupId: string;
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  members: Member[];
  onSave: (updatedMembers: Member[]) => void; // callback to parent
}

export default function MembersBalanceModal({
  groupId,
  isOpen,
  onClose,
  groupName,
  members,
  onSave,
}: MembersBalanceModalProps) {
  const [originalMembers] = useState<Member[]>(members); // snapshot at load
  const [editedMembers, setEditedMembers] = useState<Member[]>(members);
  const auth = useAuth();
  const token = auth.user?.id_token;
  const queryClient = useQueryClient();
  // Reset state when modal re-opens
  React.useEffect(() => {
    setEditedMembers(members);
  }, [members, isOpen]);

const handleBalanceChange = (id: string, value: string) => {
  setEditedMembers((prev) =>
    prev.map((m) =>
      m.id === id ? { ...m, openingBalance: Number(value) || 0 } : m
    )
  );
};

const handleBalanceCommit = (id: string, value: number) => {
  // prevent sending unnecessary updates
  if (value !== 0 && editedMembers.find(m => m.id === id)?.openingBalance !== members.find(m => m.id === id)?.openingBalance) {
    updateOpeningBalanceMutation.mutate({
      groupId,
      memberId: id,
      openingBalance: value,
    });
  }
};

  // Mutation to update group member balance
const updateOpeningBalanceMutation = useMutation({
  mutationFn: async ({
    groupId,
    memberId,
    openingBalance,
  }: {
    groupId: string;
    memberId: string;
    openingBalance: number;
  }) => {
    return await apiRequest(
      "PUT",
      `/api/groups/${groupId}/members/${memberId}/balance`,
      { openingBalance }, token
    );
  },
  onSuccess: (_, variables) => {
   // update opening balance  create transaction as well
   createTransactionMutation.mutate({
     type: "income",
     amount: variables.openingBalance.toString(),
     description: `Opening balance adjusted for member ${auth.user?.profile?.name || "Unknown"}`,
     date: new Date().toISOString(),
     paidBy: auth.user?.profile?.name || "Unknown",
     category: "adjustment",
     isShared: false,
     groupId: variables.groupId,
   });
    toast({
      title: "Success",
      description: `Opening balance updated successfully`,
    });

    // Invalidate queries so UI stays in sync
    queryClient.invalidateQueries({ queryKey: ["/api/groups", variables.groupId] });
    queryClient.invalidateQueries({ queryKey: ["/api/group-members", variables.groupId] });
  },
  onError: (error) => {
    console.error("Balance update error:", error);
    toast({
      title: "Error",
      description:
        error instanceof Error ? error.message : "Failed to update opening balance",
      variant: "destructive",
    });
  },
});

// Example usage in form submission

  // const handleSave = () => {
  //   editedMembers.forEach((member) => {
  //     updateOpeningBalanceMutation.mutate({
  //       groupId,
  //       memberId: member.id,
  //       openingBalance: member.openingBalance,
  //     });
  //   });
  //   onSave(editedMembers);
  //   onClose();
  // };

  // Transaction logicconst 
  const createTransactionMutation = useMutation({
      mutationFn: async (data: TransactionFormData) => {
        return await apiRequest(
          "POST",
          "/api/transactions",
          {
            ...data,
            groupId: groupId || null,
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
  
    // const onSubmitTransaction = (data: TransactionFormData) => {
    //   createTransactionMutation.mutate(data);
    // };
  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Members of {groupName}
          </DialogTitle>
        </DialogHeader>


        <div className="mt-2 border rounded-lg overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-2 bg-gray-100 sticky top-0 z-10">
            <div className="px-4 py-2 font-semibold text-sm border-r">User</div>
            <div className="px-4 py-2 font-semibold text-sm">Opening Balance</div>
        </div>

        {/* Body Rows */}
        <div className="max-h-64 overflow-y-auto">
            {editedMembers.length > 0 ? (
            editedMembers.map((member) => (
                <div
                key={member.id}
                className="grid grid-cols-2 items-center border-t bg-white"
                >
                {/* User column */}
                <div className="flex items-center gap-2 px-4 py-2 border-r" >
                    <div className="p-2 bg-blue-100 rounded-full">
                    <User className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="font-medium">{member.name}</span>
                </div>

                {/* Opening Balance column */}
                <div className="flex items-center gap-1 px-4 py-2">
                    <DollarSign className="h-4 w-4 text-green-700" />
                    <Input
                    inputMode="numeric"
                    pattern="-?[0-9]*"
                    className="w-24 h-8"
                    value={member.openingBalance}
                    onChange={(e) => handleBalanceChange(member.id, e.target.value)}
                    onBlur={(e) => handleBalanceCommit(member.id, Number(e.target.value) || 0)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleBalanceCommit(member.id, Number(e.currentTarget.value) || 0);
                      }
                    }}
                  />
                </div>
                </div>
            ))
            ) : (
            <p className="text-sm text-gray-500 p-4">No members found</p>
            )}
        </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {/* <Button onClick={handleSave}>Save</Button> */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
