# Decisões — beer-mvp

## 2026-10-01 — MVP da Degga Beer a partir do apae-mvp, front-only
**Decidido:** base copiada do `apae-mvp` (shell, `ui/`, `common/`, audit, store zustand persistido),
módulos da APAE removidos, visual monocromático do admin da TodosDan. Regras do domínio:
estoque fracionado em unidades do produto, com dose em ml (`volumeMl`) para drinks; custo de kit e de
drink **derivado** dos produtos (não gravado); a venda grava snapshot de preço e custo e gera uma
conta a receber com prazo e taxa da forma de pagamento (dinheiro/Pix na hora, débito D+1 1,6%,
crédito D+30 3,4%).
**Por quê:** demonstração rápida e "completinha" sem API; o desenho do store já vira endpoints quando
for sistema, e derivar custo evita duas verdades quando o insumo muda de preço.
**Rejeitado:** começar do `default-admin` (teria de refazer o shell da TodosDan); estoque em ml
separado da garrafa (duas contagens para o mesmo produto); gravar custo do drink (desatualiza na
próxima entrada de mercadoria).
