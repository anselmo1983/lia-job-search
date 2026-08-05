import { ResumeDocument } from "@/lib/db/resume-schema"
import { escapeLatex } from "@/lib/services/latex-generator"

export interface RenderResult {
  format: "latex" | "html"
  content: string
  mimeType: string
}

export function renderResumeToLatex(doc: ResumeDocument): string {
  const { basics, sections, meta } = doc
  const [firstName, ...lastNameParts] = (basics.fullName || "Candidato").split(" ")
  const lastName = lastNameParts.join(" ") || ""

  const summaryText = escapeLatex(basics.summary || `${basics.fullName} - ${basics.headline}`)

  const primarySkills = (sections.skills.primary || []).map(escapeLatex).join(", ")
  const secondarySkills = (sections.skills.secondary || []).map(escapeLatex).join(", ")
  const toolsSkills = (sections.skills.tools || []).map(escapeLatex).join(", ")
  const domainSkills = (sections.skills.domains || []).map(escapeLatex).join(", ")

  const expBlocks = (sections.experiences || [])
    .filter((e) => e.visible)
    .map((exp) => {
      const bullets = (exp.highlights || []).map((h) => `    \\item ${escapeLatex(h)}`).join("\n")
      return `\\item{\\cventry{${escapeLatex(exp.startDate)}--${escapeLatex(exp.endDate)}}{${escapeLatex(
        exp.role
      )}}{${escapeLatex(exp.company)}}{${escapeLatex(exp.location || "")}}{}{\\vspace{1pt}
\\begin{itemize}
${bullets || "    \\item " + escapeLatex(exp.role + " na " + exp.company)}
\\end{itemize}}}`
    })
    .join("\n\n\\vspace{3pt}\n\n")

  const projBlocks = (sections.projects || [])
    .filter((p) => p.visible)
    .map((p) => {
      const stack = p.techStack.length > 0 ? ` (${escapeLatex(p.techStack.join(", "))})` : ""
      const bullets = (p.highlights || []).map((h) => `    \\item ${escapeLatex(h)}`).join("\n")
      return `\\item{\\cventry{}{${escapeLatex(p.name)}${stack}}{${escapeLatex(p.role || "Projeto")}}{}{}{\\vspace{1pt}
${escapeLatex(p.description)}
\\begin{itemize}
${bullets || "    \\item " + escapeLatex(p.name)}
\\end{itemize}}}`
    })
    .join("\n\n\\vspace{3pt}\n\n")

  const eduBlocks = (sections.education || [])
    .filter((e) => e.visible)
    .map((e) => {
      return `\\item{\\cventry{${escapeLatex(e.startYear)}--${escapeLatex(e.endYear)}}{${escapeLatex(
        e.degree
      )} em ${escapeLatex(e.field)}}{${escapeLatex(e.institution)}}{}{}{${
        e.thesis ? `Tese: "${escapeLatex(e.thesis)}"` : ""
      }}}`
    })
    .join("\n\n")

  const certBlocks = (sections.certifications || [])
    .filter((c) => c.visible)
    .map((c) => {
      return `\\item \\textbf{${escapeLatex(c.name)}}${c.hours ? ` (${c.hours}h)` : ""} -- ${escapeLatex(c.completedDate)}`
    })
    .join("\n")

  return `%% Documento Compilado: ${escapeLatex(doc.title)}
\\documentclass[${meta.fontSize || "11pt"},a4paper,sans]{moderncv}
\\moderncvstyle{banking}
\\moderncvcolor{${meta.color || "blue"}}

\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}
\\usepackage[scale=0.80]{geometry}
\\usepackage{import}

\\name{${escapeLatex(firstName)}}{${escapeLatex(lastName)}}
\\address{${escapeLatex(basics.location || "")}}{}{}
\\phone[mobile]{${escapeLatex(basics.phone || "")}}
\\email{${escapeLatex(basics.email || "")}}
\\extrainfo{${basics.linkedinUrl ? `\\href{${escapeLatex(basics.linkedinUrl)}}{LinkedIn}` : ""}${
    basics.githubUrl ? `, \\href{${escapeLatex(basics.githubUrl)}}{GitHub}` : ""
  }}

\\begin{document}

\\makecvtitle

\\vspace{6pt}
\\small{${summaryText}}

\\section{Competências Principais}
\\begin{itemize}
  ${primarySkills ? `\\item \\textbf{Principais:} ${primarySkills}` : ""}
  ${toolsSkills ? `\\item \\textbf{Ferramentas \& Frameworks:} ${toolsSkills}` : ""}
  ${domainSkills ? `\\item \\textbf{Domínios:} ${domainSkills}` : ""}
  ${secondarySkills ? `\\item \\textbf{Outras:} ${secondarySkills}` : ""}
\\end{itemize}

\\section{Experiência Profissional}
\\begin{itemize}
${expBlocks || "\\item Nenhuma experiência selecionada."}
\\end{itemize}

${
  projBlocks
    ? `\\section{Projetos em Destaque}
\\begin{itemize}
${projBlocks}
\\end{itemize}`
    : ""
}

\\section{Formação Acadêmica}
\\begin{itemize}
${eduBlocks || "\\item Formação acadêmica em andamento/concluída."}
\\end{itemize}

${
  certBlocks
    ? `\\section{Certificações}
\\begin{itemize}
${certBlocks}
\\end{itemize}`
    : ""
}

\\end{document}
`
}

