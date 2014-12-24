(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

var Client = require('../lib/client'),
	Poker = require('../lib/poker'),
	Jinhua = require('../lib/jinhua_poker');

var client = null;

$(document).ready(function(){
	var socket = io();
	
	//console.log(socket);
	socket.log_traffic = true;
	
	socket.on('hello', function(data){
		$('div#cmds').empty();
		addMsg(data.msg);
		
		setTimeout(function(){
			var u = localStorage.getItem('x_userid');
			var p = localStorage.getItem('x_passwd');
			if(u && p) {
				login(u, p);
			} else {
				addMsg('please login, syntax: login username password');
			}
		}, 1000);
	});

	client = new Client(socket);
	
	/*
	 * cmds {
	 *     exit: true,
	 *     unseat: true
	 *     followchip: true,
	 *     addchip: [50,100,150],
	 *     addchip: 'range,0,1000000',
	 *     giveup: true,
	 *     pk: ['zhang3', 'li4', 'wang5'],
	 *     checkcard: true,
	 *     showcard: true,
	 *     allin: true
	 *   }
	 */
	function onBtnClicked(e) {
		client.rpc($(this).attr('id'), $(this).attr('arg'), echoOnErr);
	}
	function onInputBtnClicked(e){
		var method = $(this).attr('id');
		client.rpc($(this).attr('id'), $('input#'+method).val(), echoOnErr);
		$('input#'+method).val('');
	}
	function onInputBoxEnter(e) {
		if(e.which == 13) onInputBtnClicked(e);
	}
	client.on('prompt', function(cmds){
		var btn;
		var div;
		for(var k in cmds) {
			var v = cmds[ k ];
			if(v === null) {
				$('div#'+k).remove();
				$('button#'+k).remove();
				
			} else if(v === true) {
				btn = $('<button>').text(k).attr('id', k).attr('arg', 0).addClass('cmd');
				$('#cmds').append(btn);
				btn.on('click', onBtnClicked);
				
			} else if(typeof v === 'string') {
				div = $('<div>').attr('id',k).addClass('cmd');
				$('#cmds').append(div);
				var words = v.split(',');
				var input = $('<input>').attr('id', k).addClass('cmd');
				switch(words[0]) {
				case 'text':
					input.attr('type', 'text').attr('size',60);
					break;
				case 'range':
					input.attr('type', 'range');
					if(words[1]) input.attr('min', parseInt(words[1]));
					if(words[2]) input.attr('max', parseInt(words[2]));
					break;
				case 'number':
					input.attr('type', 'number').attr('size',5);
					if(words[1]) input.attr('min', parseInt(words[1]));
					if(words[2]) input.attr('max', parseInt(words[2]));
					break;
				}
				div.append(input);
				btn = $('<button>').text(k).attr('id', k).addClass('cmd');
				div.append(btn);
				btn.on('click', onInputBtnClicked);
				input.keydown(onInputBoxEnter);
				
			} else if( Object.prototype.toString.call( v ) === '[object Array]' ) {
				div = $('<div>').attr('id',k).addClass('cmd');
				$('#cmds').append(div);
				for(var i=0; i<v.length; i++) {
					var arg = v[i];
					btn = $('<button>').text(k+' '+arg).attr('id', k).attr('arg', arg).addClass('cmd');
					div.append(btn);
					btn.on('click', onBtnClicked);
				}
				
			} else {
				
			}
		}
	});
	
	client.on('shout', function(ret){
		addMsg(ret.who.name + ' shout: ' + ret.msg);
	});
	
	client.on('look', function(ret){
		showRoom(ret);
	});
	
	client.on('enter', function(ret){
		addMsg(ret.who.name + ' came into room ' + ret.where);
		showRoom(client.room);
	});
	
	client.on('exit', function(ret){
		addMsg(ret.who.name + ' left room ' + ret.where);
		if(ret.uid === client.uid) {
			showRoom(null);
		} else {
			showRoom(client.room);
		}
	});

	client.on('takeseat', function(ret){
		addMsg(ret.who.name + ' take seat ' + ret.where);
		showRoom(client.room);
	});

	client.on('unseat', function(ret){
		addMsg(ret.who.name + ' stand up from ' + ret.where);
		showRoom(client.room);
	});

	client.on('say', function(ret){
		addMsg(ret.who.name + ' say: ' + ret.msg);
	});
	
	client.on('disconnect', function(ret){
		addMsg(ret);
	});

	$('#m').focus();
	$('form').submit(function(e) {
		execCmd();
		return false;
	});
});

function login(u, p) {
	client.login(u, p, function(err,ret){
		//console.log(err, ret);
		if(err) {
			echo(ret);
		} else {
			localStorage.setItem('x_userid', u);
			localStorage.setItem('x_passwd', p);
			addMsg('hi ' + ret.profile.name + ', login success, sid:' + ret.token.sid);
			
			list_games();
		}
		
	}, function(err){
		localStorage.removeItem('x_userid');
		localStorage.removeItem('x_passwd');
		echo(err);
	});
}

function list_games(){
	client.games(function(err, ret){
		if(err) echo(ret);
		else {
			var list = $('#list');
			list.empty();
			for(var i=0; i<ret.length; i++) {
				var game = ret[i];
				var str = game.id + ': ' + game.name + ' (' + game.desc + '), ' + game.rooms + ' rooms';
				list.append($('<li>').text(str));
			}
		}
	});
}

function list_rooms( gameid ) {
	client.rooms(gameid, function(err, ret){
		if(err) echo(ret);
		else {
			var list = $('#list');
			list.empty();
			for(var i=0; i<ret.length; i++) {
				var room = ret[i];
				var str = 'room id: ' + room.id + 
					', name: "' + room.name +
					'", seats: ' + room.seats_taken + '/' + room.seats_count + 
					', gamers:' + room.gamers_count;
				list.append($('<li>').text(str));
			}
		}
	});
}

function addMsg(str) {
	$('#messages').append($('<li>').text(str).addClass('msg'));
	var msgs = $('li.msg');
	var n = msgs.length - 20;
	if(n > 0) {
		for(var i=0; i<n; i++) {
			msgs[i].remove();
		}
	}
}

function echo(ret) {
	addMsg( JSON.stringify(ret) );
}

function echo2(err, ret) {
	addMsg( JSON.stringify(ret) );
}

function echoOnErr(err, ret) {
	if(err) addMsg(ret);
}

function showRoom(room) {
	$('#seats').empty();
	
	if(! room) {
		$('#roomname').text('not in room');
		return;
	}
	
	$('#roomname').text(room.id + ' (' + room.name + ')');
	
	var gamers = room.gamers;
	var seats = room.seats;
	$('#seats').append($('<li>').text('gamers:' + Object.keys(gamers).join(', ')));
	for(var i=0, len=seats.length; i<len; i++) {
		var uid = seats[i];
		var g = uid ? gamers[ uid ] : null;
		var str = "#" + i + ': ';
		if(g) {
			str += g.uid + ' (' + g.name + ') [' + g.coins + ', ' + g.score + ', ' + g.exp + ', ' + g.level + ']';
		} else {
			str += '(empty)';
		}
		$('#seats').append($('<li>').text(str));
	}
}

function execCmd() {
	var cmd = $('#m').val() + '';
	if(cmd.length === 0) return false;
	$('#m').val('');
	$('#m').focus();
	
	var words = cmd.split(' ');
	switch(words[0]) {
	case 'clear':
		$('#list').empty();
		$('#seats').empty();
		$('#messages').empty();
		break;
	case 'signup':
		client.signup({
			uid: words[1],
			passwd: words[2]
		}, function(err,ret){
			if(err) {
				echo(ret);
			} else {
				echo(ret);
				localStorage.setItem('x_userid', uid);
				localStorage.setItem('x_passwd', passwd);
			}
		});
		break;
	case 'login':
		login(words[1], words[2]);
		break;
	case 'logout':
		client.logout(echo2);
		break;
	case 'games':
		list_games();
		break;
	case 'rooms':
		list_rooms( words[1] );
		break;
	case 'entergame':
		client.entergame(words[1], echoOnErr);
		break;
	case 'enter':
		client.enter(words[1], echoOnErr);
		break;
	case 'look':
		client.look(function(err, ret){
			if(err) echo(ret);
			else {
				showRoom(ret);
			}
		});
		break;
	case 'exit':
		client.exit(function(err, ret){
			if(err) echo(ret);
			else {
				echo(ret);
				showRoom(null);
			}
		});
		break;
	case 'takeseat':
		client.rpc('takeseat', words[1], echoOnErr);
		break;
	case 'unseat':
		client.rpc('unseat', 0, echoOnErr);
		break;
	case 'shout':
		words.shift();
		client.shout(words.join(' '));
		break;
	case 'say':
		words.shift();
		client.say( words.join(' '), echoOnErr );
		break;
	default:
		//client.say( cmd, echoOnErr );
	}
}

},{"../lib/client":2,"../lib/jinhua_poker":3,"../lib/poker":4}],2:[function(require,module,exports){
exports = module.exports = Client;

function Client( socket ) {	
	this.uid = null;
	this.pin = null;
	this.profile = {};
	this.events = {};
	this.room = null;
	
	this.setUplink( socket );
}

Client.prototype.setUplink = function(socket) {
	this.uplink = socket;
	
	if(! socket.gamers) {
		socket.gamers = {};
		socket.gamers_count = 0;
		socket.rpc_seq = 0;
		socket.rpc_callbacks = {};
		
		socket.on('push', function( msg ){ // { uid:x, e:xx, args:xxx }
			if(socket.log_traffic) console.log('push', msg);
			
			if(! msg) return;
			if(typeof msg !== 'object') return;
			
			var event = msg.e;
			if(! event) return;
			
			var args = msg.args;
			var target;
			if(msg.uid) {
				target = socket.gamers[ msg.uid ];
				if(target) target.onPush( event, args );
				
			} else {
				var gamers = socket.gamers;
				for(var uid in gamers) {
					target = gamers[ uid ];
					if(target) target.onPush( event, args );				
				}
			}
		});
		
		socket.on('rpc_ret', function(response){
			if(socket.log_traffic) console.log('rpc_ret', response);
			
			if(response && (typeof response === 'object') && response.seq) {
				var seq = response.seq;
				var callback = socket.rpc_callbacks[ seq ];
				if(callback && (typeof callback === 'object')) {
					var func = callback.func;
					if(typeof func === 'function') func(response.err, response.ret);
					
					delete socket.rpc_callbacks[ seq ];
				}
			}
		});
	}
	
	return this;
};

Client.prototype.on = function(event, func) {
	this.events[ event ] = func;
	return this;
};

Client.prototype.onPush = function(event, args) {
	switch(event) {
	case 'look':
		this.room = args;
		break;
	case 'enter':
		this.room.gamers[ args.who.uid ] = args.who;
		break;
	case 'exit':
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'takeseat':
		this.room.seats[ args.where ] = args.uid;
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'unseat':
		this.room.seats[ args.where ] = null;
		args.who = this.room.gamers[ args.uid ];
		break;
	case 'say':
		args.who = this.room.gamers[ args.uid ];
		break;
	}
	
	var func;
	if(typeof (func = this.events[event]) === 'function') {
		func(args);
	} else if(typeof (func = this.events['else']) === 'function') {
		func(args);
	}
	
	switch(event) {
	case 'disconnect':
		this.uid = null;
		this.pin = null;
		this.profile = {};
		break;
	}
};

Client.prototype.removeUplink = function() {
	var socket = client.uplink;
	if(socket) {
		client.socket = null;
		delete socket.gamers[ this.uid ];
		socket.gamers_count --;
	}
	
	return this;
};

// args: { uid, name, passwd, email, phone, uuid }
Client.prototype.signup = function login( args, func ) {
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}
	
	var socket = this.uplink;
	var callback = {
		seq: ++ socket.rpc_seq,
		func: func,
		t: (new Date()).getTime()
	};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	args.seq = callback.seq;
	socket.emit('signup', args);
};

Client.prototype.login = function login( uid, passwd, func ) {
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}
	
	var socket = this.uplink;
	var client = this;
	
	var callback = {
		seq: ++ socket.rpc_seq,
		func: function(err, ret){
			if(! err) {
				client.uid = ret.token.uid;
				client.pin = ret.token.pin;
				client.profile = ret.profile;
				
				socket.gamers[ client.uid ] = client;
			}
			func(err, ret);
		},
		t: (new Date()).getTime()
	};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	socket.emit('login', {
		seq: callback.seq,
		uid: uid,
		passwd: passwd
	});
};

