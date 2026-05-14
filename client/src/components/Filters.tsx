import { useEffect, useState, type FocusEvent, type MouseEvent } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    type?: string;
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
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const openNativeDatePicker = (event: MouseEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>) => {
      const input = event.currentTarget as HTMLInputElement & { showPicker?: () => void };
      if (typeof input.showPicker === "function") {
        input.showPicker();
      }
    };

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
    <>
      {/* Mobile compact filters */}
      <div className="sm:hidden mb-4">
        <div className="flex items-center gap-2">
          <div className="report-filter-box rounded-xl px-3 py-2 h-12 flex items-center flex-1">
            <Input
              id="search-mobile"
              type="text"
              value={filters.search || ""}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              data-testid="input-search-mobile"
              className="h-8 w-full border-0 bg-transparent p-0 text-sm report-text-primary placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Search"
            />
          </div>

          <Button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="h-12 rounded-xl bg-cyan-500 px-4 text-slate-950 hover:bg-cyan-400"
            data-testid="button-open-filters-mobile"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <DialogContent className="max-w-[92vw] rounded-xl border-cyan-500/30 bg-card">
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDateMobile" className="text-xs">Start Date</Label>
                  <Input
                    id="startDateMobile"
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    onClick={openNativeDatePicker}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDateMobile" className="text-xs">End Date</Label>
                  <Input
                    id="endDateMobile"
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    onClick={openNativeDatePicker}
                    className="mt-1"
                  />
                </div>
              </div>

              {members && members.length > 1 && (
                <div>
                  <Label htmlFor="paidByMobile">Users</Label>
                  <Select
                    value={filters.paidBy || "all"}
                    onValueChange={(value) => handleFilterChange("paidBy", value)}
                  >
                    <SelectTrigger id="paidByMobile" className="mt-1">
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

              <div>
                <Label>Type</Label>
                <Select value={filters.type || "all"} onValueChange={(v) => handleFilterChange("type", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select value={filters.category || "all"} onValueChange={(v) => handleFilterChange("category", v)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="food">🍽️ Food & Dining</SelectItem>
                    <SelectItem value="utilities">⚡ Utilities</SelectItem>
                    <SelectItem value="entertainment">🎬 Entertainment</SelectItem>
                    <SelectItem value="transportation">🚗 Transportation</SelectItem>
                    <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                    <SelectItem value="healthcare">🏥 Healthcare</SelectItem>
                    <SelectItem value="education">📚 Education</SelectItem>
                    <SelectItem value="salary">💼 Salary/Wages</SelectItem>
                    <SelectItem value="freelance">💻 Freelance</SelectItem>
                    <SelectItem value="business">🏢 Business</SelectItem>
                    <SelectItem value="investment">📈 Investment</SelectItem>
                    <SelectItem value="rental">🏠 Rental</SelectItem>
                    <SelectItem value="other">📋 Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                className="w-full bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Desktop filters */}
      <div className="hidden sm:grid w-full grid-cols-2 gap-3 mb-4">
        <div className="report-filter-box rounded-xl px-3 py-2 min-h-[68px] flex flex-col justify-between">
          <Label htmlFor="search" className="text-xs font-medium report-text-secondary">Search</Label>
          <Input
            id="search"
            type="text"
            value={filters.search || ""}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            data-testid="input-search"
            className="mt-1 h-9 w-full border-0 bg-transparent p-0 text-sm report-text-primary placeholder:text-slate-400 dark:placeholder:text-slate-500"
            placeholder="Search"
          />
        </div>

        <div className="report-filter-box rounded-xl px-3 py-2 min-h-[68px] flex flex-col justify-between">
          <Label className="text-xs font-medium report-text-secondary">Filter</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="mt-1 h-9 w-full justify-start border-0 bg-transparent px-0 text-sm font-medium report-text-secondary hover:bg-cyan-500/10 hover:text-cyan-500">
                <Filter className="h-4 w-4 mr-1" />
                Filter by
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="startDate" className="text-xs">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.startDate || ""}
                    onChange={(e) => handleFilterChange("startDate", e.target.value)}
                    onClick={openNativeDatePicker}
                    data-testid="input-start-date"
                    className="mt-1"
                    placeholder="Start Date"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.endDate || ""}
                    onChange={(e) => handleFilterChange("endDate", e.target.value)}
                    onClick={openNativeDatePicker}
                    data-testid="input-end-date"
                    className="mt-1"
                    placeholder="End Date"
                  />
                </div>
              </div>

              {members && members.length > 1 && (
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

              <div>
                <Label>Type</Label>
                <Select value={filters.type || "all"} onValueChange={(v) => handleFilterChange("type", v)}>
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

              <div>
                <Label>Category</Label>
                <Select value={filters.category || "all"} onValueChange={(v) => handleFilterChange("category", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="food">🍽️ Food & Dining</SelectItem>
                    <SelectItem value="utilities">⚡ Utilities</SelectItem>
                    <SelectItem value="entertainment">🎬 Entertainment</SelectItem>
                    <SelectItem value="transportation">🚗 Transportation</SelectItem>
                    <SelectItem value="shopping">🛍️ Shopping</SelectItem>
                    <SelectItem value="healthcare">🏥 Healthcare</SelectItem>
                    <SelectItem value="education">📚 Education</SelectItem>
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
    </>
  );
}
