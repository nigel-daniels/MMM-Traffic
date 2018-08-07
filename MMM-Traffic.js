/* global Module */

/* Magic Mirror
 * Module: MMM-Traffic
 *
 * By Sam Lewis https://github.com/SamLewis0602
 * MIT Licensed.
 */

Module.register('MMM-Traffic', {

    defaults: {
        api_key: '',
        mode: 'driving',
        interval: 300000, //all modules use milliseconds
        origin: '',
        destination: '',
        traffic_model: 'best_guess',
        departure_time: 'now',
        arrival_time: '',
        loadingText: 'Loading commute...',
        prependText: 'Current commute is',
        changeColor: false,
        limitYellow: 10,
        limitRed: 30,
        showGreen: true,
        language: config.language,
        show_summary: true,
        showWeekend: true,
        allTime: true,
        startHr: 7,
        endHr: 10,
        avoid:''
    },

    start: function() {
        Log.info('Starting module: ' + this.name);
        if (this.data.classes === 'MMM-Traffic') {
          this.data.classes = 'bright medium';
        }
        this.loaded = false;
        this.leaveBy = '';
        this.url = encodeURI('https://maps.googleapis.com/maps/api/directions/json' + this.getParams());
        this.symbols = {
            'driving': 'fa fa-car',
            'walking': 'fa fa-odnoklassniki',
            'bicycling': 'fa fa-bicycle',
            'transit': 'fa fa-train'
        };
        this.commute = '';
        this.summary = '';
        this.updateCommute(this);
    },

    updateCommute: function(self) {
        timeConfig = {
          showWeekend:    self.config.showWeekend,
          allTime:        self.config.allTime,
          startHr:        self.config.startHr,
          endHr:          self.config.endHr
        };

        if (self.config.arrival_time.length == 4) {
          self.sendSocketNotification('LEAVE_BY', {'url':self.url, 'arrival':self.config.arrival_time, 'timeConfig':timeConfig});
        } else {
          self.sendSocketNotification('TRAFFIC_URL', {'url':self.url, 'timeConfig':timeConfig});
        }
        setTimeout(self.updateCommute, self.config.interval, self);
    },

    getStyles: function() {
        return ['traffic.css', 'font-awesome.css'];
    },

    getDom: function() {
        var wrapper = document.createElement("div");
        var commuteInfo = document.createElement('div'); //support for config.changeColor

        if (!this.loaded) {
            wrapper.innerHTML = this.config.loadingText;
            return wrapper;
        }

        //symbol
        var symbol = document.createElement('span');
        symbol.className = this.symbols[this.config.mode] + ' symbol';
        commuteInfo.appendChild(symbol);

        if (this.config.arrival_time == '') {
          //commute time
          var trafficInfo = document.createElement('span');
		  trafficInfo.className = 'trafficInfo';
          trafficInfo.innerHTML = this.config.prependText + ' ' + this.commute;
          commuteInfo.appendChild(trafficInfo);

          //change color if desired and append
          if (this.config.changeColor) {
            if (this.trafficComparison >= 1 + (this.config.limitRed / 100)) {
              commuteInfo.className += ' red';
            } else if (this.trafficComparison >= 1 + (this.config.limitYellow / 100)) {
              commuteInfo.className += ' yellow';
            } else if (this.config.showGreen) {
              commuteInfo.className += ' green';
            }
          }
          wrapper.appendChild(commuteInfo);

          //routeName
          if (this.config.route_name) {
            var routeName = document.createElement('div');
            routeName.className = 'dimmed small trafficRoute';
            if (this.summary.length > 0 && this.config.show_summary){
              routeName.innerHTML = this.config.route_name + ' via ' + this.summary; //todo translatable?
            } else {
              routeName.innerHTML = this.config.route_name;
            }
            wrapper.appendChild(routeName);
          }
        } else {
          //leave-by time
          var trafficInfo = document.createElement('span');
		  trafficInfo.className = 'trafficInfo';
          trafficInfo.innerHTML = "Leave by " + this.leaveBy;
          commuteInfo.appendChild(trafficInfo);
  	      wrapper.appendChild(commuteInfo);

          //routeName
          if (this.config.route_name) {
            var routeName = document.createElement('div');
            routeName.className = 'dimmed small trafficRoute';
            if (this.summary.length > 0 && this.config.show_summary){
              routeName.innerHTML = this.config.route_name + ' via ' + this.summary + " to arrive by " + this.config.arrival_time.substring(0,2) + ":" + this.config.arrival_time.substring(2,4);
            } else {
	      console.log(typeof this.config.arrival_time );
              routeName.innerHTML = this.config.route_name + " to arrive by " + this.config.arrival_time.substring(0,2) + ":" + this.config.arrival_time.substring(2,4);
            }
            wrapper.appendChild(routeName);
          }
        }
        return wrapper;
    },

    getParams: function() {
        var params = '?';
        params += 'mode=' + this.config.mode;
        params += '&origin=' + this.config.origin;
        params += '&destination=' + this.config.destination;
        params += '&key=' + this.config.api_key;
        params += '&traffic_model=' + this.config.traffic_model;
        params += '&language=' + this.config.language;
        if (this.config.avoid.length > 0) {
          params += '&avoid=' + this.config.avoid;
        }
        return params;
    },

    socketNotificationReceived: function(notification, payload) {
        this.leaveBy = '';
        if (notification === 'TRAFFIC_COMMUTE' && payload.url === this.url) {
            Log.info('received TRAFFIC_COMMUTE');
            this.commute = payload.commute;
            this.summary = payload.summary;
            this.trafficComparison = payload.trafficComparison;
            this.loaded = true;
            this.updateDom(1000);
        } else if (notification === 'TRAFFIC_TIMING' && payload.url === this.url) {
            Log.info('received TRAFFIC_TIMING');
            this.leaveBy = payload.commute;
            this.summary = payload.summary;
            this.loaded = true;
            this.updateDom(1000);
        }
    }

});