Client.prototype.logout = function logout( func ) {
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}

	if(! this.uid) {
		func(400, 'need login first');
		return;
	}
	
	var socket = this.uplink;
	var client = this;
	var callback = {
		seq: ++ socket.rpc_seq,
		func: function(err, ret){
			if(! err) {
				client.uid = null;
				client.pin = null;
				client.profile = {};
			}
			func(err, ret);
		},
		t: (new Date()).getTime()
	};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	socket.emit('logout', {
		seq: callback.seq,
		uid: client.uid,
		pin: client.pin
	});
};

Client.prototype.rpc = function(method, args, func) {
	if(typeof func !== 'function') {
		throw 'need a callback func(err,ret)';
	}

	if(! this.uid) {
		func(400, 'need login first');
		return;
	}
	
	var socket = this.uplink;
	if(socket.log_traffic) console.log(method, args);
	
	var client = this;
	var callback = {
			seq: ++ socket.rpc_seq,
			func: func,
			t: (new Date()).getTime()
		};
	socket.rpc_callbacks[ callback.seq ] = callback;
	
	socket.emit('rpc', {
		seq: callback.seq,
		uid: client.uid,
		pin: client.pin,
		f: method,
		args: args
	});
	
	return this;
};

Client.prototype.shout = function(msg, func) {
	if(! func) func = function(err,ret){};
	this.rpc('shout', msg, func);
};

