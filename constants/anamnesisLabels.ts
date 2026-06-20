/**
 * anamnesisLabels.ts — Fonte da verdade para EXIBIÇÃO dos dados da anamnese.
 *
 * O app do aluno grava CÓDIGOS (ex.: tempo_treino = "1_3a") e arrays/jsonb.
 * A ficha do aluno (plataforma do nutricionista) deve traduzir esses códigos
 * para texto legível usando os mapas abaixo.
 *
 * Arquivo PROPOSITALMENTE sem imports / dependências — pode ser copiado tal
 * qual para o repo da plataforma (web/node) sem puxar React Native.
 *
 * Chaves dos mapas = NOME DA COLUNA no banco (snake_case) → código → label.
 * IMPORTANTE: o mapa é POR CAMPO (não global), porque o mesmo código pode
 * existir em campos diferentes (ex.: "pre_treino" em refeicoes e em
 * suplementos_atuais).
 */

// ─── Escolha única (valor = 1 código) ─────────────────────────────

export const SEXO_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  feminino: 'Feminino',
};

export const OBJETIVO_LABELS: Record<string, string> = {
  perder_gordura: 'Perder gordura',
  ganhar_massa: 'Ganhar massa muscular',
  manter_peso: 'Manter peso',
  performance: 'Melhorar performance',
  saude: 'Saúde e qualidade de vida',
};

export const TEMPO_TREINO_LABELS: Record<string, string> = {
  nunca: 'Nunca treinei',
  menos_6m: 'Menos de 6 meses',
  '6m_1a': '6 meses a 1 ano',
  '1_3a': '1 a 3 anos',
  mais_3a: 'Mais de 3 anos',
};

export const FREQUENCIA_TREINO_LABELS: Record<string, string> = {
  '2x': '2x por semana',
  '3x': '3x por semana',
  '4x': '4x por semana',
  '5x': '5x por semana',
  '6x': '6x por semana',
};

export const CONDICAO_SUPLEMENTO_LABELS: Record<string, string> = {
  sim_livre: 'Sim, sem restrição',
  sim_limitado: 'Sim, com limite',
  nao: 'Não no momento',
};

export const PERIODO_FOME_LABELS: Record<string, string> = {
  manha: 'Manhã',
  tarde: 'Tarde',
  noite: 'Noite',
  madrugada: 'Madrugada',
};

export const PREFERENCIA_ALIMENTAR_LABELS: Record<string, string> = {
  doces: 'Doces',
  salgados: 'Salgados',
  ambos: 'Ambos',
};

// ─── Múltipla escolha (valor = array de códigos) ──────────────────

export const REFEICOES_LABELS: Record<string, string> = {
  cafe_manha: 'Café da manhã',
  lanche_manha: 'Lanche da manhã',
  almoco: 'Almoço',
  lanche_tarde: 'Lanche da tarde',
  pre_treino: 'Pré-treino',
  pos_treino: 'Pós-treino',
  jantar: 'Jantar',
  ceia: 'Ceia',
};

export const SUPLEMENTOS_ATUAIS_LABELS: Record<string, string> = {
  whey: 'Whey Protein',
  creatina: 'Creatina',
  pre_treino: 'Pré-treino',
  bcaa: 'BCAA',
  multi: 'Multivitamínico',
  omega3: 'Ômega 3',
  glutamina: 'Glutamina',
  colageno: 'Colágeno',
  nenhum: 'Nenhum',
};

export const ALERGIAS_LABELS: Record<string, string> = {
  lactose: 'Lactose',
  gluten: 'Glúten',
  ovo: 'Ovo',
  amendoim: 'Amendoim',
  frutos_mar: 'Frutos do mar',
  soja: 'Soja',
  nenhuma: 'Nenhuma',
};

/**
 * Registro mestre: nome da coluna no banco → mapa de códigos.
 * Campos não listados aqui não são código (texto livre, número, data, jsonb).
 */
export const ANAMNESIS_LABELS: Record<string, Record<string, string>> = {
  sexo: SEXO_LABELS,
  objetivo: OBJETIVO_LABELS,
  tempo_treino: TEMPO_TREINO_LABELS,
  frequencia_treino: FREQUENCIA_TREINO_LABELS,
  condicao_suplemento: CONDICAO_SUPLEMENTO_LABELS,
  periodo_fome: PERIODO_FOME_LABELS,
  preferencia_alimentar: PREFERENCIA_ALIMENTAR_LABELS,
  refeicoes: REFEICOES_LABELS,
  suplementos_atuais: SUPLEMENTOS_ATUAIS_LABELS,
  alergias: ALERGIAS_LABELS,
};

// ─── Helpers de exibição ──────────────────────────────────────────

const PLACEHOLDER = '—';

/** Calcula a idade (anos completos) a partir de data_nascimento ('YYYY-MM-DD'). */
export function calcularIdade(dataNascimento?: string | null): number | null {
  if (!dataNascimento) return null;
  const nasc = new Date(dataNascimento);
  if (isNaN(nasc.getTime())) return null;
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

/** "1998-03-15" → "15/03/1998" */
export function formatarData(data?: string | null): string {
  if (!data) return PLACEHOLDER;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(data);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : data;
}

/**
 * Traduz o valor de um campo da anamnese para exibição.
 * - Campo de código único → retorna o label (ou o valor cru se código desconhecido).
 * - Campo de múltipla escolha (array) → traduz cada item e junta com ", ".
 * - Campo sem mapa → retorna o valor como string.
 */
export function traduzirCampo(coluna: string, valor: unknown): string {
  const mapa = ANAMNESIS_LABELS[coluna];

  if (Array.isArray(valor)) {
    if (valor.length === 0) return PLACEHOLDER;
    return valor
      .map((v) => (mapa ? mapa[String(v)] ?? String(v) : String(v)))
      .join(', ');
  }

  if (valor == null || valor === '') return PLACEHOLDER;

  if (mapa) return mapa[String(valor)] ?? String(valor);
  return String(valor);
}

/** Boolean (ex.: come_no_trabalho) → "Sim" / "Não". */
export function traduzirBooleano(valor?: boolean | null): string {
  if (valor === true) return 'Sim';
  if (valor === false) return 'Não';
  return PLACEHOLDER;
}

/**
 * Campo condicional jsonb (doenca_cronica, medicamento): { tem|usa, qual|quais }.
 * → "Sim — <detalhe>" / "Não".
 */
export function traduzirCondicional(
  valor?: { tem?: boolean; usa?: boolean; qual?: string; quais?: string } | null
): string {
  if (!valor || typeof valor !== 'object') return PLACEHOLDER;
  const tem = typeof valor.tem === 'boolean' ? valor.tem : valor.usa;
  if (tem === false) return 'Não';
  if (tem === true) {
    const detalhe = (valor.qual ?? valor.quais ?? '').trim();
    return detalhe ? `Sim — ${detalhe}` : 'Sim';
  }
  return PLACEHOLDER;
}
