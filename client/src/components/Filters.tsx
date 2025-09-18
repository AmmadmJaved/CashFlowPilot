import { useState } from "react";
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

type FiltersProps = {
  filters: {
    startDate: string;
    endDate: string;
    user?: string;
    group?: string;
    category?: string;
  };
  handleFilterChange: (field: string, value: string) => void;
};

export default function Filters({ filters, handleFilterChange }: FiltersProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap md:flex-nowrap items-end gap-4 mt-4 pt-4 mb-6 overflow-x-auto">
      {/* Start Date */}
      <div className="flex-shrink-0">
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          type="date"
          value={filters.startDate}
          onChange={(e) => handleFilterChange("startDate", e.target.value)}
          data-testid="input-start-date"
          className="w-[180px]"
        />
      </div>

      {/* End Date */}
      <div className="flex-shrink-0">
        <Label htmlFor="endDate">End Date</Label>
        <Input
          id="endDate"
          type="date"
          value={filters.endDate}
          onChange={(e) => handleFilterChange("endDate", e.target.value)}
          data-testid="input-end-date"
          className="w-[180px]"
        />
      </div>

      {/* Filter Button */}
        <div className="flex-shrink-0">
        <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filter
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-4 space-y-4">
                {/* User Filter */}
                <div>
                    <Label>User</Label>
                    <Select onValueChange={(v) => handleFilterChange("user", v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="user1">User 1</SelectItem>
                        <SelectItem value="user2">User 2</SelectItem>
                        <SelectItem value="user3">User 3</SelectItem>
                    </SelectContent>
                    </Select>
                </div>

                {/* Group Filter */}
                <div>
                    <Label>Group</Label>
                    <Select onValueChange={(v) => handleFilterChange("group", v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="group1">Group 1</SelectItem>
                        <SelectItem value="group2">Group 2</SelectItem>
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
