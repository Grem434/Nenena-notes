import { cn } from "./utils";

export function Card({ className, ...props }) {
  return (
    <div
      className={cn("rounded-2xl border border-brand-100 bg-white shadow-sm", className)}
      {...props}
    />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn("p-4", className)} {...props} />;
}
