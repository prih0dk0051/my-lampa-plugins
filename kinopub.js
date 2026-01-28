(function() {
  'use strict';

  // Твоя конфигурация
  var Settings = {
    "KinoPub": {
      "enable": true,
      "token": "00ocvi9flomjl03soaffm3xe81w5t23q"
    }
  };

  var api_url = 'https://api.kino.pub/v1/';

  function KP_Source(component, _object) {
    var network = new Lampa.Reguest();
    var results = [];
    var extract = {};
    var object = _object;
    var choice = { season: 0, voice: 0, voice_name: 'Кинопаб' };

    this.searchByTitle = function(_object, query) {
      var _this = this;
      if (!Settings.KinoPub.enable || !Settings.KinoPub.token) {
        Lampa.Noty.show('KinoPub отключен или нет токена');
        return;
      }

      // Используем IMDB или Кинопоиск ID если есть, иначе поиск по названию
      var id_query = object.movie.imdb_id || object.movie.kinopoisk_id;
      var url = api_url + 'items/' + (id_query ? 'search?q=' + id_query : 'search?q=' + encodeURIComponent(query));
      url += '&access_token=' + Settings.KinoPub.token;

      network.clear();
      network.silent(url, function(json) {
        if (json && json.items && json.items.length > 0) {
          var card = json.items[0]; // Берем наиболее релевантный
          _this.find(card.id);
        } else {
          component.loading(false);
          Lampa.Noty.show('KinoPub: Ничего не найдено');
        }
      }, function() {
        component.loading(false);
      });
    };

    this.find = function(id) {
      var _this = this;
      network.silent(api_url + 'items/' + id + '?access_token=' + Settings.KinoPub.token, function(found) {
        if (found && found.item) {
          results = found.item;
          _this.extractData(found.item);
          _this.filter();
          _this.append(_this.filtred());
          component.loading(false);
        }
      });
    };

    this.extractData = function(data) {
      extract = { 1: { json: [], file: '' } };
      if (data.seasons) {
        data.seasons.forEach(function(s) {
          var episodes = s.episodes.map(function(e) {
            return {
              title: 'Серия ' + e.number + (e.title ? ' - ' + e.title : ''),
              file: e.files[0].url.hls || e.files[0].url.http,
              episode: e.number,
              season: s.number,
              quality: 'FullHD'
            };
          });
          extract[1].json.push({ id: s.number, title: 'Сезон ' + s.number, folder: episodes });
        });
      } else if (data.videos) {
        extract[1].file = data.videos[0].files[0].url.hls || data.videos[0].files[0].url.http;
      }
    };

    this.filter = function() {
      var filter_items = { season: [], voice: ['Кинопаб'] };
      if (results.seasons) {
        results.seasons.forEach(function(s) { filter_items.season.push('Сезон ' + s.number); });
      }
      component.filter(filter_items, choice);
    };

    this.filtred = function() {
      if (results.seasons) {
        var s_data = extract[1].json.find(function(s) { return s.id == (choice.season + 1); });
        return s_data ? s_data.folder : [];
      }
      return [{ title: results.title, quality: 'FullHD', voice_name: 'Кинопаб' }];
    };

    this.append = function(items) {
      component.reset();
      component.draw(items, {
        onEnter: function(item) {
          var play_url = results.seasons ? item.file : extract[1].file;
          Lampa.Player.play({ url: play_url, title: item.title || results.title });
        }
      });
    };

    this.extendChoice = function(saved) { Lampa.Arrays.extend(choice, saved, true); };
    this.reset = function() { this.append(this.filtred()); };
    this.destroy = function() { network.clear(); };
  }

  function KP_Component(object) {
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var source = new KP_Source(this, object);

    this.initialize = function() {
      var _this = this;
      filter.onSelect = function(type, a, b) {
        if (type == 'filter') {
          source.filter(type, a, b);
        }
      };
      files.appendFiles(scroll.render());
      files.appendHead(filter.render());
      this.search();
    };

    this.search = function() {
      this.activity.loader(true);
      source.searchByTitle(object, object.movie.title || object.movie.name);
    };

    this.filter = function(filter_items, choice) {
      var select = [];
      if (filter_items.season.length) {
        select.push({
          title: 'Сезон',
          subtitle: filter_items.season[choice.season],
          items: filter_items.season.map(function(n, i) { return { title: n, index: i, selected: i == choice.season }; }),
          stype: 'season'
        });
      }
      filter.set('filter', select);
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
    this.loading = function(status) { this.activity.loader(status); };
  }

  function init() {
    Lampa.Component.add('kp_lampac', KP_Component);
    Lampa.Listener.follow('full', function(e) {
      if (e.type == 'complite') {
        e.data.helper.sources.push({
          title: 'KinoPub Lampac',
          name: 'kp_lampac'
        });
      }
    });
  }

  if (window.appready) init();
  else Lampa.Events.on('app:ready', init);
})();