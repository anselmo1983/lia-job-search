import { CandidateProfile } from "@/lib/db/profile-schema"

export function escapeLatex(text: string): string {
  if (!text) return ""
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/&/g, "\\&")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
}

export function renderTailoredLatexCv(
  profile: CandidateProfile,
  job: { title: string; company: string; description?: string }
): string {
  const { identity, contact, skills, experiences, projects, education, certifications } = profile

  const [firstName, ...lastNameParts] = (identity.fullName || "Candidate").split(" ")
  const lastName = lastNameParts.join(" ") || "Name"

  const summaryText = escapeLatex(
    identity.summary || `${identity.fullName} - ${identity.headline || "Software Engineering Professional"}`
  )

  const primarySkills = (skills.primary || []).map(escapeLatex).join(", ")
  const secondarySkills = (skills.secondary || []).map(escapeLatex).join(", ")
  const toolsSkills = (skills.tools || []).map(escapeLatex).join(", ")
  const domainSkills = (skills.domains || []).map(escapeLatex).join(", ")

  const expBlocks = (experiences || []).map((exp) => {
    const bullets = (exp.highlights || [])
      .map((h) => `    \\item ${escapeLatex(h)}`)
      .join("\n")

    return `\\item{\\cventry{${escapeLatex(exp.startDate)}--${escapeLatex(exp.endDate)}}{${escapeLatex(
      exp.role
    )}}{${escapeLatex(exp.company)}}{${escapeLatex(exp.location || "")}}{}{\\vspace{1pt}
\\begin{itemize}
${bullets || "    \\item " + escapeLatex(exp.role + " na " + exp.company)}
\\end{itemize}}}`
  }).join("\n\n\\vspace{3pt}\n\n")

  const projBlocks = (projects || []).map((p) => {
    const stack = p.techStack.length > 0 ? ` (${escapeLatex(p.techStack.join(", "))})` : ""
    const bullets = (p.highlights || []).map((h) => `    \\item ${escapeLatex(h)}`).join("\n")
    return `\\item{\\cventry{}{${escapeLatex(p.name)}${stack}}{${escapeLatex(p.role || "Projeto")}}{}{}{\\vspace{1pt}
${escapeLatex(p.description)}
\\begin{itemize}
${bullets || "    \\item " + escapeLatex(p.name)}
\\end{itemize}}}`
  }).join("\n\n\\vspace{3pt}\n\n")

  const eduBlocks = (education || []).map((e) => {
    return `\\item{\\cventry{${escapeLatex(e.startYear)}--${escapeLatex(e.endYear)}}{${escapeLatex(
      e.degree
    )} em ${escapeLatex(e.field)}}{${escapeLatex(e.institution)}}{}{}{${
      e.thesis ? `Tese: "${escapeLatex(e.thesis)}"` : ""
    }}}`
  }).join("\n\n")

  const certBlocks = (certifications || []).map((c) => {
    return `\\item \\textbf{${escapeLatex(c.name)}}${c.hours ? ` (${c.hours}h)` : ""} -- Concluído em ${escapeLatex(c.completedDate)}`
  }).join("\n")

  return `%% Tailored CV for ${escapeLatex(job.title)} at ${escapeLatex(job.company)}
\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{banking}
\\moderncvcolor{blue}

\\renewcommand*{\\firstnamestyle}[1]{{\\fontsize{34}{36}\\bfseries\\upshape\\color{color1}#1}}
\\renewcommand*{\\lastnamestyle}[1]{{\\fontsize{34}{36}\\bfseries\\upshape\\color{color1}#1}}
\\renewcommand*{\\sectionstyle}[1]{{\\sectionfont\\color{color1}#1}}

\\usepackage[utf8]{inputenc}
\\usepackage{hyperref}
\\usepackage[scale=0.80]{geometry}
\\usepackage{import}

\\name{${escapeLatex(firstName)}}{${escapeLatex(lastName)}}
\\address{${escapeLatex(contact.location || identity.location || "")}}{}{}
\\phone[mobile]{${escapeLatex(contact.phone || identity.phone || "")}}
\\email{${escapeLatex(contact.email || identity.email || "")}}
\\extrainfo{${identity.linkedinUrl ? `\\href{${escapeLatex(identity.linkedinUrl)}}{LinkedIn}` : ""}${
    identity.githubUrl ? `, \\href{${escapeLatex(identity.githubUrl)}}{GitHub}` : ""
  }}

\\begin{document}

\\makecvtitle

\\vspace{6pt}
\\small{${summaryText}}

\\section{Core Competencies}
\\vspace{1pt}
\\begin{itemize}
${primarySkills ? `\\item \\textbf{Primary Skills}: ${primarySkills}` : ""}
${secondarySkills ? `\\item \\textbf{Secondary Skills}: ${secondarySkills}` : ""}
${domainSkills ? `\\item \\textbf{Domain Expertise}: ${domainSkills}` : ""}
${toolsSkills ? `\\item \\textbf{Tools \\& Platforms}: ${toolsSkills}` : ""}
\\end{itemize}

\\section{Professional Experience}
\\vspace{3pt}
\\begin{itemize}
${expBlocks || "\\item N/A"}
\\end{itemize}

${projBlocks ? `\\section{Key Projects}
\\vspace{3pt}
\\begin{itemize}
${projBlocks}
\\end{itemize}` : ""}

\\section{Education}
\\vspace{3pt}
\\begin{itemize}
${eduBlocks || "\\item N/A"}
\\end{itemize}

${certBlocks ? `\\section{Certifications}
\\vspace{1pt}
\\begin{itemize}
${certBlocks}
\\end{itemize}` : ""}

\\end{document}
`
}

