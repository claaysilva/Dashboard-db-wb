import "server-only";

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type BreakdownRow = {
  nome: string;
  total: number;
  pendentes: number;
  enviados: number;
  falhou: number;
  bloqueados: number;
};

type Filtros = {
  professor: string;
  status: string;
  evento: string;
  dataInicio: string;
  dataFim: string;
};

const ALLOWED_STATUS = ["Todos", "enviado", "pendente", "falhou", "bloqueado"];

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável de ambiente ausente: ${name}`);
  return value;
}

function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = getEnvOrThrow("SUPABASE_URL");
  const supabaseServiceRole = getEnvOrThrow("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(supabaseUrl, supabaseServiceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function sanitizeText(value: unknown, max = 120): string {
  if (typeof value !== "string") return "Todos";
  return value.trim().slice(0, max);
}

function sanitizeDate(value: unknown): string {
  if (typeof value !== "string") return "";
  const v = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

function sanitizeStringArray(value: unknown, maxItems = 300): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizeFiltros(raw: unknown): Filtros {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const status = sanitizeText(obj.status);
  return {
    professor: sanitizeText(obj.professor),
    status: ALLOWED_STATUS.includes(status) ? status : "Todos",
    evento: sanitizeText(obj.evento),
    dataInicio: sanitizeDate(obj.dataInicio),
    dataFim: sanitizeDate(obj.dataFim),
  };
}

function hasStrongFilter(f: Filtros): boolean {
  return (
    f.professor !== "Todos" ||
    f.evento !== "Todos" ||
    Boolean(f.dataInicio) ||
    Boolean(f.dataFim) ||
    f.status !== "Todos"
  );
}

function buildBase(
  supabase: SupabaseClient,
  f: Filtros,
  countMode: "exact" | "planned",
) {
  let q = supabase.from("leads").select("id", { count: countMode, head: true });
  if (f.professor !== "Todos") q = q.eq("Professor", f.professor);
  if (f.evento !== "Todos") q = q.eq("evento", f.evento);
  if (f.dataInicio) q = q.gte("data_ultima_venda", f.dataInicio);
  if (f.dataFim) q = q.lte("data_ultima_venda", f.dataFim);
  return q;
}

async function loadDistinctOptions(supabase: SupabaseClient) {
  const [{ data: profs, error: ep }, { data: evs, error: ee }] =
    await Promise.all([
      supabase.rpc("get_distinct_professores"),
      supabase.rpc("get_distinct_eventos"),
    ]);

  let professores: string[] = [];
  let eventos: string[] = [];

  if (!ep && profs) {
    professores = (profs as { val: string }[])
      .map((r) => r.val)
      .filter(Boolean)
      .sort();
  } else {
    const { data: profsFallback } = await supabase
      .from("leads")
      .select("Professor")
      .not("Professor", "is", null)
      .limit(50000);
    professores = [
      ...new Set((profsFallback ?? []).map((p) => p.Professor).filter(Boolean)),
    ].sort();
  }

  if (!ee && evs) {
    eventos = (evs as { val: string }[])
      .map((r) => r.val)
      .filter(Boolean)
      .sort();
  } else {
    const { data: evsFallback } = await supabase
      .from("leads")
      .select("evento")
      .not("evento", "is", null)
      .limit(50000);
    eventos = [
      ...new Set((evsFallback ?? []).map((e) => e.evento).filter(Boolean)),
    ].sort();
  }

  return { professores, eventos };
}

async function contarGrupo(
  supabase: SupabaseClient,
  campo: "Professor" | "evento",
  valor: string,
  filtros: Filtros,
  countMode: "exact" | "planned",
): Promise<BreakdownRow> {
  const base = () => {
    let q = supabase
      .from("leads")
      .select("id", { count: countMode, head: true })
      .eq(campo, valor);

    if (campo !== "Professor" && filtros.professor !== "Todos")
      q = q.eq("Professor", filtros.professor);
    if (campo !== "evento" && filtros.evento !== "Todos")
      q = q.eq("evento", filtros.evento);
    if (filtros.dataInicio) q = q.gte("data_ultima_venda", filtros.dataInicio);
    if (filtros.dataFim) q = q.lte("data_ultima_venda", filtros.dataFim);

    return q;
  };

  const [
    { count: total },
    { count: pendentes },
    { count: enviados },
    { count: falhou },
    { count: bloqueados },
  ] = await Promise.all([
    base(),
    base().ilike("status_envio", "pendente%"),
    base().ilike("status_envio", "enviado%"),
    base().or(
      "status_envio.ilike.falhou*,status_envio.ilike.erro*,status_envio.ilike.failed*",
    ),
    base().eq("bloqueado", true),
  ]);

  return {
    nome: valor,
    total: total ?? 0,
    pendentes: pendentes ?? 0,
    enviados: enviados ?? 0,
    falhou: falhou ?? 0,
    bloqueados: bloqueados ?? 0,
  };
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabaseClient();
    const body = (await request.json()) as Record<string, unknown>;
    const type = sanitizeText(body.type, 20);

    if (type === "options") {
      const { professores, eventos } = await loadDistinctOptions(supabase);
      return NextResponse.json({ professores, eventos });
    }

    if (type !== "search") {
      return NextResponse.json(
        { error: "Tipo de operação inválido." },
        { status: 400 },
      );
    }

    const filtros = normalizeFiltros(body.filtros);
    const professoresBase = sanitizeStringArray(body.professoresBase);
    const eventosBase = sanitizeStringArray(body.eventosBase);

    const countMode: "exact" | "planned" = hasStrongFilter(filtros)
      ? "exact"
      : "planned";

    let totalQuery = buildBase(supabase, filtros, countMode);
    if (filtros.status === "bloqueado") {
      totalQuery = totalQuery.eq("bloqueado", true);
    } else if (filtros.status === "enviado") {
      totalQuery = totalQuery.ilike("status_envio", "enviado%");
    } else if (filtros.status === "pendente") {
      totalQuery = totalQuery.ilike("status_envio", "pendente%");
    } else if (filtros.status === "falhou") {
      totalQuery = totalQuery.or(
        "status_envio.ilike.falhou*,status_envio.ilike.erro*,status_envio.ilike.failed*",
      );
    }

    const [
      { count: total, error: e1 },
      { count: enviados, error: e2 },
      { count: pendentes, error: e3 },
      { count: falhou, error: e4 },
      { count: bloqueados, error: e5 },
    ] = await Promise.all([
      totalQuery,
      buildBase(supabase, filtros, countMode).ilike("status_envio", "enviado%"),
      buildBase(supabase, filtros, countMode).ilike("status_envio", "pendente%"),
      buildBase(supabase, filtros, countMode).or(
        "status_envio.ilike.falhou*,status_envio.ilike.erro*,status_envio.ilike.failed*",
      ),
      buildBase(supabase, filtros, countMode).eq("bloqueado", true),
    ]);

    const erros = [e1, e2, e3, e4, e5].filter(Boolean);
    if (erros.length) {
      return NextResponse.json(
        {
          error: "Falha ao consultar dados no Supabase.",
          details: erros,
        },
        { status: 500 },
      );
    }

    const professoresParaBreakdown =
      filtros.professor === "Todos" ? professoresBase : [filtros.professor];
    const eventosParaBreakdown =
      filtros.evento === "Todos" ? eventosBase : [filtros.evento];

    const [rowsProf, rowsEvt] = await Promise.all([
      Promise.all(
        professoresParaBreakdown.map((p) =>
          contarGrupo(supabase, "Professor", p, filtros, countMode),
        ),
      ),
      Promise.all(
        eventosParaBreakdown.map((ev) =>
          contarGrupo(supabase, "evento", ev, filtros, countMode),
        ),
      ),
    ]);

    return NextResponse.json({
      totalLeads: total ?? 0,
      totalEnviados: enviados ?? 0,
      totalPendentes: pendentes ?? 0,
      totalFalhou: falhou ?? 0,
      totalBloqueados: bloqueados ?? 0,
      breakdownProfessores: rowsProf
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total),
      breakdownEventos: rowsEvt
        .filter((r) => r.total > 0)
        .sort((a, b) => b.total - a.total),
      modoContagem: countMode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
