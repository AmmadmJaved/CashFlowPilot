import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Member {
  id: string;
  name: string;
  openingBalance: number;
}
type FiltersProps = {
  filters: {
    search: string;
    startDate: string;
    endDate: string;
    user?: string;
    group?: string;
    category?: string;
    paidBy?: string;
  };
  members: Member[];
  handleFilterChange: (field: string, value: string) => void;
};

export default function Filters({ filters, handleFilterChange,members }: FiltersProps) {
   const [open, setOpen] = useState(false);
    const toLocalDateInputValue = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const getFirstDayOfMonth = () => {
      const now = new Date();
      return toLocalDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
    };

    const getTodayDate = () => {
      const now = new Date();
      return toLocalDateInputValue(now); // yyyy-mm-dd in local timezone
    };

    useEffect(() => {
      if (!filters.startDate) {
        handleFilterChange("startDate", getFirstDayOfMonth());
      }
      if (!filters.endDate) {
        handleFilterChange("endDate", getTodayDate());
      }
    }, [filters.startDate, filters.endDate, handleFilterChange]);

    
      const users = [
    { id: "all", name: "All Users" },
    ...members.map((m) => ({ id: m.id, name: m.name }))
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4 mb-4">
      {/* Start Date */}
      <div className="report-filter-box rounded-xl px-3 py-2">
        <Label htmlFor="startDate" className="text-xs font-medium text-cyan-100/85">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={filters.startDate || ""}
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          data-testid="input-start-date"
          className="mt-1 h-9 w-full border-0 bg-transparent p-0 text-sm text-slate-100"
          placeholder="Start Date"
        />
      </div>

      {/* End Date */}
      <div className="report-filter-box rounded-xl px-3 py-2">
        <Label htmlFor="endDate" className="text-xs font-medium text-cyan-100/85">End Date</Label>
        <Input
          id="endDate"
          type="date"
          value={filters.endDate || ""}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
          data-testid="input-end-date"
          className="mt-1 h-9 w-full border-0 bg-transparent p-0 text-sm text-slate-100"
          placeholder="End Date"
        />
      </div>
      {/* Search */}
      <div className="report-filter-box rounded-xl px-3 py-2 flex items-center">
        <Input
          id="search"
          type="text"
          value={filters.search || ""}
          onChange={(e) => handleFilterChange("search", e.target.value)}
          data-testid="input-search"
          className="h-9 w-full border-0 bg-transparent p-0 text-sm text-slate-100 placeholder:text-slate-400"
          placeholder="Search"
        />
      </div>

      {/* Filter Button */}
      <div className="report-filter-box rounded-xl px-3 py-2 flex items-center">
        <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                <Button variant="ghost" className="h-9 w-full border-0 bg-transparent text-sm font-medium text-slate-100 hover:bg-cyan-500/10 hover:text-cyan-200">
                    <Filter className="h-4 w-4 mr-1" />
                    Filter
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-4 space-y-4">
                  {/* Filter User */}

                {
                  members && members.length > 1 && (
                    <div className="flex-shrink-0 rounded-lg border bg-card text-card-foreground shadow-sm card-hover p-2">
                    <Label htmlFor="paidBy" className="ml-1 text-sm">Users</Label>
                    <Select
                      value={filters.paidBy || "all"}
                      onValueChange={(value) => handleFilterChange("paidBy", value)}
                    >
                      <SelectTrigger id="paidBy" className="mt-1 w-full">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>  
                  )}     
              {/* Type Filter */}
                <div>
                    <Label>Type</Label>
                    <Select onValueChange={(v) => handleFilterChange("type", v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                    </Select>
                </div>
                {/* Category Filter */}
                <div>
                    <Label>Category</Label>
                    <Select onValueChange={(v) => handleFilterChange("category", v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {/* Expense Categories */}
                    <SelectItem value="food">🍽️ Food & Dining</SelectItem>
                    <SelectItem value="utilities">⚡ Utilities</SelectItem>
                    <SelectItem value="entertainment">🎬 Entertainment</SelectItem>
                    <SelectItem value="transportation">🚗 Transportation</SelectItem>
                    <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                    <SelectItem value="healthcare">🏥 Healthcare</SelectItem>
                    <SelectItem value="education">📚 Education</SelectItem>
                    {/* Income Categories */}
                    <SelectItem value="salary">💼 Salary/Wages</SelectItem>
                    <SelectItem value="freelance">💻 Freelance</SelectItem>
                    <SelectItem value="business">🏢 Business</SelectItem>
                    <SelectItem value="investment">📈 Investment</SelectItem>
                    <SelectItem value="rental">🏠 Rental</SelectItem>
                    <SelectItem value="other">📋 Other</SelectItem>
                  </SelectContent>
                    </Select>
                </div>
                </PopoverContent>
            </Popover>

        </div> 

    </div>
  );
}
