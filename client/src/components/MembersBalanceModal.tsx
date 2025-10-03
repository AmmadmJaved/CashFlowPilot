import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Users, User } from "lucide-react";

interface Member {
  id: string;
  name: string;
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
  const [editedMembers, setEditedMembers] = useState<Member[]>(members);

  // Reset state when modal re-opens
  useEffect(() => {
    setEditedMembers(members);
  }, [members, isOpen]);

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
          <div className="max-h-64 overflow-y-auto">
            {editedMembers.length > 0 ? (
              editedMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-4 py-2 border-t bg-white"
                >
                  <User className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">{member.name}</span>
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
