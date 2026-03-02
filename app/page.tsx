"use client";

import { useState, useEffect } from "react";

type BreakdownRow = {
  nome: string;
  total: number;
  pendentes: number;
  enviados: number;
  falhou: number;
  bloqueados: number;
};

type DashboardSearchResponse = {
  totalLeads: number;
  totalEnviados: number;
  totalPendentes: number;
  totalFalhou: number;
  totalBloqueados: number;
  breakdownProfessores: BreakdownRow[];
  breakdownEventos: BreakdownRow[];
  modoContagem: "exact" | "planned";
};

export default function Dashboard() {
  const [professores, setProfessores] = useState<string[]>([]);
  const [eventos, setEventos] = useState<string[]>([]);

  const [filtroProfessor, setFiltroProfessor] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroEvento, setFiltroEvento] = useState("Todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [totalLeads, setTotalLeads] = useState(0);
  const [totalEnviados, setTotalEnviados] = useState(0);
  const [totalPendentes, setTotalPendentes] = useState(0);
  const [totalFalhou, setTotalFalhou] = useState(0);
  const [totalBloqueados, setTotalBloqueados] = useState(0);
  const [breakdownProfessores, setBreakdownProfessores] = useState<
    BreakdownRow[]
  >([]);
  const [breakdownEventos, setBreakdownEventos] = useState<BreakdownRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [buscaFeita, setBuscaFeita] = useState(false);
  const [modoContagem, setModoContagem] = useState<"exact" | "planned">(
    "exact",
  );

  useEffect(() => {
    const carregarOpcoes = async () => {
      try {
        const res = await fetch("/api/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "options" }),
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Falha ao carregar opções: ${txt}`);
        }

        const data = (await res.json()) as {
          professores: string[];
          eventos: string[];
        };

        setProfessores(data.professores ?? []);
        setEventos(data.eventos ?? []);
      } catch (e) {
        console.error("Erro ao carregar opções:", e);
      }
    };
    carregarOpcoes();
  }, []);

  const carregarDados = async () => {
    setBuscaFeita(true);
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "search",
          filtros: {
            professor: filtroProfessor,
            status: filtroStatus,
            evento: filtroEvento,
            dataInicio,
            dataFim,
          },
          professoresBase: professores,
          eventosBase: eventos,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Falha ao buscar dados: ${txt}`);
      }

      const dados = (await res.json()) as DashboardSearchResponse;

      setTotalLeads(dados.totalLeads ?? 0);
      setTotalEnviados(dados.totalEnviados ?? 0);
      setTotalPendentes(dados.totalPendentes ?? 0);
      setTotalFalhou(dados.totalFalhou ?? 0);
      setTotalBloqueados(dados.totalBloqueados ?? 0);
      setBreakdownProfessores(dados.breakdownProfessores ?? []);
      setBreakdownEventos(dados.breakdownEventos ?? []);
      setModoContagem(dados.modoContagem ?? "exact");
    } catch (e) {
      console.error("Erro ao buscar dados:", e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => n.toLocaleString("pt-BR");

  const TabelaBreakdown = ({
    titulo,
    icone,
    linhas,
    gradiente,
  }: {
    titulo: string;
    icone: string;
    linhas: BreakdownRow[];
    gradiente: string;
  }) => (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
      <div
        className={`px-6 py-5 ${gradiente} flex justify-between items-center`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icone}</span>
          <h2 className="text-base font-bold text-white tracking-wide">
            {titulo}
          </h2>
        </div>
        <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
          {linhas.length} itens
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-100">
              <th className="px-5 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider">
                Nome
              </th>
              <th className="px-5 py-3 font-semibold text-gray-500 uppercase text-xs tracking-wider text-right">
                Total
              </th>
              <th className="px-5 py-3 font-semibold text-amber-500 uppercase text-xs tracking-wider text-right">
                Pendentes
              </th>
              <th className="px-5 py-3 font-semibold text-emerald-500 uppercase text-xs tracking-wider text-right">
                Enviados
              </th>
              <th className="px-5 py-3 font-semibold text-orange-500 uppercase text-xs tracking-wider text-right">
                Falhou
              </th>
              <th className="px-5 py-3 font-semibold text-rose-500 uppercase text-xs tracking-wider text-right">
                Bloqueados
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {linhas.map((row, i) => (
              <tr
                key={row.nome}
                className={`hover:bg-blue-50/40 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/50"}`}
              >
                <td className="px-5 py-3 font-semibold text-gray-800">
                  {row.nome}
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="font-bold text-gray-800 bg-gray-100 px-3 py-1 rounded-full text-xs">
                    {fmt(row.total)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-amber-700 bg-amber-50 px-3 py-1 rounded-full text-xs font-semibold">
                    {fmt(row.pendentes)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full text-xs font-semibold">
                    {fmt(row.enviados)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-orange-700 bg-orange-50 px-3 py-1 rounded-full text-xs font-semibold">
                    {fmt(row.falhou)}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-rose-700 bg-rose-50 px-3 py-1 rounded-full text-xs font-semibold">
                    {fmt(row.bloqueados)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gradient-to-r from-gray-100 to-gray-50 border-t-2 border-gray-200">
              <td className="px-5 py-4 font-bold text-gray-700 text-sm">
                Total geral
              </td>
              <td className="px-5 py-4 text-right font-bold text-gray-800">
                {fmt(linhas.reduce((s, r) => s + r.total, 0))}
              </td>
              <td className="px-5 py-4 text-right font-bold text-amber-700">
                {fmt(linhas.reduce((s, r) => s + r.pendentes, 0))}
              </td>
              <td className="px-5 py-4 text-right font-bold text-emerald-700">
                {fmt(linhas.reduce((s, r) => s + r.enviados, 0))}
              </td>
              <td className="px-5 py-4 text-right font-bold text-orange-700">
                {fmt(linhas.reduce((s, r) => s + r.falhou, 0))}
              </td>
              <td className="px-5 py-4 text-right font-bold text-rose-700">
                {fmt(linhas.reduce((s, r) => s + r.bloqueados, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );

  return (
    <div
      className="min-h-screen font-sans"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
      }}
    >
      {/* HEADER */}
      <div className="px-8 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">
            Dashboard de Disparos
          </h1>
          <span className="text-blue-400 font-semibold text-sm bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
            Weburn
          </span>
        </div>
        <p className="text-slate-400 text-sm ml-12">
          Aplique os filtros e clique em Buscar para ver os quantitativos.
        </p>
      </div>

      <div className="px-8 pb-8">
        {/* FILTROS */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-2xl mb-8 flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Professor
            </label>
            <select
              value={filtroProfessor}
              onChange={(e) => setFiltroProfessor(e.target.value)}
              className="border border-white/20 p-2.5 rounded-xl w-48 bg-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Todos" className="text-gray-800">
                Todos
              </option>
              {professores.map((p) => (
                <option key={p} value={p} className="text-gray-800">
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="border border-white/20 p-2.5 rounded-xl w-40 bg-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Todos" className="text-gray-800">
                Todos
              </option>
              <option value="enviado" className="text-gray-800">
                Enviado
              </option>
              <option value="pendente" className="text-gray-800">
                Pendente
              </option>
              <option value="falhou" className="text-gray-800">
                Falhou
              </option>
              <option value="bloqueado" className="text-gray-800">
                Bloqueado
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Evento
            </label>
            <select
              value={filtroEvento}
              onChange={(e) => setFiltroEvento(e.target.value)}
              className="border border-white/20 p-2.5 rounded-xl w-52 bg-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Todos" className="text-gray-800">
                Todos
              </option>
              {eventos.map((ev) => (
                <option key={ev} value={ev} className="text-gray-800">
                  {ev}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Data Início
            </label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border border-white/20 p-2.5 rounded-xl bg-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Data Fim
            </label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border border-white/20 p-2.5 rounded-xl bg-white/10 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={carregarDados}
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white font-semibold py-2.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{" "}
                  Buscando...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>{" "}
                  Buscar
                </>
              )}
            </button>
            <button
              onClick={() => {
                setFiltroProfessor("Todos");
                setFiltroStatus("Todos");
                setFiltroEvento("Todos");
                setDataInicio("");
                setDataFim("");
                setBuscaFeita(false);
              }}
              className="bg-white/10 hover:bg-white/20 text-slate-300 font-medium py-2.5 px-4 rounded-xl transition-colors border border-white/10"
            >
              Limpar
            </button>
          </div>
        </div>

        {/* RESULTADO */}
        {!buscaFeita ? (
          <div className="flex flex-col justify-center items-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                />
              </svg>
            </div>
            <p className="text-slate-400 text-base">
              Ajuste os filtros e clique em{" "}
              <span className="text-blue-400 font-semibold">Buscar</span>
            </p>
          </div>
        ) : loading ? (
          <div className="flex flex-col justify-center items-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-blue-400 text-base font-medium">
              Consultando base de dados...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* CARDS GERAIS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-5">
              <div
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-1">
                    <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider">
                      Total Filtrado
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-white/20 text-blue-50 px-2 py-0.5 rounded-full w-fit">
                      {modoContagem === "exact" ? "exato" : "estimado"}
                    </span>
                  </div>
                  <span className="text-2xl">📊</span>
                </div>
                <p className="text-4xl font-bold text-white">
                  {fmt(totalLeads)}
                </p>
                <p className="text-blue-200 text-xs">leads encontrados</p>
              </div>
              <div
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{
                  background: "linear-gradient(135deg, #f59e0b, #d97706)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-amber-100 text-xs font-semibold uppercase tracking-wider">
                    Pendentes
                  </p>
                  <span className="text-2xl">⏳</span>
                </div>
                <p className="text-4xl font-bold text-white">
                  {fmt(totalPendentes)}
                </p>
                <p className="text-amber-200 text-xs">aguardando disparo</p>
              </div>
              <div
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{
                  background: "linear-gradient(135deg, #10b981, #059669)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">
                    Enviados
                  </p>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="text-4xl font-bold text-white">
                  {fmt(totalEnviados)}
                </p>
                <p className="text-emerald-200 text-xs">mensagens disparadas</p>
              </div>
              <div
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{
                  background: "linear-gradient(135deg, #f97316, #c2410c)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-orange-100 text-xs font-semibold uppercase tracking-wider">
                    Falhou
                  </p>
                  <span className="text-2xl">⚠️</span>
                </div>
                <p className="text-4xl font-bold text-white">
                  {fmt(totalFalhou)}
                </p>
                <p className="text-orange-200 text-xs">erro no disparo</p>
              </div>
              <div
                className="rounded-2xl p-6 flex flex-col gap-3"
                style={{
                  background: "linear-gradient(135deg, #f43f5e, #be123c)",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="text-rose-100 text-xs font-semibold uppercase tracking-wider">
                    Bloqueados
                  </p>
                  <span className="text-2xl">🚫</span>
                </div>
                <p className="text-4xl font-bold text-white">
                  {fmt(totalBloqueados)}
                </p>
                <p className="text-rose-200 text-xs">números bloqueados</p>
              </div>
            </div>

            {/* BREAKDOWN PROFESSOR */}
            {breakdownProfessores.length > 0 && (
              <TabelaBreakdown
                titulo="Por Professor"
                icone="👨‍🏫"
                linhas={breakdownProfessores}
                gradiente="bg-gradient-to-r from-blue-600 to-blue-700"
              />
            )}

            {/* BREAKDOWN EVENTO */}
            {breakdownEventos.length > 0 && (
              <TabelaBreakdown
                titulo="Por Evento"
                icone="📌"
                linhas={breakdownEventos}
                gradiente="bg-gradient-to-r from-indigo-600 to-violet-700"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
