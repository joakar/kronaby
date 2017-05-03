var msgpack = require('msgpack-lite');
var options = {codec: msgpack.createCodec({usemap:true})};

var events = require('events');
var util = require('util');
var noble = require('noble');

var ANIMA_SERVICE = "6e406d41-b5a3-f393-e0a9-e6414d494e41";
var ANIMA_CHAR = "6e401980-b5a3-f393-e0a9-e6414d494e41";
var NOTIFICATION_CHAR = "6e401981-b5a3-f393-e0a9-e6414d494e41";
var GENERIC_ACCESS_SERVICE = "00001800-0000-1000-8000-00805f9b34fb";
var GENERIC_ATTRIBUTE_SERVICE = "00001801-0000-1000-8000-00805f9b34fb";
var DEVICE_INFO_SERVICE = "0000180a-0000-1000-8000-00805f9b34fb";
var DEVICE_INFO_MANUFACTER_NAME = "00002a29-0000-1000-8000-00805f9b34fb";
var DEVICE_INFO_MODEL_NUMBER = "00002a24-0000-1000-8000-00805f9b34fb";
var DEVICE_INFO_SERIAL_NUMBER = "00002a25-0000-1000-8000-00805f9b34fb";
var DEVICE_INFO_HWR_REVISION = "00002a27-0000-1000-8000-00805f9b34fb";
var DEVICE_INFO_FWR_REVISION = "00002a26-0000-1000-8000-00805f9b34fb";
var DEVICE_FIRMWARE_UPDATE = "00001530-1212-efde-1523-785feabcd123";

function AnimaWatch(peripheral) {
	this._peripheral = peripheral;
	this._connected = false;
	this._subscribe = {};
	this._functions = {
		'0': 'map_cmd'
	}
	this.tryies = 0;
}
util.inherits(AnimaWatch, events.EventEmitter);

AnimaWatch.discover = function(callback) {
	var _this = this;
	noble.once('stateChange', function(state) {
		if (state == 'poweredOn') {
			noble.once('discover', function(peripheral) {
				if(peripheral.advertisement.serviceUuids.indexOf('f431') !== -1 && peripheral.advertisement.serviceUuids.indexOf('1812') !== -1) {
					noble.stopScanning();
					var animaWatch = new AnimaWatch(peripheral);
					callback(animaWatch);
				}
			});
			noble.startScanning(['f431','1812'],false);
		}else{
			noble.stopScanning();
		}
	});
};

AnimaWatch.prototype.connect = function(callback) {
	var _this = this;
	this._peripheral.connect(function(e){

		_this._peripheral.discoverSomeServicesAndCharacteristics([ANIMA_SERVICE.replace(/-/g,'')], [NOTIFICATION_CHAR.replace(/-/g,''),ANIMA_CHAR.replace(/-/g,'')],function(error,service,characteristics){
			_this._ANIMA_CHAR = characteristics[0];

			_this._NOTIFICATION_CHAR = characteristics[1];
			_this._NOTIFICATION_CHAR.subscribe(function(error) {
					//console.log('Subscribed to write!');
				});
				_this._NOTIFICATION_CHAR.on('data', function(dataRaw, isNotification) {
					var data = _this.read(dataRaw);
					var dataKey = Object.keys(data)[0];
					var dataInner = data[dataKey];

					if(typeof _this._subscribe[dataKey] === 'function'){
						_this._subscribe[dataKey](dataInner);
					}
					//console.log('notification:',dataRaw.toString('hex'), data);
				});

				_this._ANIMA_CHAR.on('data', function(data, isNotification) {
					var data = _this.read(data);
					var dataKey = Object.keys(data)[0];
					var dataInner = data[dataKey];
					switch(dataKey){
						case 'map_cmd':
							if(dataInner){
								for(var x in dataInner){
									_this._functions[x] = dataInner[x];
								}
								//console.log(_this._functions);
							}
						break;
						default:
							// console.log('data-recieved:',data, isNotification);
						;
					}
					
				});
			_this._ANIMA_CHAR.subscribe(function(error) {
				_this._connected = true;
				_this.getCommandMap(function(){
					callback(e);
				});
			});
		});
	});
};

AnimaWatch.prototype.disconnect = function(callback) {
	this._peripheral.disconnect(callback);
};

AnimaWatch.prototype.subscribe = function(key, func){
	//console.log('subscribe at ', key);
	this._subscribe[key] = func;
}

