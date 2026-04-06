"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, Bell } from "lucide-react";

interface AppHeaderProps {
  title: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { data: session } = useSession();

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-6">
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          {session?.user?.name}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
