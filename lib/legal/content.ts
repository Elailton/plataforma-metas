// Textos legais do SGA. Fonte: documento "SGA — Aviso de Privacidade e Termos de Uso",
// preenchido com dados públicos do CNPJ em 28/10/2026. Alterar aqui e atualizar a data.
// Qualquer mudança de dados tratados, fornecedores ou prazos exige revisar o aviso
// (docs/ia/03-dados.md) no mesmo PR.

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }

export interface LegalSection {
  title: string
  blocks: LegalBlock[]
}

export interface LegalDocument {
  title: string
  updatedAt: string
  intro: string
  sections: LegalSection[]
}

export const LEGAL_UPDATED_AT = "28/10/2026"
export const COMPANY_NAME = "Curso Professor Erick Lima Ltda"
export const COMPANY_CNPJ = "52.992.972/0001-03"
export const COMPANY_ADDRESS = "Av. Carneiro de Mendonça, 340, Demócrito Rocha, Fortaleza/CE, CEP 60440-164"
export const COMPANY_EMAIL = "cursoprofericklima@gmail.com"

export const PRIVACY: LegalDocument = {
  title: "Aviso de Privacidade",
  updatedAt: LEGAL_UPDATED_AT,
  intro:
    "Este aviso explica como o Sistema Guiado da Aprovação (SGA) trata os seus dados pessoais, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).",
  sections: [
    {
      title: "1. Quem é o responsável",
      blocks: [
        {
          type: "p",
          text: `O controlador dos dados é a ${COMPANY_NAME}, CNPJ ${COMPANY_CNPJ}, com sede na ${COMPANY_ADDRESS}. Para falar sobre seus dados, escreva para ${COMPANY_EMAIL} ou use o WhatsApp +55 (85) 99688-5832, o mesmo canal de suporte da plataforma.`,
        },
      ],
    },
    {
      title: "2. Que dados tratamos e para quê",
      blocks: [
        {
          type: "table",
          head: ["Dado", "Para que usamos", "Base legal (LGPD)"],
          rows: [
            ["E-mail e nome informados na compra", "Criar sua conta, liberar o acesso comprado e enviar o link de acesso", "Execução de contrato (art. 7º, V)"],
            ["E-mail da compra guardado junto ao aviso da Hotmart", "Entregar o acesso quando a compra chega antes do cadastro do produto ou da oferta", "Execução de contrato (art. 7º, V)"],
            ["Respostas do questionário do curso (rotina, horas de estudo, experiência)", "Organizar suas metas de estudo", "Execução de contrato (art. 7º, V)"],
            ["Metas e itens concluídos, edital estudado", "Mostrar seu progresso", "Execução de contrato (art. 7º, V)"],
            ["Tentativas e respostas dos mini simulados e do Diagnóstico Semanal", "Corrigir, gerar o relatório de erros e acompanhar sua evolução", "Execução de contrato (art. 7º, V)"],
            ["Nome curto no ranking", "Mostrar sua posição, somente se você escolher aparecer", "Consentimento (art. 7º, I)"],
            ["Registros de acesso (data, hora e IP)", "Segurança e cumprimento de obrigação legal", "Obrigação legal (art. 7º, II) e legítimo interesse (art. 7º, IX)"],
          ],
        },
        {
          type: "p",
          text: "Não coletamos CPF, telefone, endereço nem dados de cartão ou pagamento. O pagamento é feito diretamente na Hotmart.",
        },
      ],
    },
    {
      title: "3. Com quem compartilhamos",
      blocks: [
        { type: "p", text: "Usamos prestadores que tratam dados em nosso nome, somente para o que o serviço exige:" },
        {
          type: "ul",
          items: [
            "Hotmart: processa a venda e o pagamento e nos informa a compra.",
            "Supabase: banco de dados e login.",
            "Vercel: hospedagem da plataforma.",
            "Resend: envio dos e-mails de acesso.",
          ],
        },
        { type: "p", text: "Não vendemos seus dados nem os usamos para publicidade de terceiros." },
      ],
    },
    {
      title: "4. Transferência internacional",
      blocks: [
        {
          type: "p",
          text: "Supabase, Vercel e Resend armazenam dados nos Estados Unidos. A transferência ocorre com as garantias previstas na LGPD e na regulamentação da ANPD, por meio dos adendos de tratamento de dados e das cláusulas contratuais firmados com cada fornecedor.",
        },
      ],
    },
    {
      title: "5. Por quanto tempo guardamos",
      blocks: [
        {
          type: "ul",
          items: [
            "Conta, progresso e respostas: enquanto o acesso estiver ativo e por 5 anos depois, para fins contratuais e de defesa em eventuais disputas. Depois disso, eliminamos ou anonimizamos.",
            "E-mail da compra guardado junto aos avisos da Hotmart: até 90 dias, quando a compra não gerou acesso; se gerou, enquanto durar o vínculo.",
            "Pedidos de reenvio de acesso (guardados só em forma codificada, sem o e-mail em claro): 30 dias.",
            "Registros de acesso: 6 meses, conforme o Marco Civil da Internet.",
          ],
        },
      ],
    },
    {
      title: "6. Seus direitos",
      blocks: [
        {
          type: "p",
          text: "Você pode pedir, a qualquer momento: confirmação de que tratamos seus dados; acesso; correção; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre com quem compartilhamos; e revogação do consentimento (por exemplo, deixar de aparecer no ranking). Respondemos em até 15 dias. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).",
        },
      ],
    },
    {
      title: "7. Segurança",
      blocks: [
        {
          type: "p",
          text: "O acesso é liberado apenas a alunos com compra válida, cada aluno vê somente os próprios dados, as regras são aplicadas no banco de dados, as senhas não são guardadas em texto simples e as chaves de serviço ficam apenas no servidor. Se ocorrer um incidente que possa causar risco ou dano relevante, comunicaremos você e a ANPD nos prazos legais.",
        },
      ],
    },
    {
      title: "8. Menores de idade",
      blocks: [
        {
          type: "p",
          text: "O SGA é destinado a maiores de 18 anos. Se o aluno for menor de idade, a compra e o uso devem ser feitos com o responsável legal, que responde pela conta.",
        },
      ],
    },
    {
      title: "9. Cookies",
      blocks: [
        {
          type: "p",
          text: "Usamos apenas cookies essenciais de sessão para mantê-lo conectado. Não usamos cookies de publicidade nem de análise de terceiros.",
        },
      ],
    },
    {
      title: "10. Mudanças neste aviso",
      blocks: [
        {
          type: "p",
          text: "Se este aviso mudar de forma relevante, avisaremos na plataforma. A data de última atualização fica no topo.",
        },
      ],
    },
  ],
}

