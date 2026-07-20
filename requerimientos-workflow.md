# Flujo de trabajo para requerimientos e historias de usuario

Usa estas 3 skills en orden para ir de una idea a tickets listos para
implementar.

## Fase 1: Descubrimiento
**Skill:** `github/awesome-copilot@prd`

Úsala al principio, cuando la idea aún es vaga. Te hará preguntas para
descubrir el problema real, las métricas de éxito, los usuarios y las
restricciones antes de generar el PRD.

## Fase 2: Estructurar el Spec / PRD
**Skill:** `to-spec` (mattpocock/skills)

Toma el output de la Fase 1 o tu idea ya clara y produce un spec formal.
Sintetiza lo que ya sabes (no hace entrevista) con:
- Problem Statement
- Seams de testing
- Vocabulario del dominio y ADRs
- Criterios de aceptación medibles

## Fase 3: Desglosar en tickets / historias de usuario
**Skill:** `to-tickets` (mattpocock/skills)

Toma el spec y lo parte en tickets independientes (vertical slices), cada uno
atravesando todas las capas (schema, API, UI, tests). Declara dependencias
entre tickets y clasifica el esfuerzo.

---

## Resumen

| Fase | Skill | Qué hace |
|------|-------|----------|
| 1 | `prd` (github/awesome-copilot) | Descubrimiento con preguntas |
| 2 | `to-spec` (mattpocock) | Spec/PRD formal estructurado |
| 3 | `to-tickets` (mattpocock) | Tickets/historias de usuario |

## Cómo invocar cada skill

Desde OpenCode, solo dile algo como:

- **Fase 1:** "Ayúdame a escribir un PRD para [idea]" → usa `prd`
- **Fase 2:** "Toma lo que hemos hablado y genera un spec" → usa `to-spec`
- **Fase 3:** "Desglosa el spec en tickets" → usa `to-tickets`
