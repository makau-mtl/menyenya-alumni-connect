"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ChevronDown, CircleUserRound, LayoutDashboard, LogOut, UserRound, Users } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

function AccountMenu() {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-md px-3 py-2 font-semibold text-ink hover:bg-paper data-[state=open]:bg-paper">
        <CircleUserRound className="size-5 text-tea" /> My account <ChevronDown className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild><Link href="/app"><LayoutDashboard /> Dashboard</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/app/profile"><UserRound /> My profile</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link href="/app/directory"><Users /> Member directory</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <form action="/auth/signout" method="post">
          <DropdownMenuItem asChild>
            <button type="submit" className="w-full"><LogOut /> Log out</button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Shows "Log in" to visitors and "My account" + "Log out" to signed-in people.
// It only checks whether a sign-in cookie exists, without contacting the server, so public pages
// stay fast and cached. Access itself is still checked on the server for every protected page.
const hasSessionCookie = () => /(?:^|;\s*)sb-[^=]*-auth-token(?:\.\d+)?=/.test(document.cookie);
const noSubscribe = () => () => {};

function useSignedIn() {
  usePathname(); // re-check after every page change (for example straight after logging in)
  return useSyncExternalStore(noSubscribe, hasSessionCookie, () => false);
}

export function AccountLinks({ variant }: { variant: "desktop" | "mobile" }) {
  const signedIn = useSignedIn();

  if (variant === "desktop") {
    return signedIn ? (
      <>
        <AccountMenu />
      </>
    ) : (
      <>
        <Link href="/login" className="rounded-md px-3 py-2 font-semibold text-ink hover:bg-paper">
          Log in
        </Link>
        <Link
          href="/join"
          className="rounded-md border-2 border-ink px-4 py-[0.4rem] font-semibold text-ink hover:bg-ink hover:text-white"
        >
          Join
        </Link>
      </>
    );
  }

  return signedIn ? (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <Link href="/app" className="rounded-md bg-tea py-2.5 text-center font-semibold text-white">
        My account
      </Link>
      <form action="/auth/signout" method="post">
        <button type="submit" className="w-full rounded-md border-2 border-ink py-2 text-center font-semibold">
          Log out
        </button>
      </form>
    </div>
  ) : (
    <div className="mt-4 grid grid-cols-2 gap-3">
      <Link href="/login" className="rounded-md border-2 border-ink py-2.5 text-center font-semibold">
        Log in
      </Link>
      <Link href="/join" className="rounded-md bg-tea py-2.5 text-center font-semibold text-white">
        Join
      </Link>
    </div>
  );
}
