import { last } from "es-toolkit";
import { MenuIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, type UIMatch, useMatches } from "react-router";
import { twMerge } from "tailwind-merge";
import { Button } from "~/components/ui/Button";
import AccountMenu from "./AccountMenu";
import CiteMeInLogo from "./CiteMeInLogo";
import type { HeaderLink } from "./PageLayout";

export default function PageHeader() {
  const matches = useMatches() as UIMatch<unknown, { hideHeader?: boolean }>[];
  const lastHandle = last(matches.filter((m) => m.handle))?.handle;
  if (lastHandle?.hideHeader) return null;

  return (
    <header className="z-10 flex min-h-16 w-full items-center border-black border-b-2 bg-[hsl(60,100%,99%)] p-2 print:hidden">
      <CiteMeInLogo className="w-1/2" />
      <HeaderLinks />
      <AccountMenu className="w-1/2 justify-end" />
    </header>
  );
}

function HeaderLinks() {
  const matches = useMatches() as UIMatch<unknown, { siteNav?: boolean }>[];
  const navLinks = [];
  const siteMatch = matches.find((m) => m.handle?.siteNav);
  const siteId = siteMatch?.params.id as string | undefined;
  if (siteMatch) navLinks.push({ to: "/sites", label: "Dashboard" });
  if (siteId)
    navLinks.push(
      { to: `/site/${siteId}/citations`, label: "Citations" },
      { to: `/site/${siteId}/queries`, label: "Queries" },
      { to: `/site/${siteId}/bots`, label: "Bot Traffic" },
    );

  return (
    <nav className="hidden items-center gap-6 whitespace-nowrap md:flex">
      {navLinks.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            twMerge(
              "whitespace-nowrap font-bold text-base text-black",
              "transition-colors hover:text-[#F59E0B]",
              isActive && "text-[#F59E0B]",
            )
          }
          viewTransition
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function DropdownMenu({ links }: { links: HeaderLink[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2"
        aria-expanded={isOpen}
        aria-haspopup="true"
        variant="ghost"
      >
        <MenuIcon className="h-4 w-4" />
        <span className="max-w-[200px] truncate">Menu</span>
      </Button>

      {isOpen && (
        <menu className="absolute top-10 right-0 z-50 mt-2 w-48 rounded-base border-2 border-black bg-white py-1 shadow-[4px_4px_0px_0px_black]">
          {links.map((link, index) => (
            <li key={index.toString()}>
              <Link
                to={link.to}
                className="block w-full px-4 py-2 text-left font-medium text-black transition-colors hover:bg-[hsl(47,100%,95%)] hover:text-[#F59E0B]"
                onClick={() => setIsOpen(false)}
                viewTransition
              >
                {link.label}
              </Link>
            </li>
          ))}
        </menu>
      )}
    </div>
  );
}
