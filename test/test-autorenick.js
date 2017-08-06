var test = require('tape');

var testHelpers = require('./helpers');
var withClient = testHelpers.withClient;

test('bot does not try to renick when it gets the chosen nickname', function(t) {
    withClient(function(obj) {
        var client = obj.client;
        var mock = obj.mock;

        mock.server.on('connection', function() { mock.greet(); });

        client.on('registered', function() {
            t.equal(typeof client.conn.renickInterval, 'undefined');
            client.disconnect();
        });

        client.conn.once('close', function() {
            client.end();
            t.end();
        });
    }, { autoRenick: true });
});

test('bot renicks automatically when config enabled', function(t) {
    withClient(function(obj) {
        var client = obj.client;
        var mock = obj.mock;
        t.timeoutAfter(1000);
        var expected = [
            'NICK testbot',
            'NICK testbot1',
            'NICK testbot2',
            'NICK testbot'
        ];
        var actual = [];

        var mustNotRenickEarly = function(line) {
            if (line === 'NICK testbot') {
                t.fail('bot must not renick early');
            }
        };

        var renicked = false;
        var mustRenick = function(line) {
            if (line === 'NICK testbot') {
                renicked = true;
            }
        };

        var rebuked = false;
        mock.on('line', function(line) {
            var args = line.split(' ');
            if (args[0] !== 'NICK') return;

            // ensure bot sends right nick commands
            actual.push(line);
            if (args[1] === 'testbot') {
                if (!rebuked) {
                    rebuked = true;
                    mock.send(':localhost 433 * testbot :Nickname is already in use.\r\n');

                    // expect the bot not to nick back for 250ms
                    mock.addListener('line', mustNotRenickEarly);
                    setTimeout(function(){
                        mock.removeListener('line', mustNotRenickEarly);
                    }, 250);
                    mock.on('line', mustRenick);
                } else {
                    mock.send(':testbot2!~testbot@mockhost.com NICK :testbot\r\n');

                }
            } else if (args[1] === 'testbot1') {
                mock.send(':localhost 433 * testbot1 :Nickname is already in use.\r\n');
            } else if (args[1] === 'testbot2') {
                mock.greet('testbot2');
            }
        });

        client.on('registered', function() {
            t.notEqual(typeof client.conn.renickInterval, 'undefined');
        });

        client.on('nick', function(oldnick, newnick) {
            if (oldnick === 'testbot2' && newnick === 'testbot') {
                t.pass('bot renicked');
                client.disconnect();
            }
        });

        mock.on('end', function() {
            t.deepEqual(actual, expected, 'bot must send right nick commands');
            t.ok(renicked, 'bot must try to renick');
            mock.close(function() {
                t.end();
            });
        });
    }, { autoRenick: true, renickDelay: 300 });
});

test('bot renicks given amount', function(t) {
    withClient(function(obj) {
        var client = obj.client;
        var mock = obj.mock;
        t.timeoutAfter(1000);
        var expected = [
            'NICK testbot',
            'NICK testbot1',
            'NICK testbot',
            'NICK testbot',
            'NICK testbot'
        ];
        var actual = [];

        var rebuked = false;
        mock.on('line', function(line) {
            var args = line.split(' ');
            if (args[0] !== 'NICK') return;

            // ensure bot sends right nick commands
            actual.push(line);
            if (args[1] === 'testbot') {
                if (!rebuked) {
                    rebuked = true;
                    mock.send(':localhost 433 * testbot :Nickname is already in use.\r\n');
                }
            }
            if (expected.length === actual.length) {
                setTimeout(function() {
                    client.disconnect();
                }, 200);
            }
        });

        client.on('registered', function() {
            t.notEqual(typeof client.conn.renickInterval, 'undefined');
        });

        mock.on('end', function() {
            t.deepEqual(actual, expected, 'bot must send right nick commands');
            mock.close(function() {
                t.end();
            });
        });
    }, { autoRenick: true, renickDelay: 50, renickCount: 3 });
});

test('bot only renicks if config enabled', function(t) {
    withClient(function(obj) {
        var client = obj.client;
        var mock = obj.mock;
        t.timeoutAfter(1000);
        var expected = [
            'NICK testbot',
            'NICK testbot1'
        ];
        var actual = [];

        var rebuked = false;
        mock.on('line', function(line) {
            var args = line.split(' ');
            if (args[0] !== 'NICK') return;

            // ensure bot sends right nick commands
            actual.push(line);
            if (args[1] === 'testbot') {
                if (!rebuked) {
                    rebuked = true;
                    mock.send(':localhost 433 * testbot :Nickname is already in use.\r\n');
                }
            }
            if (expected.length === actual.length) {
                setTimeout(function() {
                    client.disconnect();
                }, 200);
            }
        });

        client.on('registered', function() {
            t.equal(typeof client.conn.renickInterval, 'undefined');
        });

        mock.on('end', function() {
            t.deepEqual(actual, expected, 'bot must send right nick commands');
            mock.close(function() {
                t.end();
            });
        });
    }, { autoRenick: false, renickDelay: 50, renickCount: 3 });
});