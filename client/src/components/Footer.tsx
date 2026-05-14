import React, { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionModal from "./TransactionModal";
// footer interface for properties if needed in the future
interface FooterProps {
  groups?: any[];
}
export default function MobileFooter({ groups }: FooterProps) {
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50">
        <Button
          onClick={() => setTransactionModalOpen(true)}
          className="h-14 w-14 rounded-full border border-cyan-300/40 bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-xl shadow-cyan-500/40 transition-transform duration-200 hover:scale-105 hover:from-cyan-300 hover:to-blue-500"
          aria-label="Add transaction"
          title="Add transaction"
        >
          <Plus className="h-6 w-6" />
          <span className="sr-only">Add transaction</span>
        </Button>
      </div>

      {/* Shared Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        groups={groups || []} // Pass empty array or relevant groups if needed
      />
    </>
  );
}
