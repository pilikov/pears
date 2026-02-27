# Altai Sticky Block Reuse

Готовый переиспользуемый пакет для блока “Алтай: pinned фон + смена карточек по скроллу”.

## Состав
- `altai-sticky-block.css` — стили блока
- `altai-sticky-block.js` — инициализация и поведение
- `PROMPT.md` — проверенный промпт для переноса в другой проект

## Подключение
1. Подключить CSS:
```html
<link rel="stylesheet" href="snippets/altai-sticky-reuse/altai-sticky-block.css">
```

2. Подключить JS:
```html
<script src="snippets/altai-sticky-reuse/altai-sticky-block.js"></script>
```

3. Инициализировать:
```html
<script>
  AltaiStickyBlock.init({
    replaceSelector: "div.css-uk8455.css-5knerd",
    blockHeightPx: 5000,
    cardHoldPortion: 0.82,
    cardRightPx: 156,
    cardWidthPx: 460,
    kicker: "алтай",
    headingHtml: "Место силы<br>и вдохновения",
    kickerClass: "tune-smallcaps-lead",
    backgroundVideo: "https://storage.yandexcloud.net/pears/river.mp4",
    cards: [
      {
        image: "images/cab82d9c967f10de33704e21e57502e7bb2ba0f8.png",
        text: "Более 300 солнечных дней в году, чистые озёра и бескрайние леса наполняют Алтай жизнью.",
        bg: "rgba(47, 65, 89, 0.90)"
      },
      {
        image: "images/24fc71f5756c98d9a3d3354e06af27be5b4232ad.png",
        text: "Горные маршруты и живописные виды делают каждый день на Алтае новым сценарием отдыха.",
        bg: "rgba(42, 70, 89, 0.90)"
      },
      {
        image: "images/8fc85fd362ec5d8980781bc1149ef0ebd00fab95.png",
        text: "Река, воздух и тишина помогают переключиться от города к спокойному природному ритму.",
        bg: "rgba(55, 78, 95, 0.90)"
      },
      {
        image: "images/69ab2d81493341e4790148957b1d025871e331f4.png",
        text: "Сезоны здесь меняются ярко: каждый приезд открывает новые цвета, маршруты и впечатления.",
        bg: "rgba(69, 86, 102, 0.90)"
      },
      {
        image: "images/a473a63e71461cd69243e8ce3e1af5e8394a1b8c.png",
        text: "Пространство резиденции остаётся камерным и приватным, сохраняя ощущение места силы.",
        bg: "rgba(56, 72, 90, 0.90)"
      }
    ]
  });
</script>
```

## Важно при встраивании
- Если проект экспортирован из Figma Sites, у брейкпоинт-контейнера часто фиксированная высота.  
  Этот модуль автоматически поднимает высоту контейнера до `scrollHeight`, чтобы низ страницы не обрезался.
- Для анимации заголовка “Место силы и вдохновения” используются `gsap + SplitType` (если доступны в `window`).
- При `prefers-reduced-motion: reduce` анимации отключаются автоматически.

## Быстрые настройки
- Длина блока: `blockHeightPx`
- Скорость смены карточек: `cardHoldPortion`
- Позиция карточки справа: `cardRightPx`
- Ширина карточки: `cardWidthPx`
