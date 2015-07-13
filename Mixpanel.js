var Buffer = require('buffer').Buffer;

var _send_request =  function(endpoint, data) {
	var options = _build_options(endpoint, data);
	if (this.wait) {
		this._waiting.push(options);
	}else{
		return Parse.Cloud.httpRequest(options);
		/*Parse.onlyOne(function(){
			console.log("Sending "+options.toString());
			
		});*/
	}
	
};

var _sendAll =  function(){
	console.log("Send ALl!");
	var promises = []
	for(var k in this._waiting){
		var options = this._waiting[k];
		console.log(options);
		promises.push(Parse.onlyOne(function(){
			return Parse.Cloud.httpRequest(options);;
		}));
	}
	return Parse.Promise.when(promises);
}


var _build_options = function(endpoint, data){
	var event_data = new Buffer(JSON.stringify(data));
    var request_data = {
        'data': event_data.toString('base64'),
        'ip': 0
    };
    //request_data.test = 1;
    var options = {
    	url: 'https://api.mixpanel.com'+endpoint,
    	method: "GET",
    	params: request_data
	};
   	return options;
}




var _set = function(arg, props){
	var data = {}
	var properties = arg;
	if (typeof props !== "undefined") {
		properties = {};
		properties[arg] = props;
	}
	if (properties["$ignore_time"]) {
        data["$ignore_time"] = properties["$ignore_time"];
        delete properties["$ignore_time"];
    }
    data["$set"] = properties;
	return this._send("/engage", data);
}

var _trackCharge = function(amount, transaction){
	if (!transaction) { transaction = {}; }
	if (typeof(amount) !== 'number') {
        amount = parseFloat(amount);
        if (isNaN(amount)) {
            console.error("Invalid value passed to mixpanel.people.track_charge - must be a number");
            return;
        }
    }
    transaction["$amount"] = amount;
    if (transaction.hasOwnProperty('$time')) {
        var time = transaction["$time"];
        if (Object.prototype.toString.call(time) === '[object Date]') {
            transaction["$time"] = time.toISOString();
        }
    }

    var data = {
        '$append': { '$transactions': transaction }
    };
    if (transaction["$ignore_time"]) {
        data["$ignore_time"] = transaction["$ignore_time"];
        delete transaction["$ignore_time"];
    }
    return this._send('/engage', data);
}

var _increment = function(prop, by){
	var add = {};
    if (typeof(prop) === 'object') {
        Object.keys(prop).forEach(function(key) {
            var val = prop[key];
            if (isNaN(parseFloat(val))) {
                return;
            } else {
                add[key] = val;
            }
        });
    } else {
        if (!by) { by = 1; }
        add[prop] = by;
    }
    var data = {
    	"$add": add
    }
    return this._send("/engage", data);
}

var _append = function(){

}

var People = function(mixpanelAPI){
	this.api = mixpanelAPI;
	this.set = _set;
	this.increment = _increment;
	this.append = _append;
	this.trackCharge = _trackCharge;
	this._send = function(endpoint, data){
		data["$token"] = this.api.token;
		if (this.api.distinct_id) {
			data['$distinct_id'] = this.api.distinct_id;
		}
		data["$ip"] = 0;
		return this.api._send_request(endpoint, data);
	}
}


var _send = function(endpoint, data){
	data.properties.token = this.token;
	if (this.distinct_id) {
		data.properties.distinct_id = this.distinct_id;
	}
	return this._send_request("/track", data);
}
var _track = function(event_name, properties){
	var data = {
		event: event_name
	}
	if (properties) {
		data.properties = properties;
	}else {
		data.properties = {};
	}
	return this._send("/track", data);
}

var _identify = function(distinct_id){
	this.distinct_id = distinct_id;
}

var _register = function(properties){

}

var MixpanelAPI = function(token, wait){
	this.token = token;
	this._waiting = [];
	this.wait = wait;
	this.distinct_id = undefined;
	this.track = _track;
	this.identify = _identify;
	this.register = _register;
	this.people = new People(this);
	this._send = _send;
	this._send_request = _send_request;
	this.sendAll = _sendAll;
}

module.exports = MixpanelAPI;