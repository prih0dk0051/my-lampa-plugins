(function() {
    'use strict';

    // Ждем инициализации Lampa
    var script_loaded = false;
    var waitLampa = setInterval(function() {
        if (typeof Lampa !== 'undefined') {
            clearInterval(waitLampa);
            if (script_loaded) return;
            
            // Основная ссылка на онлайн-скрипт
            var online_url = 'http://83.143.112.137:11333/online/js/bylampa';

            // Загружаем основной функционал
            Lampa.Utils.putScriptAsync([online_url], function() {
                console.log('Plugin: Online script loaded');
            });
            
            script_loaded = true;
        }
    }, 200);

    // Вторая часть (дополнительный сервис, если нужен)
    var waitLampa2 = setInterval(function() {
        if (typeof Lampa !== 'undefined') {
            clearInterval(waitLampa2);
            
            // Установка ID если его нет
            var currentID = Lampa.Storage.get('lampac_unic_id', '');
            if (currentID !== 'tyusdt') {
                Lampa.Storage.set('lampac_unic_id', 'tyusdt');
            }

            // Загрузка доп. скрипта
            Lampa.Utils.putScriptAsync(['http://185.87.48.42:2627/online.js'], function() {
                console.log('Plugin: Second service loaded');
            });
        }
    }, 300);
})();