AnimaWatch.prototype.readHandle = function(handle, callback) {
	this._peripheral.readHandle(handle, function(error, data) {
		callback(data);
	});
};

AnimaWatch.prototype.readStringHandle = function(handle, callback) {
	this.readHandle(handle, function(data) {
		callback(data.toString());
	});
};

AnimaWatch.prototype.writeHandle = function(handle, data, callback) {
	this._peripheral.writeHandle(handle, data, true, callback);
};

AnimaWatch.prototype.getDeviceName = function(callback) {
	this.readStringHandle(DEVICE_INFO_MANUFACTER_NAME.replace(/-/g,''), callback);
};

AnimaWatch.prototype.getModelNumber = function(callback) {
	this.readStringHandle(DEVICE_INFO_MODEL_NUMBER.replace(/-/g,''), callback);
};

AnimaWatch.prototype.getFirmwareRevision = function(callback) {
	this.readStringHandle(DEVICE_INFO_FWR_REVISION.replace(/-/g,''), callback);
};

AnimaWatch.prototype.getHardwareRevision = function(callback) {
	this.readStringHandle(DEVICE_INFO_HWR_REVISION.replace(/-/g,''), callback);
};

AnimaWatch.prototype.getManufacturerName = function(callback) {
	this.readStringHandle(DEVICE_INFO_MANUFACTER_NAME.replace(/-/g,''), callback);
};

AnimaWatch.prototype.getFunction = function(func){
	for(var x in this._functions){
		if(this._functions[x] == func){
			return parseInt(x);
		}
	}
};

AnimaWatch.prototype.encode = function(func, data){
	var map = new Map();

	var sendData;
	if(data != undefined){
		map.set(this.getFunction(func), data);
	}else{
		map.set(this.getFunction(func), null);
	}
		sendData = Buffer.from(msgpack.encode(map,options), 'hex');
	//console.log(sendData, map);

	return sendData;
};

AnimaWatch.prototype.write = function(func, data, callback){
	var _this = this;
	if(_this.tryies <= 3){

		if(Object.keys(_this._functions).length === 1 && _this._functions.constructor === Object){
			_this.getCommandMap(function(){
				_this.write(func,data,callback);
			});
		}else{
			_this._ANIMA_CHAR.write(_this.encode(func, data), false , callback);
		}
		_this.tryies++;
	}
};

AnimaWatch.prototype.read = function(data){
	var _this = this;
	var dataArr = msgpack.decode(data);
	var newArr = {};
	for(var x in dataArr){
			if(_this._functions[x]){
				newArr[_this._functions[x]] = dataArr[x];
			}
	}
	return newArr;
};

AnimaWatch.prototype.getCommandMap = function(callback, value){
	if(value == undefined) value = 0;
	var _this = this;
	// console.log(Buffer.from(msgpack.encode([0,value],options), 'hex'));
	_this._ANIMA_CHAR.write( Buffer.from(msgpack.encode([0,value],options), 'hex'), true, function(){
		if (_this._ANIMA_CHAR.properties.indexOf('read') !== -1) {
			_this._ANIMA_CHAR.read(function(error, data) {
				//console.log("read",value);
				if(value < 2){
					_this.getCommandMap(callback, ++value);
				}else{
					if(callback) callback();
				}
				
	     });
		}
	});

};

AnimaWatch.prototype.writeAlarms = function(alarms, callback){
	var encodedAlarms = new Array;
	for (var alarm in alarms) {
			var valueArr = new Array;
			valueArr[0] = parseInt(alarm[0]);
			valueArr[1] = parseInt(alarm[1]);
			valueArr[2] = parseInt(alarm[2]);
			encodedAlarms.push(valueArr);
	}
	this.write('alarm', encodedAlarms, callback);
};

AnimaWatch.prototype.writeAlert = function(alert, callback){
	this.write('alert', parseInt(alert), callback);
};

AnimaWatch.prototype.writeAlertConfig = function(alertConfigBitmasks, callback){
	 if (alertConfigBitmasks == null || alertConfigBitmasks.length != 3) {
			return "alertConfigBitmasks must have length == 3";
	}
	var valueArr = new Array;
	valueArr[0] = parseInt(alertConfigBitmasks[0]);
	valueArr[1] = parseInt(alertConfigBitmasks[1]);
	valueArr[2] = parseInt(alertConfigBitmasks[2]);

	this.write('alert_assign', valueArr, callback);
};

