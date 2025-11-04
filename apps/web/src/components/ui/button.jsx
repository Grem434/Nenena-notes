import { cn } from "./utils";

export function Button({ className, asChild, ...props }) {
  const Comp = asChild ? "span" : "button";
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-200 disabled:opacity-50 disabled:pointer-events-none h-10 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white",
        className
      )}
      {...props}
    />
  );
}
