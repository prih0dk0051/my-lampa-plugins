(function () {
    'use strict';

    // Константы
    var KP_TOKEN = "00ocvi9flomjl03soaffm3xe81w5t23q";
    var API_URL = 'https://api.kino.pub/v1/';
    
    // Основная логика источника (на базе Filmix)
    function KinopubAPI(component, _object) {
        var network = new Lampa.Reguest();
        var extract = {};
        var results = [];
        var object = _object;
        var filter_items = {};
        var choice = {
            season: 0,
            voice: 0,
            voice_name: ''
        };

        this.search = function (_object, found_items) {
            if (found_items && found_items.length) this.getItemDetails(found_items[0].id);
        };

        this.searchByTitle = function (_object, query) {
            var _this = this;
            object = _object;
            var year = (object.movie.release_date || object.movie.first_air_date || '').slice(0, 4);
            var url = API_URL + 'items/search?q=' + encodeURIComponent(query) + '&access_token=' + KP_TOKEN;

            network.clear();
            network.silent(url, function (json) {
                if (json && json.items && json.items.length > 0) {
                    // Фильтруем по году как в Filmix
                    var exact = json.items.find(function(i) { return i.year == year; });
                    if (exact) _this.getItemDetails(exact.id);
                    else {
                        // Показываем похожие, если нет точного совпадения
                        component.similars(json.items.map(function(i){
                            return {
                                id: i.id,
                                title: i.title,
                                year: i.year,
                                rating: i.rating,
                                filmId: i.id
                            };
                        }));
                        component.loading(false);
                    }
                } else component.doesNotAnswer();
            }, function () {
                component.doesNotAnswer();
            });
        };

        this.getItemDetails = function (id) {
            var _this = this;
            network.clear();
            network.silent(API_URL + 'items/' + id + '?access_token=' + KP_TOKEN, function (data) {
                if (data && data.item) {
                    results = data.item;
                    _this.extractData(data.item);
                    _this.filter();
                    _this.append(_this.filtred());
                    component.loading(false);
                } else component.doesNotAnswer();
            });
        };

        this.extractData = function (item) {
            extract = {};
            if (item.seasons) {
                // Логика сериала
                item.seasons.forEach(function (season) {
                    var s_num = season.number;
                    season.episodes.forEach(function (episode) {
                        var e_num = episode.number;
                        // Группируем по переводам (если есть в API Kinopub)
                        var transl_id = 1; 
                        if(!extract[transl_id]) extract[transl_id] = { json: [] };
                        
                        var folder = extract[transl_id].json.find(function(f){ return f.id == s_num; });
                        if(!folder){
                            folder = { id: s_num, comment: s_num + ' сезон', folder: [] };
                            extract[transl_id].json.push(folder);
                        }

                        folder.folder.push({
                            id: s_num + '_' + e_num,
                            episode: e_num,
                            season: s_num,
                            title: e_num + ' серия - ' + (episode.title || ''),
                            file: episode.files[0].url.hls || episode.files[0].url.http,
                            quality: '720p / 1080p',
                            translation: transl_id
                        });
                    });
                });
            } else if (item.videos) {
                // Логика фильма
                item.videos.forEach(function (v, i) {
                    var t_id = i + 1;
                    extract[t_id] = {
                        file: v.files[0].url.hls || v.files[0].url.http,
                        translation: 'Вариант ' + t_id,
                        quality: 'FullHD'
                    };
                });
            }
        };

        this.filter = function () {
            filter_items = { season: [], voice: [] };
            if (results.seasons) {
                results.seasons.forEach(function(s){ filter_items.season.push('Сезон ' + s.number); });
                filter_items.voice.push('Стандартный');
            }
            component.filter(filter_items, choice);
        };

        this.filtred = function () {
            var list = [];
            if (results.seasons) {
                var current_s = extract[1].json.find(function(f){ return f.id == (choice.season + 1); });
                if(current_s) {
                    current_s.folder.forEach(function(m){
                        list.push({
                            title: m.title,
                            episode: m.episode,
                            season: m.season,
                            file: m.file,
                            quality: m.quality,
                            voice_name: 'Кинопаб'
                        });
                    });
                }
            } else {
                for(var id in extract){
                    list.push({
                        title: results.title,
                        file: extract[id].file,
                        quality: extract[id].quality,
                        voice_name: extract[id].translation
                    });
                }
            }
            return list;
        };

        this.append = function (items) {
            component.reset();
            component.draw(items, {
                onEnter: function (item) {
                    Lampa.Player.play({
                        url: item.file,
                        title: item.title,
                        callback: item.mark
                    });
                    if(item.mark) item.mark();
                }
            });
        };

        this.extendChoice = function(saved) { Lampa.Arrays.extend(choice, saved, true); };
        this.reset = function() { this.append(this.filtred()); };
        this.destroy = function() { network.clear(); };
    }

    // Компонент отрисовки (интерфейс Lampa)
    function KinopubComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var files = new Lampa.Explorer(object);
        var filter = new Lampa.Filter(object);
        var source = new KinopubAPI(this, object);

        this.initialize = function () {
            var _this = this;
            filter.onSelect = function(type, a, b) {
                if (type == 'filter') source.filter(type, a, b);
            };
            files.appendFiles(scroll.render());
            files.appendHead(filter.render());
            this.search();
        };

        this.search = function () {
            this.activity.loader(true);
            source.searchByTitle(object, object.movie.title || object.movie.name);
        };

        this.draw = function (items, params) {
            var _this = this;
            if (!items.length) return this.empty();
            
            items.forEach(function (element) {
                // Шаблон "Престиж" как в Filmix
                var html = Lampa.Template.get('online_prestige_full', element);
                html.on('hover:enter', function () { params.onEnter(element); });
                scroll.append(html);
            });
            this.loading(false);
        };

        this.loading = function(status) { this.activity.loader(status); };
        this.reset = function() { scroll.clear(); };
        this.empty = function() { 
            scroll.append(Lampa.Template.get('empty'));
            this.loading(false); 
        };
        this.render = function () { return files.render(); };
        this.destroy = function () { scroll.destroy(); source.destroy(); };
    }

    // Регистрация
    function start() {
        Lampa.Component.add('kinopub_mod', KinopubComponent);
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') {
                var sources = e.data.helper.sources || [];
                sources.push({ title: 'KinoPub VIP', name: 'kinopub_mod', full_name: 'KinoPub' });
            }
        });
    }

    if (window.appready) start();
    else Lampa.Events.on('app:ready', start);
})();