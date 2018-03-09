var ircColors = require('irc-colors');
var replyFor = require('./codes');

/**
 * parseMessage(line, stripColors)
 *
 * takes a raw "line" from the IRC server and turns it into an object with
 * useful keys
 * @param {String} line Raw message from IRC server.
 * @param {Boolean} stripColors If true, strip IRC colors.
 * @param {Boolean} enableStrictParse If true, will try to conform to RFC2812 strictly for parsing usernames (and disallow eg CJK characters).
 * @return {Object} A parsed message object.
 */
module.exports = function parseMessage(line, stripColors, enableStrictParse) {
    var message = {};
    var match;

    if (stripColors) {
        line = ircColors.stripColorsAndStyle(line);
    }

    // Parse prefix
    match = line.match(/^:([^ ]+) +/);
    if (match) {
        message.prefix = match[1];
        line = line.replace(/^:[^ ]+ +/, '');
        if (enableStrictParse) {
            match = message.prefix.match(/^([_a-zA-Z0-9~[\]\\\/`^{}|-]*)(!([^@]+)@(.*))?$/);
        } else {
            match = message.prefix.match(/^([\u1100-\u11FF\u3040-\u309fF\u30A0-\u30FF\u3130-\u318F\u31F0-\u31FF\uA960-\uA97F\uAC00-\uD7AF\uD7B0-\uD7FF_a-zA-Z0-9~[\]\\`^{}|-]*)(!([^@]+)@(.*))?$/);
        }
        if (match) {
            message.nick = match[1];
            message.user = match[3];
            message.host = match[4];
        }
        else {
            message.server = message.prefix;
        }
    }

    // Parse command
    match = line.match(/^([^ ]+) */);
    message.command = match[1];
    message.rawCommand = match[1];
    message.commandType = 'normal';
    line = line.replace(/^[^ ]+ +/, '');

    var codeData = replyFor[message.rawCommand];
    if (codeData) {
        if ('name' in codeData) message.command = codeData.name;
        message.commandType = codeData.type;
    }

    message.args = [];
    var middle, trailing;

    // Parse parameters
    if (line.search(/^:|\s+:/) !== -1) {
        match = line.match(/(.*?)(?:^:|\s+:)(.*)/);
        middle = match[1].trimRight();
        trailing = match[2];
    }
    else {
        middle = line;
    }

    if (middle.length)
        message.args = middle.split(/ +/);

    if (typeof trailing !== 'undefined' && trailing.length)
        message.args.push(trailing);

    return message;
};
