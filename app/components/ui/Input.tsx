import * as React from "react";
import { twMerge } from "tailwind-merge";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={twMerge(
        "flex h-12 w-full rounded-base border-2 border-black bg-white px-4 py-3 font-medium text-base text-black shadow-[2px_2px_0px_0px_black] transition-all duration-100 file:border-0 file:bg-transparent file:font-medium file:text-black placeholder:text-gray-600 focus-visible:translate-x-[-2px] focus-visible:translate-y-[-2px] focus-visible:shadow-[4px_4px_0px_0px_black] focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
