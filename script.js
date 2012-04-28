var TickTock = TickTock || {};

(function() {
    /**
     * Object providing simple publish-subscribe functionality for the
     * TickTock model.
     */
    TickTock.PubSub = (function() {
        var API = {};
        var channels = {};

        /**
         * Ensures the named channel has a collection of subscribers.
         *
         * channel - The name of the channel that must have a collection of
         * subscribers.
         */
        var ensureChannel = function(channel) {
            channels[channel] = channels[channel] || [];
        };

        /**
         * Publishes the given message across the named channel.
         *
         * channel - The name of the channel to publish the message along.
         * message - The message to pass to subscribing functions.
         */
        API.publish = function(channel, message) {
            var i;
            ensureChannel(channel);

            for (i = 0; i < channels[channel].length; i++) {
                channels[channel][i](message);
            }
        };

        /**
         * Adds a subscriber for the named channel.
         *
         * channel - The name of the channel to subscribe to.
         * subscriber - The function subscribing to messages on the named
         * channel.
         */
        API.subscribe = function(channel, subscriber) {
            ensureChannel(channel);
            channels[channel].push(subscriber);
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
                TickTock.PubSub.publish('timerStopped', { 'elapsed': elapsed, 'length': length });
                return;
            }

            TickTock.PubSub.publish('timeChanged', { 'elapsed': elapsed, 'length': length });
            setTimeout(updateTime, cycleTime);
        };

        API.start = function() {
            running = true;
            if (elapsed >= length) {
                elapsed = 0;
            }
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

    var body = $('body');
    TickTock.PubSub.subscribe('timerStarted', function() {
        body.addClass('playing');
    });
    TickTock.PubSub.subscribe('timerStopped', function() {
        body.removeClass('playing');
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
