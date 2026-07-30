import type { Metadata } from "next"
import "@fontsource/cabin/400.css"
import "@fontsource/cabin/500.css"
import "@fontsource/cabin/600.css"
import "@fontsource/cabin/700.css"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "@fontsource/jetbrains-mono/400.css"
import "@fontsource/jetbrains-mono/500.css"
import { AppShell } from "@/components/app-shell"
import "./globals.css"

export const metadata: Metadata = {
  title: { default: "Lia OS", template: "%s | Lia OS" },
  description: "Lia Job Search — plataforma local-first de busca e candidatura a vagas com IA",
  icons: { icon: "/icon.svg" },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="fonts-pending">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            var d=document.documentElement;
            document.fonts.ready.then(function(){
              setTimeout(function(){
                d.className=d.className.replace("fonts-pending","fonts-ready")
              },100)
            });
            setTimeout(function(){
              d.className=d.className.replace("fonts-pending","fonts-ready")
            },2500)
          })()
        `}}/>
      </body>
    </html>
  )
}
