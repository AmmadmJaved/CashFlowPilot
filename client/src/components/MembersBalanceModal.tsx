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
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[94vw] max-w-md overflow-hidden rounded-2xl border border-cyan-400/25 p-0 shadow-2xl">
        <DialogHeader className="border-b border-cyan-500/15 bg-gradient-to-br from-cyan-50/90 via-white to-sky-50/80 px-5 py-4">
          <DialogTitle className="flex items-start gap-3 text-left">
            <span className="mt-0.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 p-2">
              <Users className="h-4 w-4 text-cyan-700" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-semibold text-slate-900">Members</span>
              <span className="block text-sm font-medium text-slate-700 truncate">{groupName}</span>
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {editedMembers.length} member{editedMembers.length === 1 ? "" : "s"}
          </p>
          <div className="max-h-[44vh] overflow-y-auto rounded-xl border border-cyan-400/20 bg-white/85">
            {editedMembers.length > 0 ? (
              editedMembers.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 px-4 py-3 ${index !== 0 ? "border-t border-cyan-500/10" : ""}`}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-50 text-xs font-semibold text-cyan-700">
                    {member.name?.trim()?.charAt(0).toUpperCase() || <User className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-medium text-slate-800">{member.name}</span>
                </div>
              ))
            ) : (
              <p className="p-6 text-center text-sm text-slate-500">No members found</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-cyan-500/10 px-5 py-4">
          <Button variant="outline" onClick={onClose} className="rounded-full px-5">
            Cancel
          </Button>
          <Button onClick={handleSave} className="rounded-full bg-cyan-500 px-5 text-slate-950 hover:bg-cyan-400">
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