export function renderTailoredLatexCoverLetter(
  profile: CandidateProfile,
  job: { title: string; company: string; description?: string }
): string {
  const { identity, contact, experiences, skills } = profile

  const fullName = escapeLatex(identity.fullName || "Candidate")
  const email = escapeLatex(contact.email || identity.email || "")
  const phone = escapeLatex(contact.phone || identity.phone || "")
  const company = escapeLatex(job.company || "Company")
  const jobTitle = escapeLatex(job.title || "Position")

  const evidences = (skills.evidences || []).slice(0, 3)
  const achievementBullets = evidences.length > 0
    ? evidences.map((e) => `    \\item \\textbf{${escapeLatex(e.skill)}}: ${escapeLatex(e.evidence.join("; ") || e.skill)}`).join("\n")
    : (experiences[0]?.highlights || []).slice(0, 3).map((h) => `    \\item ${escapeLatex(h)}`).join("\n")

  return `%% Tailored Cover Letter for ${jobTitle} at ${company}
\\documentclass[]{cover}
\\usepackage{fancyhdr}

\\pagestyle{fancy}
\\fancyhf{}

\\rfoot{Page \\thepage \\hspace{0pt}}
\\thispagestyle{empty}
\\renewcommand{\\headrulewidth}{0pt}
\\begin{document}

\\namesection{}{\\Huge{${fullName}}}{ \\href{mailto:${email}}{${email}} | [${phone}] | \\urlstyle{same}\\href{${escapeLatex(
    identity.linkedinUrl || ""
  )}}{LinkedIn} }

\\currentdate{\\today}
\\lettercontent{Dear Hiring Team at ${company},}

\\lettercontent{I am writing to express my strong enthusiasm for the ${jobTitle} position at ${company}. With my background as a ${escapeLatex(
    identity.headline || "Software Engineering Specialist"
  )}, I am confident in delivering immediate value to your team's objectives.}

\\lettercontent{Throughout my professional journey, I have built verified technical competencies and delivered scalable engineering solutions. Highlights of my core contributions include:}

{\\raggedright\\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\\fontsize{11pt}{13pt}\\selectfont
\\begin{itemize}
${achievementBullets || "    \\item \\textbf{Proven Technical Excellence}: Solida experiencia em sistemas web e backend."}
\\end{itemize}\\par}
\\vspace{6pt}

\\lettercontent{I am particularly drawn to ${company}'s commitment to innovation and high engineering standards. My background aligns directly with the requirements for the ${jobTitle} role.}

\\lettercontent{I welcome the opportunity to discuss how my technical expertise and problem-solving approach will support ${company}'s ongoing success.}

\\lettercontent{Thank you for your time and consideration.}

\\begin{flushright}
\\closing{Kind regards,}

\\signature{${fullName}}
\\end{flushright}
\\end{document}
`
}
