# Zaza Woods 3D-Konfigurator — Полная техническая документация

> Дай этот документ Claude или любому ИИ в новом чате, чтобы он за минуту
> понял всю архитектуру, технологии, состояние проекта и где что лежит.
> Написано подробно и без воды.

---

## 1. Что это и где живёт

3D-конфигуратор столов для **Zaza Woods** (zazawoods.de, Shopify, тема Codixel). Покупатель крутит 3D-модель пикник-стола, выбирает каркас (W/U/X), длину, спинки или лавки, видит живую цену, попадает в корзину со своим вариантом. Дизайн скопирован 1:1 с bogade.com.

### Магазин продаёт 2 товара (Shopify):

| Товар | Handle | Опции | Вариантов |
|---|---|---|---|
| **Picknicktisch** | `picknicktisch-aus-massivem-douglasienholz` | Maße (10 длин) × Rückenlehne (Keine/1/2) | 30 |
| **Gartentisch** | `gartentisch-aus-massivem-douglasienholz` | Länge (10) × Tischbein-Modell (X/U) × Anzahl der Bänke (0/1/2) | 60 |

### В конфигураторе:

- **W (angle)** → Picknicktisch, выбор Rückenlehne (Keine/1/2)
- **U (picknick_Ushape)** → Gartentisch U-Tischbeine, выбор Sitzbank (Keine/1/2)
- **X (picknick_Xshape)** → Gartentisch X-Tischbeine, выбор Sitzbank (Keine/1/2)

Итого **90 комбинаций**, все 1:1 совпадают с реальными Shopify variant IDs (хардкод в `PICKNICKTISCH` и `GARTENTISCH` объектах в `index.html`).

### Где что хостится:

```
GitHub:          github.com/zazawoods/zazawoods-3d-configurator (main branch)
Railway:         zazawoods-3d-configurator-production.up.railway.app
                 (Node/Express, auto-deploy при push в main)
Shopify embed:   zazawoods.de/pages/konfigurator (iframe, тема Codixel)
```

---

## 2. Файлы в репозитории

| Файл | Что это |
|---|---|
| `index.html` | Весь конфигуратор (HTML+CSS+JS three.js в одном файле, ~180 КБ) |
| `server.js` | Express-сервер (статика + AR-upload-эндпоинт) |
| `package.json` | `{ "start": "node server.js" }`, зависимость express |
| `angle.glb` | 2.2 МБ — модель W-стола (Picknicktisch), 6 длин (160/200/250/300/350/400) |
| `picknick.glb` | 6.3 МБ — модель U/X-стола (Gartentisch), 10 длин (160/180/200/220/240/260/280/300/350/400), 6 стилей ножек |
| `material-douglas.jpg` | Фото текстуры Douglasienholz (для иконки Material) |
| `ar.html` | Страница-редирект для AR: открывается на телефоне по QR, авто-запускает нативный AR |
| `ar-generator.html` | Внутренний инструмент: оффлайн-генератор всех 90 GLB+USDZ в ZIP (используется как fallback, основной поток — runtime upload через server) |
| `railway.json` | Конфиг Railway (Nixpacks builder) |
| `serve.json` | Старый конфиг serve (не используется, оставлен на всякий случай) |

### Что блокирует server.js от публичного доступа:

`server.js`, `package.json`, `package-lock.json`, `serve.json`, `railway.json`, `.git/*`, `node_modules/*` — все возвращают 404 благодаря middleware в начале сервера.

---

## 3. Технологии

- **Three.js r160** — рендер 3D-моделей через WebGL2.
- **GLTFLoader + DRACOLoader** — загрузка `.glb` с draco-компрессией геометрии.
- **GLTFExporter + USDZExporter** — runtime-конвертация для AR (Android GLB, iOS USDZ).
- **OrbitControls** — вращение/панорамирование камеры (зум переопределён кастомным кодом).
- **Express 4** — мини-сервер на Railway: раздаёт статику + принимает/отдаёт AR-модели.
- **Shopify Theme «Codixel»** — на стороне магазина: секция Liquid, шаблон страницы.
- **Inter (Google Fonts)** — шрифт UI.
- **qrcodejs (jsdelivr CDN)** — генерация QR-кода для AR-десктоп-модалки.
- **`<model-viewer>`** — НЕ используется; нативный AR запускается прямой навигацией на USDZ/intent-URL.

---

## 4. Архитектура (поток выполнения)

