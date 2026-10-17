"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck, Building2, ChevronsUpDown, ClipboardCheck, Contact, ExternalLink, Handshake, Home, Image as ImageIcon,
  GraduationCap, KeyRound, Landmark, LayoutDashboard, LogOut, Newspaper, Settings, ShoppingBag, UserRound, Users, UsersRound, Copy,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger,
} from "@/components/shadcn/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/shadcn/avatar";
import { Separator } from "@/components/shadcn/separator";
import { Toaster } from "@/components/shadcn/sonner";

// Icons are named on the server and looked up here, so menus can be built on the server.
const icons = {
  dashboard: LayoutDashboard, profile: UserRound, directory: Users, confirm: BadgeCheck, overview: Landmark,
  members: UsersRound, duplicates: Copy, roles: KeyRound, people: Contact, support: Handshake, shop: ShoppingBag,
  causes: Building2, news: Newspaper, photos: ImageIcon, settings: Settings, tasks: ClipboardCheck, home: Home, school: GraduationCap,
} as const;
export type IconName = keyof typeof icons;

export type NavItem = { href: string; label: string; icon: IconName; badge?: number };
export type NavGroup = { label: string; root: string; items: NavItem[] };
export type PortalUser = { name: string; email: string; photo: string | null; subtitle: string | null };

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";
}

export function PortalShell({ groups, user, children }: { groups: NavGroup[]; user: PortalUser; children: React.ReactNode }) {
  const path = usePathname();
  const isActive = (href: string, root: string) =>
    href === "/" ? false : href === root ? path === root : path === href || path.startsWith(`${href}/`);
  const current = groups.flatMap((g) => g.items.map((i) => ({ ...i, root: g.root }))).find((i) => isActive(i.href, i.root));
  const area = groups.find((g) => path === g.root || path.startsWith(`${g.root}/`))?.label;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link href="/admin" className="flex items-center gap-2 rounded-md px-2 py-2 group-data-[collapsible=icon]:justify-center">
            <span className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
              <span className="text-xl tracking-tight text-white">
                <span className="font-black">mhs</span>
                <span className="font-black text-gold">.</span>
                <span>alumni</span>
              </span>
              <span className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-gold">Admin</span>
            </span>
            <span className="hidden size-8 items-center justify-center rounded-lg bg-white/10 font-black text-white group-data-[collapsible=icon]:flex">
              m<span className="text-gold">.</span>
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          {groups.map((g) => (
            <SidebarGroup key={g.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/60">{g.label}</SidebarGroupLabel>
              <SidebarMenu>
                {g.items.map((item) => {
                  const Icon = icons[item.icon];
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(item.href, g.root)}
                        tooltip={item.label}
                        className="data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground"
                      >
                        <Link href={item.href}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.badge ? <SidebarMenuBadge className="bg-gold text-ink">{item.badge}</SidebarMenuBadge> : null}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                    <Avatar className="size-8 rounded-lg">
                      {user.photo && <AvatarImage src={user.photo} alt="" className="object-cover" />}
                      <AvatarFallback className="rounded-lg bg-tea text-white">{initials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{user.name}</span>
                      <span className="truncate text-xs text-sidebar-foreground/70">{user.subtitle ?? user.email}</span>
                    </span>
                    <ChevronsUpDown className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block font-semibold">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild><Link href="/app/profile"><UserRound /> My profile</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link href="/"><ExternalLink /> View the website</Link></DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form action="/auth/signout" method="post">
                    <DropdownMenuItem asChild>
                      <button type="submit" className="w-full"><LogOut /> Log out</button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="bg-paper">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-surface/95 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Show or hide the menu" />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <p className="min-w-0 truncate text-sm">
            {area && <span className="text-muted-foreground">{area} / </span>}
            <span className="font-semibold">{current?.label ?? ""}</span>
          </p>
          <span className="ml-auto hidden rounded-full bg-gold-tint px-2.5 py-0.5 text-xs font-semibold sm:inline">Preview</span>
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-semibold hover:bg-muted sm:ml-2">
            <ExternalLink className="size-4" /> <span className="hidden sm:inline">Website</span>
          </Link>
        </header>
        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </SidebarInset>
      <Toaster position="top-center" richColors />
    </SidebarProvider>
  );
}