AnimaWatch.prototype.writeBaseConfig = function(timeResolutionMinutes, enableStepcounter, callback){
	var values = new Array;
	if(timeResolutionMinutes) values.push(parseInt(timeResolutionMinutes));
	if(enableStepcounter) values.push(parseInt(enableStepcounter));
	this.write('config_base', [timeResolutionMinutes, enableStepcounter], callback);
};

AnimaWatch.prototype.writeComplicationModes = function(mainMode, alternateMode, otherMode, primaryFaceMainMode, primaryFaceAlternateMode, primaryFaceOtherMode, callback){
	var values = new Array;
	if(mainMode) values.push(parseInt(mainMode));
	if(alternateMode) values.push(parseInt(alternateMode));
	if(otherMode) values.push(parseInt(otherMode));
	if(primaryFaceMainMode) values.push(parseInt(primaryFaceMainMode));
	if(primaryFaceAlternateMode) values.push(parseInt(primaryFaceAlternateMode));
	if(primaryFaceOtherMode) values.push(parseInt(primaryFaceOtherMode));
	
	this.write('complications', values, callback);
};

AnimaWatch.prototype.writeConfigSettings = function(settings, callback){
	// not done yet 
	this.write('map_settings', settings, callback);
};

AnimaWatch.prototype.writeConfigVibrator = function(patterns, callback){
	var _this = this;
	var futures = new [];
	var length = patterns.length;
	var i = 0;
	var vibratorIndex = 8;
	while (i < length) {
			var pattern = patterns[i];
			var values = new Array();
			var vibratorIndex2 = vibratorIndex + 1;
			values.push(parseInt(vibratorIndex));
			for (var newInteger in pattern) {
					values.add(parseInt(pattern[newInteger]));
			}
			_this.write('vibrator_config', values, callback);
			i++;
			vibratorIndex = vibratorIndex2;
	}
};

AnimaWatch.prototype.writeCrash = function(callback){
	this.write('crash',255, callback);
};

AnimaWatch.prototype.writeDateTime = function(year, month, day, hour, min, sec, weekday, callback){
	this.write('datetime', [parseInt(year), parseInt(month), parseInt(day), parseInt(hour), parseInt(min), parseInt(sec), parseInt(weekday)], callback);
};

AnimaWatch.prototype.writeDebugAppError = function(errorCode, callback){
	this.write('debug_apperror', parseInt(errorCode), callback);
};

AnimaWatch.prototype.writeDebugConfig = function(timeCompress, enableUart, enableTemperature, enableLedAndVibrationOnDisconnect, deprecate, onErrorRebootTimeout, millisPerMinuteTick, rssiNotification, callback){
	var i;
	var i2 = 1;
	var config = new Array();
	config.push(parseInt(timeCompress ? 1 : 0));
	if (enableUart) {
			i = 1;
	} else {
			i = 0;
	}
	config.push(parseInt(i));
	if (enableTemperature) {
			i = 1;
	} else {
			i = 0;
	}
	config.push(parseInt(i));
	if (enableLedAndVibrationOnDisconnect) {
			i = 1;
	} else {
			i = 0;
	}
	config.push(parseInt(i));
	config.push(parseInt(0));
	config.push(parseInt(onErrorRebootTimeout));
	config.push(parseInt(millisPerMinuteTick));
	if (!rssiNotification) {
			i2 = 0;
	}
	config.push(parseInt(i2));
	this.writeDebugConfig_send(config, callback);
};

AnimaWatch.prototype.writeDebugConfig_send = function(config, callback){
	if (config == undefined) {
			callback(null);
	}else{
		 var configList = new Array();
		 for (var i in config) {
				configList.push(config[i]);
		}
	}
	this.write('config_debug', configList, callback);

};

AnimaWatch.prototype.writeDebugHardFault = function(callback){
	this.write('debug_hardfault',0 , callback);
};

AnimaWatch.prototype.writeDebugReset = function(resetType, callback){
	this.write('debug_reset', parseInt(resetType), callback);
};

AnimaWatch.prototype.writeEinkImg = function(values, callback){
	var values = new Array;
	for (var valueOf in data) {
			values.push(parseInt(data[valueOf]));
	}
	this.write('disp_img', values, callback);
};

AnimaWatch.prototype.writeEinkImgCmd = function(cmd, callback){
	this.write('disp_img',parseInt(1), callback);
};

AnimaWatch.prototype.writeForgetDevice = function(callback){
	this.write('forget_device',0 , callback);
};

