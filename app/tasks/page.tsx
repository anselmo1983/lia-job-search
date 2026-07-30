import { TaskTracker } from "@/components/local-trackers"
import { PageHeader } from "@/components/app-shell"

export const metadata = { title: "Task Tracker" }
export default function TasksPage() { return <><PageHeader title="Task Tracker" description="Plan follow-ups, research, resume tailoring, and interview preparation without losing momentum."/><TaskTracker/></> }