### При открытии страницы:

1. `index.html` парсится. У `acc-bench`, `acc-backrest`, `panel-foot` уже стоят классы `hidden`/`hidden-foot` — никаких «мельканий» секций до загрузки JS.
2. JS читает URL-параметры (`?set=`, `?length=`, `?backrests=`, `?benches=`). Если все есть и валидны — визард пропускается, модель грузится сразу. Если нет — старт с шага 1 (Material).
3. `loadFallbackWood()` загружает встроенную (base64) текстуру дерева как fallback.
4. Параллельно стартует `fetch('angle.glb')` для прелоада в кеш браузера.
5. Рендерится «Konfigurator / Wähle Material, Abmessung und Gestell» placeholder в 3D-зоне.

### Шаги визарда:

- **Шаг 1 (Material)** — клик «Douglasienholz» → `state.material = 'douglas'` → разблокируется шаг 2 → запускается **`fetch('picknick.glb')`** в фоне, чтобы к шагу 3 файл был в кеше.
- **Шаг 2 (Abmessung)** — клик на длину → `state.length` устанавливается → подзаголовок «200 cm» появляется сразу → разблокируется шаг 3.
- **Шаг 3 (Gestell)** — клик W/U/X → `state.set` устанавливается → `setActiveSet()` загружает соответствующий GLB (из кеша или сети), применяет видимость/масштаб → рендерится модель → разблокируется шаг 4 → показывается футер с ценой и кнопкой «In den Warenkorb».
- **Шаг 4 (Rückenlehne / Sitzbank)** — для W показывается секция Rückenlehne (Keine/1/2 спинки), для U/X — Sitzbank (Keine/1/2 лавки). По умолчанию — «Keine».

### Когда меняется конфигурация:

`applyState()` пересчитывает видимость мешей в загруженном GLB:
- Length-filter: по regex `_(\d{3,4})$` оставляет видимыми только меши текущей длины.
- Для W (`!cfg.fixedLeg`): если длина не из `W_GLB_LENGTHS = [160, 200, 250, 300, 350, 400]`, берётся ближайшая существующая геометрия и масштабируется по оси Z (`scale.z = state.length / renderL`). Это поддерживает 180/220/240/260/280, которых нет в GLB.
- Для U/X (`cfg.fixedLeg`): фильтр по имени узла под выбранный стиль ножек (Ushape/Xshape).
- Backrest count (W): при `state.backrests === 0` спинки скрыты; при 1 — clipping plane разрезает геометрию пополам по оси X (поскольку GLB запекает обе спинки в один mesh); при 2 — обе видны.
- Bench count (U/X): прячет `3benchplanks_1` / `3benchplanks_2` и соответствующие ножки по counts.

После — `recenter()` сдвигает корень модели так, чтобы видимый bbox был в центре, и `applyBackrestClip()` обновляет clipping plane по новому центру.

---

## 5. Конфигуратор каталога (важно для понимания)

В `index.html` есть три ключевые структуры:

### `SETS` (объект, ~строка 385)

```js
SETS = {
  angle:              { name:'W', file:'angle.glb',    lengths:[160,180,200,220,240,260,280,300,350,400], hasBackrest:true,  fixedLeg:null,     icon:'<svg…W…>' },
  picknick_Ushape:    { name:'U', file:'picknick.glb', lengths:[160,180,200,220,240,260,280,300,350,400], hasBackrest:false, fixedLeg:'Ushape', icon:'<svg…U…>' },
  picknick_Xshape:    { name:'X', file:'picknick.glb', lengths:[160,180,200,220,240,260,280,300,350,400], hasBackrest:false, fixedLeg:'Xshape', icon:'<svg…X…>' }
};
```

### `PICKNICKTISCH` (variant map для W, строка ~497)

```js
PICKNICKTISCH = {
  // length → [[variantId, priceEUR] for keine, 1Rück, 2Rücken]
  160: [[44527816868106, 975],  [53105591025930, 1215], [53105591058698, 1455]],
  …все 10 длин…
};
```

### `GARTENTISCH` (variant map для U/X, строка ~511)

```js
GARTENTISCH = {
  // length → { X|U: [[variantId, priceEUR] for 0/1/2 benches] }
  160: { X: [[44530780406026,775],[44530878218506,925],[44530878251274,1075]],
         U: [[44530878284042,775],[44530878316810,925],[44530878349578,1075]] },
  …все 10 длин…
};
```

