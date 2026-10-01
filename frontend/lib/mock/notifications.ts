export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

export const mockNotifications: AppNotification[] = [
  {
    id: "n1",
    title: "Package at Gate 1",
    body: "2 packages arrived for C-702 at Security Gate 1 desk.",
    time: "2h ago",
    read: false,
  },
  {
    id: "n2",
    title: "FIFA night RSVP",
    body: "Rohan confirmed you’re going to FIFA 24 Tournament & Game Night.",
    time: "5h ago",
    read: false,
  },
  {
    id: "n3",
    title: "Water maintenance",
    body: "Tower B supply paused 2:00 PM – 4:00 PM today.",
    time: "Yesterday",
    read: true,
  },
];