AnimaWatch.prototype.writeIncomingCall = function(number, isRinging, alert, callback){
	var i = 0;
	var valueArr = new Array;
	valueArr[0] = parseInt(number);
	if (isRinging) {
			i = 1;
	}
	valueArr[1] = parseInt(i);
	this.write('call',valueArr, callback);

	if (!isRinging || alert == null) {
			this.stopVibrateForIncomingCall();
	} else {
			this.startVibrateForIncomingCall(parseInt(alert));
	}
};

AnimaWatch.prototype.writeMotor = function(motor, value, callback){
	this.write('stepper_goto', parseInt(motor), parseInt(value), callback);
};

AnimaWatch.prototype.writeMotorDelay = function(value, callback){
	this.write('stepper_delay', parseInt(value), callback);
};

AnimaWatch.prototype.writeOnboardingDone = function(finished, callback){
	this.write('onboarding_done', (finished?1:0), callback);
};

AnimaWatch.prototype.writePostMortem = function(callback){
	this.write('postmortem', 0 , callback);
};

AnimaWatch.prototype.writeRecalibrate = function(enable, callback){
	this.write('recalibrate', (enable ? true : false), callback);
};

AnimaWatch.prototype.writeRecalibrateMove = function(motor, steps, callback){
	this.write('recalibrate_move', [parseInt(motor),parseInt(steps)], callback);
};

AnimaWatch.prototype.writeStartVibrator = function(callback){
	this.write('vibrator_start', 0 , callback);
};

AnimaWatch.prototype.writeStartVibratorWithPattern = function(pattern, callback){
	var values = new Array;
	for (var newInteger in pattern) {
			values.add(parseInt(pattern[newInteger]));
	}
	this.write('vibrator_start', values, callback);
};

AnimaWatch.prototype.writeStepperExecPredef = function(handNo1, handNo2, patternIndex2, patternIndex3, callback){
	this.write('stepper_exec_predef', parseInt(handNo1), parseInt(handNo2), parseInt(patternIndex2), parseInt(patternIndex3), callback);
};

AnimaWatch.prototype.writeSteps = function(total, weekdays, callback){
	var values = new Array;
	values.push(total);
	for (var newInteger in weekdays) {
			values.add(parseInt(weekdays[newInteger]));
	}
	this.write('steps', values, callback);
};

AnimaWatch.prototype.writeStepsDay = function(steps, dayOfMonth, callback){
	this.write('steps_day', [parseInt(steps), parseInt(dayOfMonth)], callback);
};

AnimaWatch.prototype.writeStepsTarget = function(stepsTarget, callback){
	this.write('steps_target', parseInt(stepsTarget), callback);
};

AnimaWatch.prototype.writeStillness = function(timeout, window, start, end, callback){
	this.write('stillness', [parseInt(timeout),parseInt(window),parseInt(start),parseInt(end)], callback);
};

AnimaWatch.prototype.writeStopVibrator = function(callback){
	this.write('vibrator_end', 0 ,callback);
};

AnimaWatch.prototype.writeTest = function(testCase, val, callback){
	this.write('test', [parseInt(testCase), parseInt(val)], callback);
};

AnimaWatch.prototype.writeTimeZone = function(hourDiff, minuteDiff, callback){
	this.write('timezone', [parseInt(hourDiff), parseInt(minuteDiff)], callback);
};

AnimaWatch.prototype.writeTriggers = function(upperTrigger, lowerTrigger, callback){
	this.write('triggers', [parseInt(upperTrigger), parseInt(lowerTrigger)], callback);
};

AnimaWatch.prototype.writeVbat = function(callback){
	this.write('vbat', 0, callback);
};

AnimaWatch.prototype.writeVbatSim = function(mv, callback){
	this.write('vbat_sim', parseInt(mv), callback);
};

AnimaWatch.prototype.writeWatchTime = function(callback){
	var d = new Date();
	this.write('datetime', [parseInt(d.getFullYear()), parseInt(d.getMonth()+1), parseInt(d.getDate()), parseInt(d.getHours()), parseInt(d.getMinutes()), parseInt(d.getSeconds()), parseInt(this.getDeviceDayOfWeek(d.getDay()))], callback);
};

AnimaWatch.prototype.getDeviceDayOfWeek = function(dayOfWeek) {
		switch (dayOfWeek) {
				case 1:
						return 6;
				case 2:
						return 0;
				case 3:
						return 1;
				case 4:
						return 2;
				case 5:
						return 3;
				case 6:
						return 4;
				case 7:
						return 5;
				default:
						return 0;
		}
}

module.exports = AnimaWatch;