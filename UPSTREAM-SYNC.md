# Registro de sincronización con upstream (wwebjs/whatsapp-web.js)

> Este archivo es el **punto de partida** para no empezar cada revisión desde cero.
> Actualizarlo en cada revisión. Última actualización abajo.

## 1. Punto de partida actual — Revisión #2

- **Fecha (UTC):** 2026-11-13
- **Rama local:** `main` (`origin/main` = `elhumbertoz/whatsapp-web.js`)
- **Upstream:** `https://github.com/wwebjs/whatsapp-web.js` (remoto `upstream`)
- **Upstream HEAD revisado:** `eb076b0` (v1.34.8, 2026-11-12)
- **Merge-base anterior:** `1780711` (2026-06-25)
- **Estado:** merge `upstream/main` (v1.34.8) completado. Se adoptó `src/Client.js`
  de upstream y se eliminó la inyección `ExposeStore/AuthStore/LegacyStore`
  (causa del `TypeError: Cannot read properties of null (reading 'Socket')`
  del 2026-11-13). Se conservaron los customs vigentes (ver 2.4).

### Cómo retomar en la próxima revisión (en unas días/semanas)

```powershell
git fetch upstream --prune
git fetch origin --prune
# Ver solo lo NUEVO del upstream desde el último HEAD revisado:
git log --oneline 064a3d5a5a3dce1281a6a12740b5a7051339d154..upstream/main
# Ver divergencia total:
git rev-list --left-right --count origin/main...upstream/main
git merge-base origin/main upstream/main
```

Cuando se complete la próxima revisión, actualizar la sección
`Punto de partida actual` con el nuevo `Upstream HEAD revisado` y añadir
una entrada en el historial (sección 3).

---

## 2. Resultado de la Revisión #1 (2026-10-09)

### 2.1 Commits del upstream revisados (los únicos 3 no presentes en local)

| SHA upstream | Fecha      | Título                                                                       | Decisión                     | Motivo                                                                                                                                                                                                                                                                                                            |
| ------------ | ---------- | ---------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ---------------------------------------------------------------- |
| `942d236`    | 2026-07-27 | `fix: use WWebJS.getChat for inviteV4 fallback in addParticipants (#201792)` | **PORTADO (adaptado)**       | Local usaba `Chat.get(pWid) \|\| Chat.find(pWid)`. Upstream usa `WWebJS.getChat(id, { getAsModel: false })`, que resuelve vía `findOrCreateLatestChat` y es más robusto. Se portó usando `window.WWebJS.getSerializedId(pWid)` para conservar soporte `_serialized / $1`. Archivo: `src/structures/GroupChat.js`. |
| `58ddf15`    | 2026-09-26 | `fix(client): add fallback for id._serialized renamed to id.$1 (#201832)`    | **YA CUBIERTO — NO MERGEAR** | Local ya es superset: `Base._normalizeId()` acepta `string`, `user@server`, `$1` y `toString()`; `Utils.js` tiene `getSerializedId()` central + parche de prototipo `MsgKey._serialized`; `Client.js` tiene los mismos 12 fallbacks `                                                                             |     | $1`. Hacer merge traería una versión **recortada** de `Base.js`. |
| `064a3d5`    | 2026-09-28 | `fix(media): drop __x_id before spreading mediaOptions (#201923)`            | **YA CUBIERTO — NO MERGEAR** | Local ya tiene `delete message.__x_id` en `src/util/Injected/Utils.js` (~línea 566) con comentario equivalente.                                                                                                                                                                                                   |

### 2.2 Cambio aplicado en esta revisión

- `src/structures/GroupChat.js` — bloque `addParticipants` / `ParticipantRequestCodeCanBeSent`:
  antes `Chat.get / Chat.find`, ahora `window.WWebJS.getChat(getSerializedId(pWid), { getAsModel: false })`.
  Mantiene compatibilidad `$1` y aprovecha `findOrCreateLatestChat` local.

### 2.3 Archivos locales que son SUPERSET del upstream — NO sobrescribir en futuros merges

