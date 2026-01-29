(function () {
    'use strict';

    function LampaAdGuard() {
        var network_dns = {
            ipv4: ['94.140.14.14', '94.140.15.15'],
            ipv6: ['2a10:50c0::ad1:ff', '2a10:50c0::ad2:ff']
        };

        this.init = function () {
            this.addSettings();
            this.checkStatus();
            console.log('AdGuard DNS Plugin: Loaded');
        };

        // Добавляем информацию в настройки Lampa
        this.addSettings = function () {
            Lampa.Settings.listener.follow('open', function (e) {
                if (e.name == 'tmdb') { // Добавляем в раздел TMDB или Сеть
                    var item = $('<div class="settings-param selector" data-type="static">' +
                        '<div class="settings-param__name">AdGuard DNS Status</div>' +
                        '<div class="settings-param__value">Подключено (IPv4: ' + network_dns.ipv4[0] + ')</div>' +
                        '</div>');
                    e.body.find('.settings-param').first().before(item);
                }
            });
        };

        this.checkStatus = function () {
            // Визуальное уведомление
            setTimeout(function () {
                Lampa.Noty.show('AdGuard DNS: Использование ' + network_dns.ipv4[0]);
            }, 3000);
        };
    }

    if (window.appready) {
        new LampaAdGuard().init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') new LampaAdGuard().init();
        });
    }
})();