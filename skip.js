(function () {
    'use strict';

    function hideAds() {
        // Список известных ID и классов рекламных контейнеров балансеров
        const adSelectors = [
            '[id^="ad-"]', 
            '.video-ad', 
            '.player-ads', 
            '.preroll-block', 
            '#pre-roll',
            '.cl-ad-skip', // Кнопка пропуска в Collaps
            '.vast-ad-container',
            '.advertising_overflow',
            'iframe[src*="doubleclick"]',
            'iframe[src*="ads"]'
        ];

        // 1. Инъекция стилей для скрытия
        const style = document.createElement('style');
        style.innerHTML = `
            ${adSelectors.join(', ')} {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
                z-index: -1 !important;
            }
            /* Скрываем надпись "Реклама" если она текстовая */
            div:contains("Реклама"), span:contains("Реклама") {
                 display: none !important;
            }
        `;
        document.head.appendChild(style);

        // 2. Попытка удалить существующие узлы каждые 2 секунды
        setInterval(() => {
            adSelectors.forEach(selector => {
                document.querySelectorAll(selector).forEach(el => el.remove());
            });
        }, 2000);
    }

    // Запуск
    if (window.Lampa) {
        hideAds();
    }
})();