Estos archivos divergieron intencionalmente y son mejores que el upstream.
Un `git merge upstream/main` ciego los **dañaría**. Integrar upstream
siempre por **cherry-pick / port manual**, nunca por merge completo sin revisar.

- `src/Client.js` — inyección `ExposeAuthStore` / `ExposeLegacyAuthStore`,
  `ExposeStore` / `ExposeLegacyStore`, lógica READY anti-duplicados con
  `readyInProgress` + timeout 30s, QR con fallback `AuthStore.Conn`,
  `Socket` con fallback `AppState`, `createGroup()` que normaliza `res.gid`
  con `Base._normalizeId`. Requiere dep `@pedroslopez/moduleraid`
  (ver `package.json`, ausente en upstream).
- `src/structures/Base.js` — `_normalizeId()` extendido (string, `user/server`,
  `toString()`). Upstream solo cubre `_serialized == null && $1 != null`.
- `src/util/Injected/Utils.js` — helper `getSerializedId()`, parche de
  prototipo `MsgKey._serialized`, `normalizarPreviewLink()` para WA Web
  2.3000.x (thumbnail vacío), `getChats/getChannels/getContacts` con
  `try/catch` por chat para no tumbar la lista, `getChatModel/getContactModel`
  que reconstruyen `id._serialized` desde `chat.id/contact.id`.
- `src/structures/Message.js` — `getQuotedMessage()` robusto con mensajes
  de error en español y manejo de `null` (commit local `fafcacb`).
  Upstream es más simple y perdería ese manejo.
- `src/structures/GroupNotification.js` — `recipientIds` normalizado a
  `r._serialized || r.$1`. Upstream devuelve `data.recipients` crudo.
- `src/structures/GroupChat.js` — `_patch()` normaliza
  `groupMetadata.id/owner/participants[].id` con `Base._normalizeId`;
  `groupParticipants.map` conserva el valor (upstream lo descarta por
  accidente en una variante). Solo se portó el hunk de `inviteV4`.
- `src/util/Injected/Store.js`, `LegacyStore.js`,
  `AuthStore/AuthStore.js`, `AuthStore/LegacyAuthStore.js`,
  `src/util/Puppeteer.js`, `tests/quoted-message.js` — no existen en
  upstream; son propios del fork.

---

## 3. Historial de revisiones

| #   | Fecha      | Upstream HEAD revisado         | Merge-base             | Acción                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | ---------- | ------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 2026-10-09 | `064a3d5` (2026-09-28)         | `1780711` (2026-06-25) | Portado `942d236` adaptado a `getSerializedId`. `58ddf15` y `064a3d5` ya cubiertos (superset local). Creado este registro.                                                                                                                                                                                                                                                                                    |
| 2   | 2026-11-13 | `eb076b0` v1.34.8 (2026-11-12) | `1780711` (2026-06-25) | Merge upstream v1.34.8. Adoptado `Client.js` upstream; eliminados `Store/LegacyStore/AuthStore` y dep `moduleraid` (causaban `null.Socket` con WA Web actual). Conservados customs vigentes: `Base._normalizeId` extendido, extras `GroupChat`, `getQuotedMessage` robusto, `Utils` (`getSerializedId`, `normalizarPreviewLink`, `getChats` tolerante), `Puppeteer` stale-binding, `tests/quoted-message.js`. |

---

## 4. Política de integración (acordada)

1. **Nunca** `git merge upstream/main` directo: rompería `Store/AuthStore`,
   `READY`, `getSerializedId` y `Base._normalizeId` locales.
2. Revisar `git log <ULTIMO_HEAD_REVISADO>..upstream/main` commit por commit.
3. Clasificar cada commit: `PORTADO` / `YA CUBIERTO` / `OMITIDO (motivo)`.
4. Portar a mano el hunk mínimo, adaptando `_serialized` → `getSerializedId()`
   o `Base._normalizeId()` según capa (browser `Utils.js` vs Node `structures/`).
5. Verificar con `npm run lint`, `npm run format:check` y `npm test`
   (o al menos el test tocado), y actualizar este archivo.
