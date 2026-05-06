import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";

export type Notification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type State = {
  items: Notification[];
  loaded: boolean;
  load: () => Promise<void>;
  markAllRead: () => Promise<void>;
  unreadCount: () => number;
  clear: () => void;
};

export const useNotifications = create<State>((set, get) => ({
  items: [],
  loaded: false,
  load: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      set({ items: [], loaded: true });
      return;
    }
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);
    set({ items: (data ?? []) as Notification[], loaded: true });
  },
  markAllRead: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const now = new Date().toISOString();
    set({ items: get().items.map((n) => ({ ...n, read_at: n.read_at ?? now })) });
    await supabase.from("notifications").update({ read_at: now }).is("read_at", null).eq("user_id", u.user.id);
  },
  unreadCount: () => get().items.filter((n) => !n.read_at).length,
  clear: () => set({ items: [], loaded: false }),
}));
