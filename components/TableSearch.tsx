"use client";

import { Search } from "lucide-react";

type TableSearchProps = {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
};

export default function TableSearch({
  value = "",
  onChange,
  placeholder = "Search...",
}: TableSearchProps) {
  return (
    <div className="w-full md:w-auto flex items-center gap-2 text-xs rounded-full ring-[1.5px] ring-gray-300 px-2">
      <Search className="w-4 h-4 text-gray-500" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-[200px] p-2 bg-transparent outline-none"
      />
    </div>
  );
}
