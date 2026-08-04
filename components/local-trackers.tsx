"use client"

import { FormEvent, useEffect, useState } from "react"
import { CalendarDays, Check, Plus, Trash2, Users } from "lucide-react"

type Contact = { id: string; name: string; company: string; role: string; status: string }
type Task = { id: string; title: string; due: string; done: boolean }
type Interview = { id: string; company: string; role: string; date: string; stage: string }

function useStoredList<T>(key: string) {
  const [items, setItems] = useState<T[]>([])
  useEffect(() => {
    try { setItems(JSON.parse(localStorage.getItem(key) ?? "[]")) } catch { setItems([]) }
  }, [key])
  const update = (next: T[]) => { setItems(next); localStorage.setItem(key, JSON.stringify(next)) }
  return [items, update] as const
}

const inputClass = "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none placeholder:text-slate-600 focus:border-emerald-400"
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-300"

export function NetworkTracker() {
  const [contacts, setContacts] = useStoredList<Contact>("lia-network")
  const [form, setForm] = useState({ name: "", company: "", role: "", status: "A contatar" })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return
    setContacts([{ id: crypto.randomUUID(), ...form }, ...contacts])
    setForm({ name: "", company: "", role: "", status: "A contatar" })
  }
  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-5">
        <input aria-label="Nome do contato" className={inputClass} placeholder="Nome do contato" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input aria-label="Empresa" className={inputClass} placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input aria-label="Cargo" className={inputClass} placeholder="Cargo" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <select aria-label="Status" className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>A contatar</option>
          <option>Contatado</option>
          <option>Respondeu</option>
          <option>Acompanhamento</option>
        </select>
        <button className={buttonClass}><Plus className="h-4 w-4" />Adicionar contato</button>
      </form>
      {contacts.length === 0 ? (
        <LocalEmpty icon={Users} text="Adicione recrutadores, indicações e gestores de contratação à sua rede." />
      ) : (
        <div className="grid gap-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">
              <div>
                <p className="font-medium text-white">{contact.name}</p>
                <p className="text-sm text-slate-400">{contact.role || "Contato"}{contact.company && ` · ${contact.company}`}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-emerald-300 border border-slate-700">{contact.status}</span>
                <DeleteButton onClick={() => setContacts(contacts.filter((item) => item.id !== contact.id))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function TaskTracker() {
  const [tasks, setTasks] = useStoredList<Task>("lia-tasks")
  const [title, setTitle] = useState("")
  const [due, setDue] = useState("")
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim()) return
    setTasks([{ id: crypto.randomUUID(), title, due, done: false }, ...tasks])
    setTitle("")
    setDue("")
  }
  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:flex-row">
        <input aria-label="Tarefa" className={`${inputClass} flex-1`} placeholder="Fazer follow-up, adaptar currículo, pesquisar empresa..." value={title} onChange={(e) => setTitle(e.target.value)} />
        <input aria-label="Data limite" type="date" className={inputClass} value={due} onChange={(e) => setDue(e.target.value)} />
        <button className={buttonClass}><Plus className="h-4 w-4" />Adicionar tarefa</button>
      </form>
      {tasks.length === 0 ? (
        <LocalEmpty icon={Check} text="Transforme cada candidatura em um conjunto claro de próximas ações." />
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
              <button aria-label="Alternar tarefa" onClick={() => setTasks(tasks.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} className={`grid h-6 w-6 place-items-center rounded-full border ${task.done ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-slate-600"}`}>
                {task.done && <Check className="h-4 w-4" />}
              </button>
              <div className="flex-1">
                <p className={task.done ? "text-slate-500 line-through" : "text-white"}>{task.title}</p>
                {task.due && <p className="text-xs text-slate-500">Vencimento: {task.due}</p>}
              </div>
              <DeleteButton onClick={() => setTasks(tasks.filter((item) => item.id !== task.id))} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function InterviewCalendar() {
  const [interviews, setInterviews] = useStoredList<Interview>("lia-interviews")
  const [form, setForm] = useState({ company: "", role: "", date: "", stage: "Triagem Inicial" })
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.company.trim() || !form.date) return
    setInterviews([...interviews, { id: crypto.randomUUID(), ...form }].sort((a, b) => a.date.localeCompare(b.date)))
    setForm({ company: "", role: "", date: "", stage: "Triagem Inicial" })
  }
  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:grid-cols-5">
        <input aria-label="Empresa" className={inputClass} placeholder="Empresa" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input aria-label="Cargo" className={inputClass} placeholder="Cargo" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <input aria-label="Data da entrevista" type="datetime-local" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <select aria-label="Etapa" className={inputClass} value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
          <option>Triagem Inicial</option>
          <option>Entrevista com Gestor</option>
          <option>Teste Técnico</option>
          <option>Estudo de Caso</option>
          <option>Entrevista Final</option>
        </select>
        <button className={buttonClass}><Plus className="h-4 w-4" />Agendar</button>
      </form>
      {interviews.length === 0 ? (
        <LocalEmpty icon={CalendarDays} text="Agende entrevistas e mantenha cada etapa visível." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {interviews.map((interview) => (
            <div key={interview.id} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">{interview.stage}</p>
                  <h2 className="mt-2 font-semibold text-white">{interview.company}</h2>
                  <p className="text-sm text-slate-400">{interview.role || "Cargo não informado"}</p>
                  <time className="mt-3 block text-sm text-slate-300">{new Date(interview.date).toLocaleString("pt-BR")}</time>
                </div>
                <DeleteButton onClick={() => setInterviews(interviews.filter((item) => item.id !== interview.id))} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return <button aria-label="Excluir" onClick={onClick} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
}

function LocalEmpty({ icon: Icon, text }: { icon: typeof Users; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-700 p-10 text-center text-slate-400">
      <Icon className="mx-auto mb-3 h-8 w-8 text-slate-600" />
      <p>{text}</p>
      <p className="mt-1 text-xs text-slate-500">Salvo localmente no seu navegador.</p>
    </div>
  )
}
