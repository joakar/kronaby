# kronaby 
> Node.js API to control Kronaby Watch from Anima


## Install

```
$ npm install --save kronaby
```


## Usage

```js
const Kronaby = require('kronaby');

Kronaby.discover(function(watch) {
	watch.subscribe('button',function(data){
		console.log('button', data[0], 'is pressed');
	});

	watch.connect(function(){
		watch.writeBaseConfig(10, 1);
		watch.writeWatchTime();
		watch.writeOnboardingDone(true);
	});
});

```


## API

### .discover()

Check if bluetooth is on and start looking for Kronaby watch.

### .connect()

Connect to Kronaby watch.

### .disconnect()

Disconnect a Kronaby watch.

### .subscribe(type, callback)

Subscribe to watch events


## Device info

### .getDeviceName(callback)

### .getModelNumber(callback)

### .getFirmwareRevision(callback)

### .getHardwareRevision(callback)

### .getManufacturerName(callback)

## Functions

### .writeAlarms(alarms, callback)

### .writeAlert(alert, callback)

### .writeAlertConfig(alertConfigBitmasks, callback)

### .writeBaseConfig(timeResolutionMinutes, enableStepcounter, callback)

### .writeComplicationModes(mainMode, alternateMode, otherMode, primaryFaceMainMode, primaryFaceAlternateMode, primaryFaceOtherMode, callback)

### .writeConfigSettings(settings, callback)

### .writeConfigVibrator(patterns, callback)

### .writeCrash(callback)

### .writeDateTime(year, month, day, hour, min, sec, weekday, callback)

### .writeDebugAppError(errorCode, callback)

### .writeDebugConfig(timeCompress, enableUart, enableTemperature, enableLedAndVibrationOnDisconnect, deprecate, onErrorRebootTimeout, millisPerMinuteTick, rssiNotification, callback)

### .writeDebugHardFault(callback)

### .writeDebugReset(resetType, callback)

### .writeEinkImg(values, callback)

### .writeEinkImgCmd(cmd, callback)

### .writeForgetDevice(callback)

### .writeIncomingCall(number, isRinging, alert, callback)

### .writeMotor(motor, value, callback)

### .writeMotorDelay(value, callback)

### .writeOnboardingDone(finished, callback)

### .writePostMortem(callback)

### .writeRecalibrate(enable, callback)

### .writeRecalibrateMove(motor, steps, callback)

### .writeStartVibrator(callback)

### .writeStartVibratorWithPattern(pattern, callback)

### .writeStepperExecPredef(handNo1, handNo2, patternIndex2, patternIndex3, callback)

### .writeSteps(total, weekdays, callback)

### .writeStepsDay(steps, dayOfMonth, callback)

### .writeStepsTarget(stepsTarget, callback)

### .writeStillness(timeout, window, start, end, callback)

### .writeStopVibrator(callback)

### .writeTest(testCase, val, callback)

### .writeTimeZone(hourDiff, minuteDiff, callback)

### .writeTriggers(upperTrigger, lowerTrigger, callback)

### .writeVbat(callback)

### .writeVbatSim(mv, callback)

### .writeWatchTime(callback)
