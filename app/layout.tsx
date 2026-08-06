import type { Metadata } from "next"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "@fontsource/jetbrains-mono/400.css"
import "@fontsource/jetbrains-mono/500.css"
import "./globals.css"

import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

export const metadata: Metadata = {
  title: { default: "Lia OS", template: "%s | Lia OS" },
  description: "Lia Job Search — plataforma local-first de busca e candidatura a vagas com IA",
  icons: { icon: "/icon.svg" },
}

// CT224 — O AppShell (sidebar) agora vive no layout do grupo protegido
// (app/(protected)/layout.tsx). A página /login fica fora do shell.
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className="fonts-pending">
      <body className="antialiased">
        {children}
        <Analytics />
        <SpeedInsights />
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