Client.prototype.say = function(msg, func) {
	if(! func) func = function(err,ret){};
	this.rpc('say', msg, func);
};

Client.prototype.entergame = function(roomid, func) {
	if(! func) func = function(err,ret){};
	this.rpc('entergame', roomid, func);
};

Client.prototype.enter = function(roomid, func) {
	if(! func) func = function(err,ret){};
	this.rpc('enter', roomid, func);
};

Client.prototype.exit = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('exit', 0, func);
};

Client.prototype.look = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('look', 0, func);
};

Client.prototype.games = function(func) {
	if(! func) func = function(err,ret){};
	this.rpc('games', 0, func);
};

Client.prototype.rooms = function(gameid, func) {
	if(! func) func = function(err,ret){};
	this.rpc('rooms', gameid, func);
};

},{}],3:[function(require,module,exports){
var Poker = require('./poker');

var POKER_CARDS = Poker.CARDS;

var DANZHANG	= 1, // 单张
	DUIZI		= 2, // 对子
	SHUNZI		= 3, // 顺子
	TONGHUA		= 4, // 同花
	TONGHUASHUN	= 5, // 同花顺
	BAOZI		= 6; // 豹子

var JINHUA_PATTERNS = {
	0: '错误',
	1: '单张',
	2: '对子',
	3: '顺子',
	4: '同花',
	5: '同花顺',
	6: '豹子'
};

var Jinhua = {
	DANZHANG: 	1,
	DUIZI: 		2,
	SHUNZI: 	3,
	TONGHUA: 	4,
	TONGHUASHUN: 5,
	BAOZI: 		6,
	
	PATTERNS: JINHUA_PATTERNS,
};

exports = module.exports = Jinhua;

Jinhua.sort = function(cards) {
	if(cards.length != 3) return cards;
	Poker.sortByNumber(cards);
	
	var n2 = cards[1] & 0xf, n3 = cards[2] & 0xf;
	if(n2 == n3) { // avoid pair at end
		var tmp = cards[0];
		cards[0] = cards[2];
		cards[2] = tmp;
	}
	return cards;
};

Jinhua.rank = function(cards) {
	if(cards.length != 3) return 0;
	Jinhua.sort(cards);
	
	var c1 = cards[0] >> 4, c2 = cards[1] >> 4, c3 = cards[2] >> 4;
	var n1 = cards[0] & 0xf, n2 = cards[1] & 0xf, n3 = cards[2] & 0xf;
	
	var rank = (n1 << 8) | (n2 << 4) | n3;
	
	if((n1 == n2) && (n2 == n3)) {
		return (BAOZI << 12) | rank;
		
	} else if((c1 == c2) && (c2 == c3)) {
		if((n1 == n2+1) && (n2 == n3+1)) {
			return (TONGHUASHUN << 12) | rank;
			
		} else {
			return (TONGHUA << 12) | rank;
		}
		
	} else if((n1 == n2+1) && (n2 == n3+1)) {
		return (SHUNZI << 12) | rank;
		
	} else if((n1 == n2) || (n2 == n3)) {
		return (DUIZI << 12) | rank;
		
	} else {
		return (DANZHANG << 12) | rank;
	}
};

Jinhua.pattern = function(cards) {
	return Jinhua.rank(cards) >> 12;
};

Jinhua.compare = function(a, b) {
	return Jinhua.rank(a) - Jinhua.rank(b);
};

Jinhua.view = function(cards) {
	var rank = Jinhua.rank(cards);
	var pattern = rank >> 12;
	var str = Poker.visualize(cards).join(',') + ' -> ' + JINHUA_PATTERNS[ pattern ] + ', rank:' + rank;
	console.log( str );
};


},{"./poker":4}],4:[function(require,module,exports){

var POKER_COLORS = {
	4: '♠', 		// spade
	3: '♥', 	// heart
	2: '♣', 	// club
	1: '♦' 		// diamond
};

var POKER_NUMBERS = {
	14 : 'A',
	13 : 'K',
	12 : 'Q',
	11 : 'J',
	10 : '10',
	9 : '9',
	8 : '8',
	7 : '7',
	6 : '6',
	5 : '5',
	4 : '4',
	3 : '3',
	2 : '2',
	0 : '?'
};

var POKER_NUMBER_RANK = {
	'A': 14,
	'K': 13,
	'Q': 12,
	'J': 11,
	'10': 10,
	'9': 9,
	'8': 8,
	'7': 7,
	'6': 6,
	'5': 5,
	'4': 4,
	'3': 3,
	'2': 2,
	'?': 0,
	'': 0
};

var POKER_COLOR_RANK = {
	'S': 4,
	'H': 3,
	'C': 2,
	'D': 1,
	'': 0
};

var RED_JOKER = (6 << 4) | 15;
var BLACK_JOKER = (5 << 4) | 15;

var POKER_CARDS = {};
for(var color=1; color<=4; color++) {
	for(var number=2; number<=14; number++) {
		var card = (color << 4) | number;
		POKER_CARDS[ card ] = POKER_COLORS[ color ] + '' + POKER_NUMBERS[ number ];
	}
}
POKER_CARDS[ RED_JOKER ] = '@';
POKER_CARDS[ BLACK_JOKER ] = '*';
POKER_CARDS[ 0 ] = '?';

exports = module.exports = Poker;

function Poker(str){
	if(typeof str === 'string') {
		var c = POKER_COLOR_RANK[ str.charAt(0) ];
		var n = POKER_NUMBER_RANK[ str.substring(1) ];
		if(c && n) {
			return (c << 4) | n;
		} else {
			return 0;
		}
	} else if(typeof str === 'object') {
		var cards = [];
		for(var i=0; i<str.length; i++) {
			cards.push( Poker(str[i]) );
		}
		return cards;
	} else {
		return 0;
	}
}

Poker.RED_JOKER = RED_JOKER;
Poker.BLACK_JOKER = BLACK_JOKER;
	
Poker.SPADE = 4;
Poker.HEART = 3;
Poker.CLUB	= 2;
Poker.DIAMOND = 1;
	
Poker.COLORS = POKER_COLORS;
Poker.NUMBERS = POKER_NUMBERS;
Poker.CARDS = POKER_CARDS;
Poker.NUMBER_RANK = POKER_NUMBER_RANK;

Poker.visualize = function( cards ) {
	if(typeof cards === 'number') return POKER_CARDS[ cards ];
	
	var v_cards = [];
	for(var i=0, len=cards.length; i<len; i++) {
		v_cards.push( POKER_CARDS[ cards[i] ] );
	}
	return v_cards;
};

Poker.newSet = function( options ) {
	var no_joker = true, no_color = [], no_number = [], no_card = [];
	if(options) {
		if(typeof options.no_joker === 'boolean') no_joker = options.no_joker;
		if(typeof options.no_color === 'object') no_color = options.no_color;
		if(typeof options.no_number === 'object') no_number = options.no_number;
		if(typeof options.no_card === 'object') no_card = options.no_card;
	}
	
	var cards = [];
	for(var color=1; color<=4; color++) {
		if(no_color.indexOf(color) >= 0) continue;
		
		for(var number=2; number<=14; number++) {
			if(no_number.indexOf(number) >= 0) continue;
			
			var card = (color << 4) | number;
			if(no_card.indexOf(card) >= 0) continue;
			
			cards.push( card );
		}
	}
	
	if(! no_joker) {
		cards.push( RED_JOKER );
		cards.push( BLACK_JOKER );
	}
	
	return cards;
};

Poker.clone = function(cards) {
	var cloned = [];
	for(var i=0; i<cards.length; i++) {
		cloned[i] = cards[i];
	}
	return cloned;
};

Poker.draw = function(cards, n) {
	var len = cards.length;
	if(len < n) return [];
	
	var subset = [];
	while(n -- > 0) {
		var i = Math.floor( Math.random() * len );
		subset.push( cards[i] );
		cards.splice(i,1); // NOTICE: splice will return an array
		len --;
	}
	return subset;
};

Poker.randomize = function( cards ) {
	var randomized = this.draw(cards, cards.length);
	while(randomized.length > 0) {
		cards.push( randomized.shift() );
	}
	return cards;
};

Poker.compareColorNumber = function(a, b) {
	if(a == b) return 0;
	else {
		var aColor = a >> 4, aNumber = a & 0x0f;
		var bColor = b >> 4, bNumber = b & 0x0f;
		if(aColor == bColor) return aNumber - bNumber;
		else return aColor - bColor;
	}
};

Poker.compareNumberColor = function(a, b) {
	if(a == b) return 0;
	else {
		var aColor = a >> 4, aNumber = a & 0x0f;
		var bColor = b >> 4, bNumber = b & 0x0f;
		if(aNumber == bNumber) return aColor - bColor;
		else return aNumber - bNumber;
	}
};

Poker.compare = function(a, b) {
	return (a & 0xff) - (b & 0xff);
};

Poker.sort =
Poker.sortByColor = function( cards ) {
	return cards.sort( Poker.compareColorNumber ).reverse();
};

Poker.sortByNumber = function( cards ) {
	return cards.sort( Poker.compareNumberColor ).reverse();
};

Poker.merge = function( a, b ) {
	return a.concat(b);
};

Poker.print = function( cards ) {
	var str = cards.join(',');
	console.log( str );
};

Poker.view = function( cards ) {
	var str = Poker.visualize(cards).join(',');
	console.log( str );
};

},{}]},{},[1]);
