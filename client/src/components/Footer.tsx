import React, { useState } from "react";
import { Plus, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import TransactionModal from "./TransactionModal";
// footer interface for properties if needed in the future
interface FooterProps {
  // Add any props if needed  
  callabckSetActivetab?: React.Dispatch<React.SetStateAction<string>>;
  activeTab?: string;
  groups?: any[];
}
export default function MobileFooter({callabckSetActivetab, activeTab, groups}: FooterProps) {
  const [isTransactionModalOpen, setTransactionModalOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between py-2">
          {/* Left - Personal Account */}
          <button className={`flex flex-col items-center text-sm ${activeTab === "personal" ? "text-blue-600" : "text-gray-600"}`} onClick={() => callabckSetActivetab && callabckSetActivetab("personal")}>
            <User className="w-5 h-5 mb-1" />
            <span>Personal</span>
          </button>

          {/* Middle - Big Add Button */}
          <div className="relative -mt-6">
            <Button
              onClick={() => setTransactionModalOpen(true)}
              className="bg-blue-600 text-white rounded-full p-4 shadow-lg"
            >
              <Plus className="w-6 h-6" />
            </Button>
          </div>

          {/* Right - Group Account */}
          <button className={`flex flex-col items-center text-sm ${activeTab === "groups" ? "text-blue-600" : "text-gray-600"}`} onClick={() => callabckSetActivetab && callabckSetActivetab("groups")}>
            <Users className="w-5 h-5 mb-1" />
            <span>Group</span>
          </button>
        </div>
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
