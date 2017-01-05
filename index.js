const fs = require('fs');
const Q = require('q');
var randomstring = require("randomstring");
var moment = require('moment');
var rimraf = require('rimraf');
var sys = require('sys')
var exec = require('child_process').exec;

var sensors = []

var duration = "years";
var timeInterval = 5; // 5 min
var days = 1;
var sensorCount = 100;
var sensorEfficiency = 100000;

var ambientBase = 68;
var ambientRange = 5;
var maxTempRange = 25;
var maxTempIncrease = 20;

var basePath = "data";

if (fs.existsSync(basePath)) {
	rimraf.sync(basePath)
}

fs.mkdirSync(basePath);

function convertTime(m){
	return m.format('YYYY-MM-DD HH:mm:ss.SSSSSSSSS');
}
function minuteOfDay(m){
	return m.hour()*60 + m.minute();
}

for (var i=0; i < sensorCount; i++) {
	var sensorId = randomstring.generate({
				length: 8,
				capitalization: 'uppercase',
  				charset: 'alphanumeric'
			});
	
	var thermostatWorking = Math.random() > 0.95 ? true : false;
			
	var sensor = {
		sensorId: sensorId,
		setTemp: Math.ceil(Math.random() * maxTempRange) + ambientBase,
		thermostat: thermostatWorking,
		efficiency: Math.log10(Math.ceil(Math.random() * sensorEfficiency)) / Math.log10(sensorEfficiency)
	};
	sensors.push(sensor);
	
	console.log('sensor:', sensor);
}

var baseMoment = moment("01-01-2016", "MM-DD-YYYY");
var toMoment = moment(baseMoment).add(days, duration);


for (var i=0; i < sensors.length; i++) {
	var ts = moment(baseMoment);
	var sensor = sensors[i];
	var path =  basePath + "/sensorid=" + sensor.sensorId +  "/";
	

	var ambientAdj = ambientBase + Math.random() * 10 - 5;

	while (ts.isBefore(toMoment)) {
	
		var ambientActual = -2 * Math.sin(minuteOfDay(ts)/720 * Math.PI) + Math.random() / 2 - 0.25 + ambientAdj;
		var deviceMax = ambientActual + maxTempIncrease * sensor.efficiency;
		
		
		var tempVariation = sensor.thermostat ? 4 : 12;
		
		var waterTemp = Math.min(deviceMax, sensor.setTemp + Math.random()* tempVariation - tempVariation/2 );
		
		var heaterMinutes = Math.ceil( timeInterval * 60 * (Math.min(deviceMax, sensor.setTemp) - ambientActual) / (deviceMax-ambientActual));
		
		var logData = "\"" + sensor.sensorId + "\"," + convertTime(ts) + ", " + (Math.floor(0.5 + ambientActual*10))/10 +  ", " + sensor.setTemp + ", " + (Math.floor(waterTemp*10 + 0.5)) / 10 + ", " + heaterMinutes;
		var logFile = path + 'sensor_data.' +  ts.format('YYYY-MM-DD') + '.log';

		fs.appendFileSync(logFile, logData + '\n');
	
		
		ts.add(timeInterval, 'minutes');
	}

	console.log('sensor efficency:', sensor.sensorId, sensor.efficiency, sensor.thermostat);
}

// or more concisely
var sys = require('sys')
var exec = require('child_process').exec;
function puts(error, stdout, stderr) { sys.puts(stdout) }
// aws s3 rm s3://mjg-master-builder/sensor-data --recursive
exec("aws s3 sync data/ s3://mjg-master-builder/sensor-data", puts);

