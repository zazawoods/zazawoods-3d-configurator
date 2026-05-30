# Zaza Woods — 3D Konfigurator

3D-конфигуратор столов для **zazawoods.de** (Shopify, Codixel theme).
Покупатель выбирает каркас (W/U/X), длину, спинки/лавки, видит живую цену,
кладёт правильный Shopify-вариант в корзину.

Live:        https://zazawoods.de/pages/konfigurator
Standalone:  https://zazawoods-3d-configurator-production.up.railway.app/

---

## Документация

**Открывай первым делом если ты ИИ или новый разработчик:**
[`docs/HANDOFF.md`](docs/HANDOFF.md) — полная техническая документация (архитектура,
технологии, поведение визарда, AR, security, performance, troubleshooting,
быстрые рецепты для типовых изменений).

Другие документы:
- [`docs/konfigurator-embed.liquid`](docs/konfigurator-embed.liquid) — Shopify-секция,
  которую нужно вставить в `sections/konfigurator-embed.liquid` темы Codixel.
- [`docs/embed-snippet.html`](docs/embed-snippet.html) — упрощённый HTML-сниппет
  для встраивания iframe (если без Liquid).

---

## Деплой

- Push в `main` → Railway автоматически пересобирает за ~1-2 мин.
- Сервер: `node server.js` (Express, отдаёт статику + AR-upload-endpoint).
- См. `package.json` (`"start": "node server.js"`).

## Основной код

- `index.html` — весь конфигуратор (HTML+CSS+three.js, один файл).
- `server.js` — мини-сервер.
- `angle.glb` / `picknick.glb` — 3D-модели.
- `material-douglas.jpg` — текстура для иконки Material.
- `ar.html` — страница автозапуска AR на телефоне.

## Стек

Three.js r160 · GLTFLoader/Exporter · DRACOLoader · USDZExporter ·
OrbitControls (custom smooth zoom) · Express 4 · Inter (Google Fonts) ·
qrcodejs (jsdelivr CDN) · Shopify Storefront Cart Permalinks.

## Бэкап

Этот репозиторий — основная резервная копия. Локально склонировать:
`git clone https://github.com/zazawoods/zazawoods-3d-configurator.git`.
