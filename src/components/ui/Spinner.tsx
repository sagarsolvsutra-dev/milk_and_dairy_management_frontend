import { FiLoader } from "react-icons/fi";
import { cn } from "@/lib/utils";

export function Spinner({ className, fullPage }: { className?: string; fullPage?: boolean }) {
  const spinner = <FiLoader className={cn("h-5 w-5 animate-spin text-indigo-500", className)} />;

  if (fullPage) {
    return <div className="flex h-full min-h-[240px] w-full items-center justify-center">{spinner}</div>;
  }
  return spinner;
}
