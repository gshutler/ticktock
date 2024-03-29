var TickTock = TickTock || {};

(function () {
    "use strict";

    /**
     * Object providing simple publish-subscribe functionality for the
     * TickTock model.
     */
    TickTock.PubSub = (function () {
        var API = {},
            channels = {},
            ensureChannel = null;

        /**
         * Ensures the named channel has a collection of subscribers.
         *
         * channel - The name of the channel that must have a collection of
         * subscribers.
         */
        ensureChannel = function (channel) {
            channels[channel] = channels[channel] || [];
        };

        /**
         * Publishes the given message across the named channel.
         *
         * channel - The name of the channel to publish the message along.
         * message - The message to pass to subscribing functions.
         */
        API.publish = function (channel, message) {
            var i;
            ensureChannel(channel);

            for (i = 0; i < channels[channel].length; i += 1) {
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
        API.subscribe = function (channel, subscriber) {
            ensureChannel(channel);
            channels[channel].push(subscriber);
        };

        return API;
    }());

    /**
     * Object encapsulating the functionality of the TickTock timer.
     *
     * Publishes via several channels during execution. Each message is in
     * the format:
     *
     *     { 'elapsed': elapsed, 'length': length }
     *
     * Where 'elapsed' and 'length' are both periods of time in
     * milliseconds. 'elapsed' represents the amount of time that has passed
     * according to the timer, 'length' represents the length of time the
     * timer is running for.
     *
     * Channels published to:
     *
     *  * timeChanged - Published when the internal time is updated
     *  * timerStarted - Published when the timer is started
     *  * timerComplete - Published when the timer has run for its duration
     *  * timerStopped - Published when the timer is stopped
     *  * timerReset - Published when the timer is reset
     */
    TickTock.Timer = (function () {
        var API = {},
            running = false,
            elapsed = 0,
            length = 5 * 1000,
            cycleTime = 20,
            updateTime = null,
            started = null,
            publishMessage = null;

        /**
         * Publishes a message to the named channel, setting default values on
         * the specified message or creating a message with default values as
         * appropriate.
         *
         * The default values are the current elapsed and timer length for
         * their respective fields if no value is specified.
         *
         * channel - The name of the channel to publish the message to.
         * message - The message to publish containing any non-default values.
         */
        publishMessage = function (channel, message) {
            message = message || {};
            message.elapsed = message.elapsed || elapsed;
            message.length = message.length || length;

            TickTock.PubSub.publish(channel, message);
        };

        /**
         * Updates the internal time of the timer, publishing messages
         * relating to the change in time as necessary.
         *
         * Will set a timeout to invoke itself again if the timer is still
         * running and has time remaining.
         */
        updateTime = function () {
            var now = null;

            if (running === false) {
                return;
            }

            now = new Date();
            elapsed = now - started;

            if (elapsed >= length) {
                elapsed = length;
                running = false;
                publishMessage('timeChanged');
                publishMessage('timerComplete');
                return;
            }

            publishMessage('timeChanged');
            setTimeout(updateTime, cycleTime);
        };

        /**
         * Starts the timer running.
         *
         * If the timer is has completed then it restarts the timer.
         */
        API.start = function () {
            running = true;

            if (elapsed >= length) {
                elapsed = 0;
            }

            started = new Date() - elapsed;
            updateTime();

            publishMessage('timerStarted');
        };

        /**
         * Stops the timer running.
         */
        API.stop = function () {
            running = false;
            publishMessage('timerStopped');
        };

        /**
         * Resets the timer.
         *
         * Sets the elapsed time to zero. If the timer is currently running
         * it continues running from the new start time.
         */
        API.reset = function () {
            elapsed = 0;
            started = new Date();

            publishMessage('timeChanged');
            publishMessage('timerReset');
        };

        /**
         * Sets the duration of the timer.
         *
         * If the timer is currently running then the timer will continue
         * working towards the new duration.
         *
         * minutes - The number of minutes the timer should run for.
         * seconds - The number of seconds the timer should run for.
         */
        API.setDuration = function (minutes, seconds) {
            var safeElapsed = elapsed;

            minutes = +minutes;
            seconds = +seconds;

            seconds = (minutes * 60) + seconds;
            length = seconds * 1000;

            if (safeElapsed > length) {
                safeElapsed = length;
            }

            publishMessage('timerDurationSet', { 'elapsed': safeElapsed });
        };

        return API;
    }());
}());

/**
 * Function for controlling the interaction of the UI and the TickTock
 * model.
 */
window.jQuery(document).ready(function ($) {
    "use strict";

    var progress = $('#progress'),
        body = $('body'),
        timeText = $('#time'),
        startButton = $('#start'),
        stopButton = $('#stop'),
        resetButton = $('#reset'),
        setMinutes = $('#setMinutes'),
        setSeconds = $('#setSeconds'),
        padNumber = null,
        setTime = null;

    /*
    Update the background progress bar whenever the elapsed time changes.
    */
    TickTock.PubSub.subscribe('timeChanged', function (args) {
        progress.css('width', ((args.elapsed / args.length) * 100) + '%');
    });

    /*
    Toggle a class on the body signifying when the timer is running.
    */
    TickTock.PubSub.subscribe('timerStarted', function () {
        body.addClass('playing');
    });
    TickTock.PubSub.subscribe('timerStopped', function () {
        body.removeClass('playing');
    });
    TickTock.PubSub.subscribe('timerComplete', function () {
        body.removeClass('playing');
    });

    /**
     * Returns a string representation of a number padded to two characters
     * with a zero if needed.
     *
     * number - The number to return a padded string representation of.
     */
    padNumber = function (number) {
        var numberDisplay = number.toFixed(0);
        return (numberDisplay.length >= 2) ? numberDisplay : '0' + numberDisplay;
    };

    /*
    Updates the UI element displaying the currently elapsed time.
    */
    TickTock.PubSub.subscribe('timeChanged', function (args) {
        var seconds = args.elapsed / 1000,
            minutes = Math.floor(seconds / 60);

        seconds = seconds - (minutes * 60);

        timeText.text(padNumber(minutes) + ':' + padNumber(seconds));
    });

    /*
    Make clicking the start button start the TickTock timer.
    */
    startButton.click(TickTock.Timer.start);

    /*
    Make clicking the stop button stop the TickTock timer.
    */
    stopButton.click(TickTock.Timer.stop);

    /*
    Make clicking the reset button reset the TickTock timer.
    */
    resetButton.click(TickTock.Timer.reset);

    /*
    Make changing the duration select lists update the TickTock duration.
    */

    setTime = function () {
        TickTock.Timer.setDuration(setMinutes.val(), setSeconds.val());
    };

    setMinutes.change(setTime);
    setSeconds.change(setTime);

    /*
    Initialize the TickTock timer so that it matches the selected values.
    */
    setTime();
});
