"use client"

import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import * as React from "react"
import { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangePickerProps {
  className?: string
  date?: DateRange
  onDateChange?: (date: DateRange   | undefined) => void
  placeholder?: string
}

// Helper function to replace nested ternary
function getDateRangeDisplay(date: DateRange | undefined, placeholder: string): React.ReactNode {
  if (!date?.from) {
    return <span>{placeholder}</span>;
  }
  
  if (date.to) {
    return (
      <>
        {format(date.from, "LLL dd, y")} -{" "}
        {format(date.to, "LLL dd, y")}
      </>
    );
  }
  
  return format(date.from, "LLL dd, y");
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
  placeholder = "Pick a date range"
}: DateRangePickerProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDateRangeDisplay(date, placeholder)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}