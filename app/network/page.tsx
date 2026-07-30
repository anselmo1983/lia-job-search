import { NetworkTracker } from "@/components/local-trackers"
import { PageHeader } from "@/components/app-shell"

export const metadata = { title: "Network Tracker" }
export default function NetworkPage() { return <><PageHeader title="Network Tracker" description="Keep recruiters, referrals, and hiring managers organized. Contacts stay only in this browser."/><NetworkTracker/></> }
