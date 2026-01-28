(function() {
  'use strict';

  // Константы Kinopub
  var kp_token = '00ocvi9flomjl03soaffm3xe81w5t23q';
  var api_url  = 'https://api.kino.pub/v1/';

  function kinopub_api(component, _object) {
    var network = new Lampa.Reguest();
    var extract = {};
    var results = [];
    var object = _object;
    var wait_similars;
    var filter_items = {};
    var choice = {
      season: 0,
      voice: 0,
      voice_name: 'Кинопаб'
    };

    // Поиск по названию
    this.searchByTitle = function(_object, query) {
      var _this = this;
      object = _object;
      var url = api_url + 'items/search?q=' + encodeURIComponent(query) + '&access_token=' + kp_token;
      
      network.clear();
      network.silent(url, function(json) {
        if (json && json.items && json.items.length > 0) {
          // Ищем совпадение по году или берем первый результат
          var year = parseInt((object.movie.release_date || object.movie.first_air_date || '0000').slice(0, 4));
          var card = json.items.find(function(c) { return c.year == year; }) || json.items[0];
          
          _this.find(card.id);
        } else {
          component.loading(false);
          component.emptyForQuery(query);
        }
      }, function(a, c) {
        component.loading(false);
        component.empty(network.errorDecode(a, c));
      });
    };

    // Получение данных конкретного фильма/сериала
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
        } else {
          component.loading(false);
          component.empty();
        }
      }, function() {
        component.loading(false);
        component.empty();
      });
    };

    // Извлечение ссылок (Аналог extractData из Filmix)
    this.extractData = function(data) {
      extract = {};
      var transl_id = 1; // У Kinopub обычно одна ветка видео, если не указано иное

      if (data.seasons && data.seasons.length > 0) {
        // Логика сериала
        data.seasons.forEach(function(season) {
          var items = [];
          season.episodes.forEach(function(episode) {
            items.push({
              id: season.number + '_' + episode.number,
              title: episode.number + ' серия' + (episode.title ? ' - ' + episode.title : ''),
              file: episode.files[0].url.hls || episode.files[0].url.http,
              episode: episode.number,
              season: season.number,
              quality: 'FullHD',
              translation: transl_id
            });
          });

          if (!extract[transl_id]) extract[transl_id] = { json: [] };
          extract[transl_id].json.push({
            id: season.number,
            comment: season.number + ' ' + Lampa.Lang.translate('torrent_serial_season'),
            folder: items,
            translation: transl_id
          });
        });
      } else if (data.videos && data.videos.length > 0) {
        // Логика фильма
        extract[transl_id] = {
          file: data.videos[0].files[0].url.hls || data.videos[0].files[0].url.http,
          translation: 'Кинопаб',
          quality: 'FullHD'
        };
      }
    };

    this.extendChoice = function(saved) {
      Lampa.Arrays.extend(choice, saved, true);
    };

    this.reset = function() {
      component.reset();
      this.filter();
      this.append(this.filtred());
    };

    this.filter = function(type, a, b) {
      if (a && b) choice[a.stype] = b.index;
      component.reset();
      this.filter_build();
      this.append(this.filtred());
    };

    this.filter_build = function() {
      filter_items = { season: [], voice: ['Кинопаб'] };
      if (results.seasons) {
        results.seasons.forEach(function(s) {
          filter_items.season.push(Lampa.Lang.translate('torrent_serial_season') + ' ' + s.number);
        });
      }
      component.filter(filter_items, choice);
    };

    this.filtred = function() {
      var filtred = [];
      if (results.seasons) {
        var s_id = choice.season + 1;
        var season_data = extract[1].json.find(function(s) { return s.id == s_id; });
        if (season_data) filtred = season_data.folder;
      } else {
        filtred.push({
          title: results.title,
          quality: 'FullHD',
          voice_name: 'Кинопаб'
        });
      }
      return filtred;
    };

    this.append = function(items) {
      component.reset();
      component.draw(items, {
        onEnter: function(item) {
          var url = results.seasons ? item.file : extract[1].file;
          Lampa.Player.play({
            url: url,
            title: item.title || results.title
          });
        }
      });
    };

    this.destroy = function() {
      network.clear();
      results = null;
    };
  }

  // Главный компонент (Основан на твоем примере)
  function component(object) {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var source = new kinopub_api(this, object);
    var selected_id;

    this.initialize = function() {
      var _this = this;
      filter.onSelect = function(type, a, b) {
        if (type == 'filter') source.filter(type, a, b);
      };
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
      var _this = this;
      items.forEach(function(element) {
        var html = Lampa.Template.get('online_prestige_full', element);
        html.on('hover:enter', function() { params.onEnter(element); });
        scroll.append(html);
      });
    };

    this.filter = function(filter_items, choice) {
      var select = [];
      var add = function(type, title) {
        var items = filter_items[type];
        var subitems = [];
        items.forEach(function(name, i) {
          subitems.push({ title: name, selected: choice[type] == i, index: i });
        });
        select.push({ title: title, subtitle: items[choice[type]], items: subitems, stype: type });
      };
      if (filter_items.voice.length > 0) add('voice', 'Перевод');
      if (filter_items.season.length > 0) add('season', 'Сезон');
      filter.set('filter', select);
    };

    this.reset = function() { scroll.clear(); };
    this.loading = function(status) { this.activity.loader(status); };
    this.render = function() { return files.render(); };
    this.destroy = function() { scroll.destroy(); source.destroy(); };
  }

  // Регистрация в Lampa
  function init() {
    Lampa.Component.add('kp_vip', component);
    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite') {
        var source = {
          title: 'KinoPub VIP',
          name: 'kp_vip',
          full_name: 'KinoPub'
        };
        if (e.data.helper) e.data.helper.sources.push(source);
      }
    });
  }

  if (window.appready) init();
  else Lampa.Events.on('app:ready', init);
})();