`getVariant()` находит `[variantId, price]` для текущего `state`. Клик «In den Warenkorb» делает `window.top.location.href = 'https://zazawoods.de/cart/' + variantId + ':1?storefront=true'` — Shopify кладёт правильный вариант в корзину и открывает её.

**Все 90 variant ID хардкод-извлечены из `.json` Shopify-продуктов**. Если в магазине изменятся ID — нужно обновить эти два объекта.

---

## 6. Smooth-zoom (кастомная система)

`OrbitControls.enableZoom = false`. Своя реализация:

```js
let zoomTargetRadius = camera.position.distanceTo(controls.target);
const ZOOM_SENSITIVITY = 0.0012; // больше = быстрее реакция
const ZOOM_LERP = 0.18;          // больше = резче, меньше = плавнее

// Wheel-event на .viewer (вся 3D-зона):
.addEventListener('wheel', e => {
  e.preventDefault(); e.stopPropagation();  // не утекает в parent iframe
  const factor = Math.exp(e.deltaY * ZOOM_SENSITIVITY);
  zoomTargetRadius = clamp(zoomTargetRadius * factor, minDistance, maxDistance);
});

// Каждый кадр:
function smoothZoomStep() {
  const curR = camera.position.distanceTo(controls.target);
  const newR = curR + (zoomTargetRadius - curR) * ZOOM_LERP;
  // двигаем camera.position на newR в направлении от target
}
```

Это эталонная схема (Sketchfab, Google Earth). Один и тот же отклик на трекпаде и мыши.

---

## 7. AR-система (мобильный native AR)

### Проблема: `blob:` URLs нельзя открыть в нативном AR

Нативные AR-приложения (Android Scene Viewer, iOS Quick Look) скачивают модель по https-ссылке. `blob:` URLs существуют только внутри страницы — внешнее приложение их не видит. Поэтому нужен сервер.

### Решение: мини-бэкенд upload+serve

**При тапе AR-кнопки на телефоне:**
1. Конфигуратор экспортирует текущую сцену через `GLTFExporter` (для Android) и `USDZExporter` (для iPhone).
2. Загружает оба файла на сервер: `POST /ar-upload/glb` и `POST /ar-upload/usdz` (по `crypto.randomUUID()`).
3. Получает обратно ссылки `/ar/<uuid>.glb` и `/ar/<uuid>.usdz`.
4. Прямая навигация:
   - **iPhone**: `location.href = '/ar/<uuid>.usdz'` → срабатывает AR Quick Look.
   - **Android**: `location.href = 'intent://arvr.google.com/scene-viewer/1.0?file=…glbUrl…#Intent;…'` → Scene Viewer.

### При сканировании QR с десктопа

QR кодирует URL `/ar.html?u=<usdz>&g=<glb>` (на стороне Railway). Скан → на телефоне открывается `ar.html` → автоматический редирект к нативному AR.

`/ar.html` строго валидирует параметры: принимает только пути на собственном origin под `/ar/`. Любая попытка `?u=javascript:` блокируется (XSS-защита).

### Сервер: лимиты

- 60 МБ max на upload.
- 30 запросов/мин per IP (rate-limit).
- Хранилище 400 МБ / 200 файлов с LRU-вытеснением.
- TTL 2 часа.
- Cleanup каждые 10 мин.

---

## 8. Безопасность (что есть в production)

### Заголовки от сервера:

```
Content-Security-Policy: frame-ancestors 'self' https://zazawoods.de https://*.zazawoods.de https://*.myshopify.com
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(self), microphone=(), geolocation=()
```

CSP `frame-ancestors` запрещает встраивание iframe откуда угодно, кроме zazawoods.de и Shopify-доменов — **защита от кликджекинга**.

### Защиты:

| Угроза | Защита |
|---|---|
| XSS через `?u=javascript:` в ar.html | URL-валидация: только same-origin + `/ar/` |
| Path traversal через `/ar/../../etc/passwd` | 404 на любом не-UUID имени |
| DOS через upload | Rate-limit 30/мин, max 60 МБ, LRU при достижении 400 МБ |
| Утечка исходников | Middleware блокирует server.js, package*.json, serve.json, railway.json, .git |
| Подделанные localStorage сохранения | При загрузке проверяется, что `set` есть в каталоге и `length` валидна |
| Кликджекинг | CSP frame-ancestors |
| innerHTML с внешними данными | Используется createElement+textContent (saved-list) |