export const TERMS: LegalDocument = {
  title: "Termos de Uso",
  updatedAt: LEGAL_UPDATED_AT,
  intro:
    "Ao acessar o Sistema Guiado da Aprovação (SGA), você concorda com estes termos. Se não concordar, não use a plataforma.",
  sections: [
    {
      title: "1. O que é o SGA",
      blocks: [
        {
          type: "p",
          text: `O SGA é um complemento do produto "Curso completo + SGA", da ${COMPANY_NAME}, CNPJ ${COMPANY_CNPJ}, com sede na ${COMPANY_ADDRESS}. Ele reúne orientações de estudo, metas, edital, acompanhamento de progresso e mini simulados. O SGA não é um curso preparatório por si só e não garante aprovação em concurso.`,
        },
      ],
    },
    {
      title: "2. Como se obtém o acesso",
      blocks: [
        {
          type: "p",
          text: "O acesso é liberado depois da compra do produto na Hotmart, para o e-mail usado na compra. Não há cadastro público. O acesso é pessoal e vale para o curso contratado, pelo prazo informado na oferta adquirida na Hotmart.",
        },
      ],
    },
    {
      title: "3. Regras de uso",
      blocks: [
        {
          type: "ul",
          items: [
            "Use a conta apenas para você. Não compartilhe o link de acesso, a senha nem o conteúdo com terceiros.",
            "Não copie, reproduza, grave, revenda ou distribua metas, materiais, questões ou comentários.",
            "Durante os simulados, não tente copiar o texto das questões nem burlar a correção ou o ranking.",
            "Não tente acessar dados de outros alunos nem testar falhas de segurança. Se encontrar uma falha, avise-nos pelo canal de contato.",
          ],
        },
      ],
    },
    {
      title: "4. Propriedade intelectual",
      blocks: [
        {
          type: "p",
          text: "As metas, os materiais, as orientações, os comentários e a organização da plataforma pertencem à Curso Professor Erick Lima ou a seus licenciantes. Você recebe uma licença pessoal, limitada, intransferível e revogável para uso de estudo. Questões de provas pertencem às bancas e instituições de origem e são citadas com a respectiva fonte.",
        },
      ],
    },
    {
      title: "5. Pagamento, reembolso e acesso",
      blocks: [
        {
          type: "p",
          text: "Pagamento, arrependimento e reembolso seguem as regras da compra na Hotmart e o Código de Defesa do Consumidor, que garante 7 dias de arrependimento a partir da compra (art. 49). Em caso de reembolso, cancelamento, chargeback ou pagamento não realizado, o acesso pode ser suspenso. Sua conta e seu histórico de progresso são preservados e voltam a valer se o acesso for reativado.",
        },
      ],
    },
    {
      title: "6. Suspensão por descumprimento",
      blocks: [
        {
          type: "p",
          text: "Podemos bloquear o acesso a um curso se houver compartilhamento da conta, fraude ou violação destes termos, com aviso por e-mail quando possível. O bloqueio de um curso não afeta os demais cursos nem seus dados.",
        },
      ],
    },
    {
      title: "7. Disponibilidade",
      blocks: [
        {
          type: "p",
          text: "Buscamos manter a plataforma disponível, mas pode haver interrupções para manutenção ou por falhas de terceiros (hospedagem, e-mail, internet). Podemos alterar o conteúdo, as metas e as funções, mantendo o objetivo do produto contratado.",
        },
      ],
    },
    {
      title: "8. Limitação de responsabilidade",
      blocks: [
        {
          type: "p",
          text: "O SGA é uma ferramenta de apoio. Não respondemos por resultado em provas, por mudanças de edital feitas pelas bancas ou por uso indevido da conta por quem compartilhou suas credenciais, sem prejuízo dos direitos do consumidor previstos em lei.",
        },
      ],
    },
    {
      title: "9. Privacidade",
      blocks: [{ type: "p", text: "O tratamento dos seus dados segue o Aviso de Privacidade." }],
    },
    {
      title: "10. Mudanças, lei aplicável e foro",
      blocks: [
        {
          type: "p",
          text: "Podemos atualizar estes termos e avisaremos na plataforma. Aplica-se a lei brasileira. Fica eleito o foro de Fortaleza/CE, ressalvado o foro do domicílio do consumidor.",
        },
      ],
    },
    {
      title: "11. Contato",
      blocks: [{ type: "p", text: `Suporte e pedidos sobre dados pessoais: ${COMPANY_EMAIL} ou WhatsApp +55 (85) 99688-5832.` }],
    },
  ],
}
