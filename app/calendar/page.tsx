import { InterviewCalendar } from "@/components/local-trackers"
import { PageHeader } from "@/components/app-shell"

export const metadata = { title: "Interview Calendar" }
export default function CalendarPage() { return <><PageHeader title="Interview Calendar" description="Schedule every interview stage and keep upcoming conversations in one place."/><InterviewCalendar/></> }
