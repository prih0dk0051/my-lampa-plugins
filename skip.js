(function () {
    'use strict';

    // =================================================================
    // НАСТРОЙКИ
    // =================================================================
    var SKIP_SECONDS = 20; // Сколько секунд пропускать при старте
    var NOTIFY_USER = true; // Показывать ли уведомление о пропуске
    // =================================================================

    function startPlugin() {
        var skipped_flag = false;

        // Слушаем события плеера
        Lampa.Player.listener.follow('state', function (data) {
            // Когда видео начало воспроизводиться (playing)
            if (data.type == 'playing') {
                if (!skipped_flag) {
                    skipped_flag = true;
                    
                    // Небольшая задержка, чтобы плеер успел инициализироваться
                    setTimeout(function () {
                        try {
                            // Проверяем, поддерживает ли плеер перемотку
                            // и не находимся ли мы уже далеко от начала (например, если продолжили просмотр)
                            var currentPos = Lampa.Player.position(); 
                            
                            // Если мы в начале фильма (меньше 5 секунд от старта)
                            if (currentPos < 5) {
                                Lampa.Player.seek(SKIP_SECONDS);
                                
                                if (NOTIFY_USER) {
                                    Lampa.Noty.show('Реклама: пропущено ' + SKIP_SECONDS + ' сек.');
                                }
                            }
                        } catch (e) {
                            console.log('AutoSkip Error:', e);
                        }
                    }, 1500); // Ждем 1.5 секунды после старта
                }
            }
        });

        // Сбрасываем флаг при закрытии плеера или смене видео
        Lampa.Player.listener.follow('destroy', function () {
            skipped_flag = false;
        });
        
        // Дополнительный сброс при загрузке нового
        Lampa.Player.listener.follow('ready', function () {
             skipped_flag = false;
        });
    }

    if (window.Lampa) startPlugin();
    else window.onload = startPlugin;
})();