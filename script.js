var TickTock = TickTock || {};

(function() {
    TickTock.PubSub = (function() {
        var API = {};
        var subscribers = {};

        var ensureSubscriptionCollection = function(message) {
            subscribers[message] = subscribers[message] || [];
        };

        API.publish = function(message, args) {
            var i;
            ensureSubscriptionCollection(message);

            for (i = 0; i < subscribers[message].length; i++) {
                subscribers[message][i](args);
            }
        };

        API.subscribe = function(message, fn) {
            ensureSubscriptionCollection(message);
            subscribers[message].push(fn);
        };

        return API;
    })();

    TickTock.Timer = (function() {
        var API = {};
        var running = false;
        var elapsed = 0;
        var length = 10 * 1000;
        var cycleTime = 20;
        var updateTime = null;
        var started = null;

        updateTime = function() {
            if (running === false) {
                return;
            }

            var now = new Date();
            elapsed = now - started ;

            if (elapsed >= length) {
                elapsed = length;
                running = false;
                TickTock.PubSub.publish('timeChanged', { 'elapsed': elapsed, 'length': length });
                TickTock.PubSub.publish('timerComplete', { 'elapsed': elapsed, 'length': length });
                return;
            }

            TickTock.PubSub.publish('timeChanged', { 'elapsed': elapsed, 'length': length });
            setTimeout(updateTime, cycleTime);
        };

        API.start = function() {
            running = true;
            started = new Date() - elapsed;
            updateTime();
            TickTock.PubSub.publish('timerStarted', { 'elapsed': elapsed, 'length': length });
        };

        API.stop = function() {
            running = false;
            TickTock.PubSub.publish('timerStopped', { 'elapsed': elapsed, 'length': length });
        };

        API.reset = function() {
            elapsed = 0;
            started = new Date();
            TickTock.PubSub.publish('timeChanged', { 'elapsed': elapsed, 'length': length });
            TickTock.PubSub.publish('timerReset', { 'elapsed': elapsed, 'length': length });
        };

        API.setDuration = function(minutes, seconds) {
            var safeElapsed = elapsed;
            minutes = parseInt(minutes);
            seconds = parseInt(seconds);

            seconds = (minutes * 60) + seconds;
            length = seconds * 1000;

            if (safeElapsed > length) {
                safeElapsed = length;
            }

            TickTock.PubSub.publish('timerDurationSet', { 'elapsed': safeElapsed, 'length': length });
        };

        return API;
    })();
})();

$(function() {
    var progress = $('#progress');
    TickTock.PubSub.subscribe('timeChanged', function(args) {
        progress.css('width', ((args.elapsed / args.length) * 100) + '%');
    });

    var padNumber = function(number) {
        var numberDisplay = number.toFixed(0);

        if (numberDisplay.length < 2) {
            numberDisplay = '0' + numberDisplay;
        }

        return numberDisplay;
    };

    var timeText = $('#time');

    TickTock.PubSub.subscribe('timeChanged', function(args) {
        var seconds = args.elapsed / 1000;
        var minutes = Math.floor(seconds / 60);

        seconds = seconds - (minutes * 60);

        timeText.text(padNumber(minutes) + ':' + padNumber(seconds));
    });

    var startButton = $('#start');
    startButton.click(function() {
        TickTock.Timer.start();
    });

    var stopButton = $('#stop');
    stopButton.click(function() {
        TickTock.Timer.stop();
    });

    var resetButton = $('#reset');
    resetButton.click(function() {
        TickTock.Timer.reset();
    });

    var setMinutes = $('#setMinutes');
    var setSeconds = $('#setSeconds');
    var setTimeButton = $('#setTime');

    var setTime = function() {
        TickTock.Timer.setDuration(setMinutes.val(), setSeconds.val());
    };

    setMinutes.change(setTime);
    setSeconds.change(setTime);

    setTime();
});
