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

interface Member {
  id: string;
  name: string;
  openingBalance: number;
}

interface MembersBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  members: Member[];
  onSave: (updatedMembers: Member[]) => void; // callback to parent
}

export default function MembersBalanceModal({
  isOpen,
  onClose,
  groupName,
  members,
  onSave,
}: MembersBalanceModalProps) {
  const [editedMembers, setEditedMembers] = useState<Member[]>(members);

  // Reset state when modal re-opens
  React.useEffect(() => {
    setEditedMembers(members);
  }, [members, isOpen]);

  const handleBalanceChange = (id: string, value: string) => {
    setEditedMembers((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, openingBalance: Number(value) || 0 }
          : m
      )
    );
  };

  const handleSave = () => {
    onSave(editedMembers);
    onClose();
  };

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
                <div className="flex items-center gap-2 px-4 py-2 border-r">
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
                    onChange={(e) => {
                      handleBalanceChange(member.id, e.target.value);
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
          <Button onClick={handleSave}>Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