---

## 9. Производительность

- **Prefetch-стратегия**: `angle.glb` (2.2 МБ) грузится сразу при открытии страницы. `picknick.glb` (6.3 МБ) грузится только когда пользователь кликнул «Douglasienholz» (шаг 1 визарда) — параллельно пока пользователь идёт через шаги 2 и 3.
- **GLB-кеш по имени файла**: `picknick_Ushape` и `picknick_Xshape` шарят один файл, переключение между U и X — мгновенное.
- **Scene cleanup**: при смене сета старый root удаляется (`scene.remove(currentRoot)`) — нет утечек памяти.
- **iframe `loading="lazy"`**: на странице Shopify iframe начинает грузиться, только когда пользователь до него доскроллит.
- **Defer wood UV fix + texture downscale**: материалы исправляются один раз при первой загрузке файла, затем закешированы.

---

## 10. Shopify-интеграция

### На стороне магазина (тема Codixel):

| Файл темы | Что делает |
|---|---|
| `sections/konfigurator-embed.liquid` | iframe-обёртка на странице `/pages/konfigurator` (полноэкранный режим, full-bleed CSS, без titlle по умолчанию) |
| `snippets/selbst-erstellen-button.liquid` | Кнопка «Konfigurator» на странице товара, ведёт на `/pages/konfigurator` |
| `templates/page.konfigurator.json` | Шаблон страницы, использует секцию embed |
| `templates/product.konfigurator.json` | Флаг-шаблон для столов |
| Модификация `sections/main-product.liquid` | Рендер кнопки «selbst-erstellen» в product page |

### Cart-flow (нет postMessage)

Покупатель кликает «In den Warenkorb» в iframe → `window.top.location.href = 'https://zazawoods.de/cart/<variant>:1?storefront=true'` → Shopify сам кладёт вариант в корзину и открывает её. Никакой логики на стороне Shopify не требуется — корзина-permalink делает всё.

### Полное содержимое `konfigurator-embed.liquid`:

Лежит у пользователя в `~/Desktop/текстура/konfigurator-embed.liquid`. Заменяет старую секцию из предыдущего проекта `picnic-configurator`.

---

## 11. URL-параметры (для shared-links)

Конфигуратор поддерживает старт с предвыбранной конфигурации:

```
?set=angle|picknick_Ushape|picknick_Xshape
&length=160|180|...|400
&benches=0|1|2     (для U/X)
&backrests=0|1|2   (для W)
```

Если хоть один валиден — визард пропускается, модель показывается сразу. Все значения санитируются (length снапается к ближайшей допустимой, benches/backrests только 0/1/2).

---

## 12. Известные ограничения / технический долг

1. **Picknick GLB не имеет геометрии для длин 180/220/240/260/280** у W (в angle.glb их нет). Эти длины рендерятся через `scale.z` ближайшей геометрии. Визуально незаметно (искажения ≤7%). Если будут оригинальные GLB-меши для этих длин — заменить просто.
2. **Спинка одна на длину в angle.glb**. Для «1 Rückenlehne» используется clipping plane через мидпойнт оси X, чтобы показать половину mesh'а. Это компромисс — нативно две модели было бы лучше.
3. **AR на iOS требует USDZ** — генерится runtime через `USDZExporter.parse()`. Если поведение Quick Look на разных версиях iOS будет нестабильным, fallback — pre-generate ZIP через `ar-generator.html`.
4. **AR-store в RAM**: при рестарте сервера активные AR-сессии теряются. Это OK при TTL 2 часа, но при частых рестартах — заметно.
5. **Без CDN**: GLB файлы отдаются с Railway. Для очень высокой нагрузки можно перенести на Cloudflare R2 или GitHub Raw (как было в прошлом проекте).

---

## 13. Быстрый troubleshooting