export function renderResumeToHtml(doc: ResumeDocument): string {
  const { basics, sections } = doc
  const expItems = (sections.experiences || [])
    .filter((e) => e.visible)
    .map(
      (e) => `
    <div class="mb-4">
      <div class="flex justify-between items-baseline font-semibold text-slate-900 dark:text-slate-100">
        <span>${e.role} — <span class="text-emerald-600 dark:text-emerald-400">${e.company}</span></span>
        <span class="text-xs text-slate-500 font-mono">${e.startDate} - ${e.endDate}</span>
      </div>
      ${e.location ? `<div class="text-xs text-slate-500 mb-1">${e.location}</div>` : ""}
      <ul class="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1 mt-1">
        ${(e.highlights || []).map((h) => `<li>${h}</li>`).join("")}
      </ul>
    </div>
  `
    )
    .join("")

  const projItems = (sections.projects || [])
    .filter((p) => p.visible)
    .map(
      (p) => `
    <div class="mb-3">
      <div class="flex justify-between items-baseline font-semibold text-slate-900 dark:text-slate-100">
        <span>${p.name} ${p.role ? `<span class="text-xs font-normal text-slate-500">(${p.role})</span>` : ""}</span>
      </div>
      <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">${p.description}</p>
      <ul class="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 space-y-1 mt-1">
        ${(p.highlights || []).map((h) => `<li>${h}</li>`).join("")}
      </ul>
    </div>
  `
    )
    .join("")

  const eduItems = (sections.education || [])
    .filter((e) => e.visible)
    .map(
      (e) => `
    <div class="mb-2 flex justify-between text-xs text-slate-800 dark:text-slate-200">
      <div><strong>${e.degree} em ${e.field}</strong> — ${e.institution}</div>
      <div class="font-mono text-slate-500">${e.startYear} - ${e.endYear}</div>
    </div>
  `
    )
    .join("")

  return `
<div class="resume-preview font-sans p-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 max-w-3xl mx-auto rounded-lg shadow-sm border border-slate-200 dark:border-slate-800 text-sm">
  <header class="border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
    <h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">${basics.fullName}</h1>
    <p class="text-emerald-600 dark:text-emerald-400 font-medium text-sm mt-0.5">${basics.headline}</p>
    <div class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-2">
      ${basics.email ? `<span>📧 ${basics.email}</span>` : ""}
      ${basics.phone ? `<span>📞 ${basics.phone}</span>` : ""}
      ${basics.location ? `<span>📍 ${basics.location}</span>` : ""}
      ${basics.linkedinUrl ? `<a href="${basics.linkedinUrl}" target="_blank" class="text-blue-500 hover:underline">LinkedIn</a>` : ""}
      ${basics.githubUrl ? `<a href="${basics.githubUrl}" target="_blank" class="text-slate-700 dark:text-slate-300 hover:underline">GitHub</a>` : ""}
    </div>
  </header>

  ${basics.summary ? `<section class="mb-5"><p class="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">${basics.summary}</p></section>` : ""}

  <section class="mb-5">
    <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Experiência Profissional</h2>
    ${expItems || '<p class="text-xs text-slate-400">Nenhuma experiência.</p>'}
  </section>

  ${
    projItems
      ? `<section class="mb-5">
    <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Projetos</h2>
    ${projItems}
  </section>`
      : ""
  }

  <section class="mb-4">
    <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">Formação Acadêmica</h2>
    ${eduItems}
  </section>
</div>
`
}

export function renderResumeDocument(
  doc: ResumeDocument,
  format: "latex" | "html"
): RenderResult {
  if (format === "latex") {
    return {
      format: "latex",
      content: renderResumeToLatex(doc),
      mimeType: "text/x-tex",
    }
  }

  return {
    format: "html",
    content: renderResumeToHtml(doc),
    mimeType: "text/html",
  }
}
