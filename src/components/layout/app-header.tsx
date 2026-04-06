"use client";

import { Bell } from "lucide-react";
import { PageHeader, PageTitle, PageActions } from "@/components/ui/sidebar";
import { IconButton } from "@/components/ui/button";

interface AppHeaderProps {
  title: string;
  actions?: React.ReactNode;
}

export function AppHeader({ title, actions }: AppHeaderProps) {
  return (
    <PageHeader>
      <PageTitle>{title}</PageTitle>
      <PageActions>
        {actions}
        <IconButton appearance="subtle">
          <Bell />
        </IconButton>
      </PageActions>
    </PageHeader>
  );
}
