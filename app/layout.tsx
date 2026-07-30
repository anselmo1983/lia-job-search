import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { AppShell } from "@/components/app-shell"
import "./globals.css"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans", display: "optional" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "optional" })

export const metadata: Metadata = {
  title: { default: "LIA Job Search", template: "%s | LIA Job Search" },
  description: "Interface local para gerenciar vagas, candidaturas e documentos",
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className="fonts-pending"><body className={`${geist.variable} ${geistMono.variable} antialiased`}><AppShell>{children}</AppShell><script dangerouslySetInnerHTML={{__html:`
    (function(){var d=document.documentElement;document.fonts.ready.then(function(){setTimeout(function(){d.className=d.className.replace("fonts-pending","fonts-ready")},100)});setTimeout(function(){d.className=d.className.replace("fonts-pending","fonts-ready")},2500)})()`}}/></body></html>
}
