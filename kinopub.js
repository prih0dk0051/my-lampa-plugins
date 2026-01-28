(function () {
    'use strict';

    // Твой конфиг, который ты кидал
    var Settings = {
        "KinoPub": {
            "enable": true,
            "token": "00ocvi9flomjl03soaffm3xe81w5t23q"
        }
    };

    function KinoPub(object) {
        var network = new Lampa.Reguest();
        var scroll  = new Lampa.Scroll({mask: true, over: true});
        var files   = new Lampa.Explorer(object);
        
        this.create = function () {
            var _this = this;
            this.activity.loader(true);

            // Поиск по ID (как в твоем примере Lampac)
            var url = 'https://api.kino.pub/v1/items/search?q=' + (object.movie.imdb_id || object.movie.title || object.movie.name);
            url += '&access_token=' + Settings.KinoPub.token;

            network.silent(url, function (json) {
                _this.activity.loader(false);
                if (json && json.items && json.items.length > 0) {
                    _this.display(json.items[0]);
                } else {
                    Lampa.Noty.show('KinoPub: Ничего не найдено');
                }
            }, function () {
                _this.activity.loader(false);
                Lampa.Noty.show('Ошибка сети или токена');
            });

            return files.render();
        };

        this.display = function (item) {
            // Тут логика отрисовки как в нормальном плагине
            var list = [{
                title: item.title,
                quality: 'FullHD',
                url: 'https://api.kino.pub/v1/items/' + item.id + '?access_token=' + Settings.KinoPub.token
            }];

            files.appendFiles(scroll.render());
            
            list.forEach(function (element) {
                var card = Lampa.Template.get('online_prestige_full', element);
                card.on('hover:enter', function () {
                    Lampa.Player.play({url: element.url, title: element.title});
                });
                scroll.append(card);
            });
        };
    }

    // Регистрация в стиле Lampac
    if (window.appready) {
        Lampa.Component.add('kinopub_plugin', KinoPub);
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                e.data.helper.sources.push({title: 'KinoPub', name: 'kinopub_plugin'});
            }
        });
    }
})();