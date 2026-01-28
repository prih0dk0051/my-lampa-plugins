(function () {
    'use strict';

    var kp_token = '00ocvi9flomjl03soaffm3xe81w5t23q';
    var api_url  = 'https://api.kino.pub/v1/';

    function KinopubAPI(component, _object) {
        var network = new Lampa.Reguest();
        var extract = {};
        var results = [];
        var object  = _object;
        var filter_items = {};
        var choice = { season: 0, voice: 0, voice_name: 'Кинопаб' };

        this.searchByTitle = function(_object, query) {
            var _this = this;
            object = _object;
            var year = (object.movie.release_date || object.movie.first_air_date || '').slice(0, 4);
            var url = api_url + 'items/search?q=' + encodeURIComponent(query) + '&access_token=' + kp_token;
            
            network.clear();
            network.silent(url, function(json) {
                if (json && json.items && json.items.length > 0) {
                    var exact = json.items.find(function(i) { return i.year == year; }) || json.items[0];
                    _this.find(exact.id);
                } else {
                    component.loading(false);
                    Lampa.Noty.show('Ничего не найдено на Kinopub');
                }
            }, function() {
                component.loading(false);
            });
        };

        this.find = function(id) {
            var _this = this;
            network.clear();
            network.silent(api_url + 'items/' + id + '?access_token=' + kp_token, function(found) {
                if (found && found.item) {
                    results = found.item;
                    _this.extractData(found.item);
                    _this.filter();
                    _this.append(_this.filtred());
                    component.loading(false);
                }
            });
        };

        this.extractData = function(item) {
            extract = { 1: { json: [], file: '' } };
            if (item.seasons) {
                item.seasons.forEach(function(s) {
                    var episodes = [];
                    s.episodes.forEach(function(e) {
                        episodes.push({
                            title: e.number + ' серия' + (e.title ? ' - ' + e.title : ''),
                            file: e.files[0].url.hls || e.files[0].url.http,
                            episode: e.number,
                            season: s.number,
                            translation: 1
                        });
                    });
                    extract[1].json.push({ id: s.number, folder: episodes });
                });
            } else if (item.videos) {
                extract[1].file = item.videos[0].files[0].url.hls || item.videos[0].files[0].url.http;
            }
        };

        this.filter = function() {
            filter_items = { season: [], voice: ['Кинопаб'] };
            if (results.seasons) {
                results.seasons.forEach(function(s) { filter_items.season.push('Сезон ' + s.number); });
            }
            component.filter(filter_items, choice);
        };

        this.filtred = function() {
            var filtred = [];
            if (results.seasons) {
                var s_data = extract[1].json.find(function(s) { return s.id == (choice.season + 1); });
                if (s_data) {
                    s_data.folder.forEach(function(m) {
                        filtred.push({ title: m.title, episode: m.episode, season: m.season, quality: 'FullHD' });
                    });
                }
            } else {
                filtred.push({ title: results.title, quality: 'FullHD' });
            }
            return filtred;
        };

        this.append = function(items) {
            component.reset();
            component.draw(items, {
                onEnter: function(item) {
                    var video_url = results.seasons ? extract[1].json.find(function(s){return s.id == item.season}).folder.find(function(e){return e.episode == item.episode}).file : extract[1].file;
                    Lampa.Player.play({ url: video_url, title: item.title });
                }
            });
        };

        this.extendChoice = function(saved) { Lampa.Arrays.extend(choice, saved, true); };
        this.reset = function() { this.append(this.filtred()); };
        this.destroy = function() { network.clear(); };
    }

    function startPlugin() {
        Lampa.Component.add('kp_mod', function(object) {
            var scroll = new Lampa.Scroll({ mask: true, over: true });
            var files = new Lampa.Explorer(object);
            var filter = new Lampa.Filter(object);
            var source = new KinopubAPI(this, object);

            this.initialize = function() {
                var _this = this;
                filter.onSelect = function(type, a, b) { if (type == 'filter') source.filter(type, a, b); };
                files.appendFiles(scroll.render());
                files.appendHead(filter.render());
                this.search();
            };

            this.search = function() {
                this.activity.loader(true);
                source.searchByTitle(object, object.movie.title || object.movie.name);
            };

            this.draw = function(items, params) {
                this.activity.loader(false);
                items.forEach(function(element) {
                    var html = Lampa.Template.get('online_prestige_full', element);
                    html.on('hover:enter', function() { params.onEnter(element); });
                    scroll.append(html);
                });
            };

            this.reset = function() { scroll.clear(); };
            this.render = function() { return files.render(); };
            this.destroy = function() { scroll.destroy(); source.destroy(); };
        });

        Lampa.Listener.follow('full', function(e) {
            if (e.type == 'complite') {
                e.data.helper.sources.push({ title: 'KinoPub VIP', name: 'kp_mod' });
            }
        });
    }

    if (window.appready) startPlugin();
    else Lampa.Events.on('app:ready', startPlugin);
})();