| Симптом | Что проверить |
|---|---|
| Iframe не отображается / Refused to display | CSP frame-ancestors — добавить нужный домен в `server.js` |
| «In den Warenkorb» не работает | Проверить variant ID в `PICKNICKTISCH`/`GARTENTISCH` объектах, посмотреть current Shopify product `.json` |
| AR на телефоне «открывает только ссылку» | Кэш браузера, hard refresh; проверить, что `/ar/<uuid>.usdz` отвечает 200 |
| QR-код не сканируется | Возможно блокировщик рекламы блокирует jsdelivr CDN; проверить console на ошибку |
| Прошёл визард, но цена «€ —» | В `PICKNICKTISCH`/`GARTENTISCH` нет нужной комбинации — проверить, что в `SETS.angle.lengths` все длины есть в `PICKNICKTISCH` |
| Модель загружается долго (мобиль) | Прелоад picknick.glb должен стартовать на клик Material — проверить, что `window.__picknickPrefetched` стало true |
| Volk/Rückenlehne section мелькает | Проверить, что `<div class="acc locked hidden">` стоит для acc-bench и acc-backrest, и `class="panel-foot hidden-foot"` для футера |

---

## 14. Как делать типовые изменения

### Изменить цену / variant
Открыть Shopify product `.json`, найти variant ID, обновить в `PICKNICKTISCH` или `GARTENTISCH` объекте в `index.html`. Закоммитить → Railway за минуту пересоберёт.

### Добавить новую длину
1. Получить GLB-меши для этой длины из CAD.
2. Добавить длину в `SETS.angle.lengths` или `SETS.picknick_*.lengths`.
3. Если для W не будет геометрии — добавить в `W_GLB_LENGTHS` логику или оставить scaling-fallback.
4. Добавить variant в `PICKNICKTISCH`/`GARTENTISCH`.

### Изменить тексты / переводы
В `index.html` все строки на немецком — `Material`, `Abmessung`, `Gestell`, `Rückenlehne`, `Sitzbank`, `Douglasienholz`, `In den Warenkorb`. Найти-заменить.

### Изменить ощущение зума
В `index.html`, секция «Smooth zoom», подкрутить две константы:
- `ZOOM_SENSITIVITY` (по умолчанию 0.0012) — чем больше, тем шибче на одно прокручивание колеса.
- `ZOOM_LERP` (0.18) — больше = резче, меньше = шёлковее.

### Изменить ширину панели
В `index.html`, селектор `.panel`. Сейчас:
- `<860px`: автоматически вертикальная раскладка (мобиль).
- Default desktop: 460px.
- `@media (min-width: 1700px)`: 560px.
- `@media (min-width: 2200px)`: 640px.

### Изменить дефолтную позицию камеры
В `index.html`, поиск `camera.position.set`. Меняются 4 варианта (мобиль / <1700 / <2200 / иначе).

---

## 15. Бэкап

1. **GitHub** — главное хранилище кода. Доступ к репо `zazawoods/zazawoods-3d-configurator` — у владельца.
2. **Локальная копия**: можно склонировать `git clone https://github.com/zazawoods/zazawoods-3d-configurator.git`.
3. **Snapshot папки `~/Desktop/текстура`** — содержит этот HANDOFF.md, embed-snippet.html, konfigurator-embed.liquid, исходники текстур.
4. **Shopify Theme export**: в админке Shopify → Online Store → Themes → у активной темы три точки → **Download theme file** (.zip). Делать раз в неделю или после каждого крупного изменения.
5. **GitHub PAT** — токен для пуша с моей стороны хранится только в /tmp среды Claude. Если будешь продолжать с другим AI или сменишь чат — сгенерируй новый fine-grained token в GitHub Settings → Developer settings → Fine-grained tokens, дай ему доступ только на репо `zazawoods-3d-configurator` (Contents: read/write) и срок жизни до 90 дней. Старый — Revoke.

---

## 16. Live URLs

- Standalone: https://zazawoods-3d-configurator-production.up.railway.app
- На сайте: https://zazawoods.de/pages/konfigurator
- AR-generator (внутренний): https://zazawoods-3d-configurator-production.up.railway.app/ar-generator.html

---

## 17. Контекст для нового ИИ-чата

Если начнёшь новый разговор:

1. Дай этот файл целиком (`HANDOFF.md`).
2. Скажи, что код на GitHub, тебе нужно push-доступ через fine-grained PAT с правами Contents.
3. ИИ должен править `index.html` (главный файл), деплоить через push в main → Railway за 1-2 мин подхватывает.
4. Для проверки результата — `https://zazawoods-3d-configurator-production.up.railway.app/?v=<cachebust>`.
5. На live-сайте Shopify — `https://zazawoods.de/pages/konfigurator` (iframe).

Все основные технические решения уже задокументированы в этом файле. Архитектурно конфигуратор стабилизировался; обычно нужны только мелкие тюнинги (цвета, размеры, новые длины, замена variant ID).
