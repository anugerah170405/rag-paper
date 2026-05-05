import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'
import MainPanel from './MainPanel'

export default function AppLayout({
}: {
    }) {
    //   const { isSidebarOpen, isChatOpen } = useUIStore()

    return (
        <div className="h-screen flex overflow-hidden">

            {/* LEFT SIDEBAR */}
            <Sidebar />

            {/* MAIN */}
            <MainPanel />

            {/* RIGHT CHAT */}
            <ChatPanel />

        </div>
    )
}
