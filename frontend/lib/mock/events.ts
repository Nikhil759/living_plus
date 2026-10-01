import { mockEvents } from "@/lib/mock/home";
import type { HomeEvent } from "@/lib/types/home";

export { mockEvents };

export function getEventById(id: string): HomeEvent | undefined {
  return mockEvents.find((event) => event.id === id);
}
