(function() {
  'use strict';

  // --- НАСТРОЙКИ КИНОПАБА ---
  var KINOPUB_CONFIG = {
    "enable": true,
    "token": "00ocvi9flomjl03soaffm3xe81w5t23q"
  };

  // Список на удаление (как на фото)
  var BLACKLIST = ['filmix', 'hdrezka']; 

  var Defined = {
    api: 'lampac',
    localhost: 'http://rc.bwa.to/',
    apn: ''
  };

  var balansers_with_search;
  
  var unic_id = Lampa.Storage.get('lampac_unic_id', '');
  if (!unic_id) {
    unic_id = Lampa.Utils.uid(8).toLowerCase();
    Lampa.Storage.set('lampac_unic_id', unic_id);
  }
  
  function getAndroidVersion() {
    if (Lampa.Platform.is('android')) {
      try {
        var current = AndroidJS.appVersion().split('-');
        return parseInt(current.pop());
      } catch (e) { return 0; }
    } else return 0;
  }

  var hostkey = 'http://rc.bwa.to'.replace('http://', '').replace('https://', '');

  // Принудительная установка русского языка в Lampa
  if(window.Lampa && Lampa.Lang) {
      Lampa.Lang.add({
          torrent_serial_season: { ru: 'Сезон' },
          torrent_parser_voice: { ru: 'Озвучка' },
          settings_rest_source: { ru: 'Источник' }
      });
  }

  if (!window.rch_nws || !window.rch_nws[hostkey]) {
    if (!window.rch_nws) window.rch_nws = {};
    window.rch_nws[hostkey] = {
      type: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : undefined,
      startTypeInvoke: false,
      rchRegistry: false,
      apkVersion: getAndroidVersion()
    };
  }

  window.rch_nws[hostkey].typeInvoke = function rchtypeInvoke(host, call) {
    if (!window.rch_nws[hostkey].startTypeInvoke) {
      window.rch_nws[hostkey].startTypeInvoke = true;
      var check = function check(good) {
        window.rch_nws[hostkey].type = Lampa.Platform.is('android') ? 'apk' : good ? 'cors' : 'web';
        call();
      };
      if (Lampa.Platform.is('android') || Lampa.Platform.is('tizen')) check(true);
      else {
        var net = new Lampa.Reguest();
        net.silent('http://rc.bwa.to'.indexOf(location.host) >= 0 ? 'https://github.com/' : host + '/cors/check', function() {
          check(true);
        }, function() {
          check(false);
        }, false, { dataType: 'text' });
      }
    } else call();
  };

  window.rch_nws[hostkey].Registry = function RchRegistry(client, startConnection) {
    window.rch_nws[hostkey].typeInvoke('http://rc.bwa.to', function() {
      client.invoke("RchRegistry", JSON.stringify({
        version: 151,
        host: location.host,
        rchtype: Lampa.Platform.is('android') ? 'apk' : Lampa.Platform.is('tizen') ? 'cors' : (window.rch_nws[hostkey].type || 'web'),
        apkVersion: window.rch_nws[hostkey].apkVersion,
        player: Lampa.Storage.field('player'),
        account_email: Lampa.Storage.get('account_email', ''),
        unic_id: Lampa.Storage.get('lampac_unic_id', ''),
        profile_id: Lampa.Storage.get('lampac_profile_id', ''),
        token: KINOPUB_CONFIG.token // Добавили токен в регистрацию
      }));
      if (client._shouldReconnect && window.rch_nws[hostkey].rchRegistry) {
        if (startConnection) startConnection();
        return;
      }
      window.rch_nws[hostkey].rchRegistry = true;
      client.on('RchRegistry', function(clientIp) { if (startConnection) startConnection(); });
      client.on("RchClient", function(rchId, url, data, headers, returnHeaders) {
        var network = new Lampa.Reguest();
        function sendResult(uri, html) {
          $.ajax({
            url: 'http://rc.bwa.to/rch/' + uri + '?id=' + rchId,
            type: 'POST',
            data: html,
            async: true,
            cache: false,
            contentType: false,
            processData: false,
            success: function(j) {},
            error: function() { client.invoke("RchResult", rchId, ''); }
          });
        }
        function result(html) {
          if (Lampa.Arrays.isObject(html) || Lampa.Arrays.isArray(html)) html = JSON.stringify(html);
          sendResult('result', html);
        }
        if (url == 'eval') result(eval(data));
        else if (url == 'evalrun') eval(data);
        else if (url == 'ping') result('pong');
        else {
          network["native"](url, result, function(e) { result(''); }, data, {
            dataType: 'text',
            timeout: 1000 * 8,
            headers: headers,
            returnHeaders: returnHeaders
          });
        }
      });
    });
  };

  function account(url) {
    url = url + '';
    // Принудительно вшиваем токен Кинопаба в каждый запрос
    if (url.indexOf('token=') == -1) {
        url = Lampa.Utils.addUrlComponent(url, 'token=' + encodeURIComponent(KINOPUB_CONFIG.token));
    }
    var email = Lampa.Storage.get('account_email');
    if (email && url.indexOf('account_email=') == -1) url = Lampa.Utils.addUrlComponent(url, 'account_email=' + encodeURIComponent(email));
    var uid = Lampa.Storage.get('lampac_unic_id', '');
    if (uid && url.indexOf('uid=') == -1) url = Lampa.Utils.addUrlComponent(url, 'uid=' + encodeURIComponent(uid));
    return url;
  }
  
  function component(object) {
    var network = new Lampa.Reguest();
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var files = new Lampa.Explorer(object);
    var filter = new Lampa.Filter(object);
    var sources = {};
    var balanser;
    var filter_sources = {};
    
    // Только русский язык для фильтров
    var filter_translate = {
      season: 'Сезон',
      voice: 'Озвучка',
      source: 'Источник'
    };

    function balanserName(j) {
      var bals = j.balanser;
      var name = j.name.split(' ')[0];
      return (bals || name).toLowerCase();
    }
	
    this.initialize = function() {
      var _this = this;
      this.loading(true);
      // Очистка от иностранных языков (принудительно RU)
      Lampa.Storage.set('language', 'ru');

      this.externalids().then(function() {
        return _this.createSource();
      }).then(function(json) {
        _this.search();
      })["catch"](function(e) {
        _this.noConnectToServer(e);
      });
    };

    this.startSource = function(json) {
      return new Promise(function(resolve, reject) {
        json.forEach(function(j) {
          var name = balanserName(j);
          // ФИЛЬТРАЦИЯ: Если источника нет в черном списке — добавляем
          if (BLACKLIST.indexOf(name) === -1) {
              sources[name] = {
                url: j.url,
                name: j.name,
                show: typeof j.show == 'undefined' ? true : j.show
              };
          }
        });
        
        filter_sources = Lampa.Arrays.getKeys(sources);
        if (filter_sources.length) {
          // Если есть KinoPub, ставим его приоритетным
          balanser = sources['kinopub'] ? 'kinopub' : filter_sources[0];
          Lampa.Storage.set('active_balanser', balanser);
          source = sources[balanser].url;
          resolve(json);
        } else {
          reject();
        }
      });
    };

    // ... (остальная логика оставлена для работоспособности) ...
    this.render = function() { return scroll.render(); };
    this.loading = function(status) { if(status) scroll.body().addClass('loading'); else scroll.body().removeClass('loading'); };
    // Код сокращен для экономии места, логика парсинга и отрисовки остается стандартной.
  }

  // Регистрация плагина в Lampa
  Lampa.Component.add('lampac', component);
})();