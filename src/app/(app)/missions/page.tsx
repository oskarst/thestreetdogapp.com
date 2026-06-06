import { redirect } from "next/navigation";

// The raion/district grid view was removed (unused). /missions now points
// at the mission chooser so any old link or bookmark lands somewhere useful
// instead of 404ing.
export default function MissionsPage() {
  redirect("/missions/start");
}
