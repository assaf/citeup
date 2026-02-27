import { Link } from "react-router";
import { twMerge } from "tailwind-merge";

export default function CiteUpLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={twMerge(
        "flex flex-nowrap items-center",
        "font-bold text-2xl leading-none",
        "transition-colors hover:text-[hsl(37,92%,65%)]",
        className,
      )}
      aria-label="Go to home page"
    >
      <img
        alt="CiteUp"
        className="mt-1 mr-1"
        height={24}
        src="/images/logo.png"
        width={24}
      />
      <span className="text-[hsl(37,92%,65%)]">CiteUp</span>
    </Link>
  );
}
