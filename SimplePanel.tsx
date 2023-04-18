import React, { useState } from 'react';
import { PanelProps, dateTime, DateTime } from '@grafana/data';
import { SimplePanelOptions } from 'types';
import { Input, Button, Alert, Field, FieldSet, Cascader, SecretInput, Checkbox, Card, PanelContainer, RadioButtonGroup, TimeOfDayPicker   } from '@grafana/ui';
import { Buffer } from 'buffer';



interface Props extends PanelProps<SimplePanelOptions> {
  onOptionsChange: (options: SimplePanelOptions) => void;             // Add a new property to the Props interface called onOptionsChange
}

type SensorTypeInfo = {                                               // SensorTypeInfo object definition
  type: string;
  size: number;
  multipl?: number;
  multipl_l_l?: number;
  multipl_alt?: number;
  signed: boolean;
  min?: number;
  max?: number;
  min_l_l?: number;
  max_l_l?: number;
  min_alt?: number;
  max_alt?: number;
  arrLen: number;
};


/*
The individual types of data that the encoder can encode are defined here, it is stated here what type of data it is, what the resulting size is
of encoded data in bytes (without type and channel), by what value should the input value inserted in the lpp field be multiplied, if the input value can
take negative values and what are its maximum and minimum values, finally what is the expected number of values in the field for the given data type
where for example with arrLen:3 the array is expected to contain the channel number, data type and value to be encoded.
*/
const sensorTypes: Record<string, SensorTypeInfo> = {
  addDigitalInput: { type: "00", size: 1, multipl: 1, signed: false, min: 0, max: 255, arrLen: 3 },
  addDigitalOutput: { type: "01", size: 1, multipl: 1, signed: false, min: 0, max: 255, arrLen: 3 },
  addAnalogInput: { type: "02", size: 2, multipl: 100, signed: true, min: -327.67, max: 327.67, arrLen: 3 },
  addAnalogOutput: { type: "03", size: 2, multipl: 100, signed: true, min: -327.67, max: 327.67, arrLen: 3 },
  addGenericSensor: { type: "64", size: 4, multipl: 1, signed: false, min: 0, max: 4294967295, arrLen: 3 },
  addLuminosity: { type: "65", size: 2, multipl: 1, signed: false, min: 0, max: 65535, arrLen: 3 },
  addPresence: { type: "66", size: 1, multipl: 1, signed: false, min: 0, max: 255, arrLen: 3 },
  addTemperature: { type: "67", size: 2, multipl: 10, signed: true, min: -3276.7, max: 3276.7, arrLen: 3 },
  addRelativeHumidity: { type: "68", size: 1, multipl: 2, signed: false, min: 0, max: 100, arrLen: 3 },
  addAccelerometer: { type: "71", size: 2, multipl: 1000, signed: true, min: -32.767, max: 32.767, arrLen: 5 },
  addBarometricPressure: { type: "73", size: 2, multipl: 10, signed: false, min: 0, max: 6553.5, arrLen: 3 },
  addVoltage: { type: "74", size: 2, multipl: 100, signed: false, min: 0, max: 655.34, arrLen: 3 },
  addCurrent: { type: "75", size: 2, multipl: 1000, signed: false, min: 0, max: 65.535, arrLen: 3 },
  addFrequency: { type: "76", size: 4, multipl: 1, signed: false, min: 0, max: 4294967295, arrLen: 3 },
  addPercentage: { type: "78", size: 1, multipl: 1, signed: false, min: 0, max: 255, arrLen: 3 },
  addAltitude: { type: "79", size: 2, multipl: 1, signed: true, min: -32767, max: 32767, arrLen: 3 },
  addConcentration: { type: "7D", size: 2, multipl: 1, signed: false, min: 0, max: 65535, arrLen: 3 },
  addPower: { type: "80", size: 2, multipl: 1, signed: false, min: 0, max: 65535, arrLen: 3 },
  addDistance: { type: "82", size: 4, multipl: 1000, signed: false, min: 0, max: 4294967.295, arrLen: 3 },
  addEnergy: { type: "83", size: 4, multipl: 1000, signed: false, min: 0, max: 4294967.295, arrLen: 3 },
  addDirection: { type: "84", size: 2, multipl: 1, signed: false, min: 0, max: 65535, arrLen: 3 },
  addUnixTime: { type: "85", size: 4, multipl: 1, signed: false, min: 0, max: 4294967295, arrLen: 3 },
  addGyrometer: { type: "86", size: 2, multipl: 100, signed: true, min: -327.67, max: 327.67, arrLen: 5 },
  addColour: { type: "87", size: 1, multipl: 1, signed: false, min: 0, max: 255, arrLen: 5 },
  addGPS: { type: "88", size: 3, multipl_l_l: 10000, multipl_alt: 100, signed: true, min_l_l: -838.8607, max_l_l: 838.8607, min_alt: -83886.07, max_alt: 83886.07, arrLen: 5},
  addSwitch: { type: "8E", size: 1, multipl: 1, signed: false, min: 0, max: 255, arrLen: 3 },
  
  // My Types - You can add more sensor types here if needed
  addSmallTime: { type: "C0", size: 3, multipl: 1, signed: false, min: 0, max: 16777215, arrLen: 3 },
};


// A function in which the entered data in the array is encoded into the Cayenne LPP format, where the output is a string with the encoded data
function encodeCayenneLPP(lpp: any[]): string {

  let payload = "";                                                                                   // The resulting encoded data will be gradually added to this variable
  let onePayload = "";                                                                                // Data of the currently encoded type will be added to this variable each cycle

  for (let i = 0; i < lpp.length; i++) {

    const sensorInfo = sensorTypes[lpp[i][1]];                                                        // Determining what type of data to encode

    if (!sensorInfo) {                                                                                // Unknown data type
      console.log(`Unknown type ${lpp[i][1]} in channel ${lpp[i][0]}.`);
      continue;
    }

    if (lpp[i].length !== sensorInfo.arrLen) {                                                        // There are more or fewer elements in the data array to be encoded than expected for this detected type
      console.log(`Too few/many values in channel ${lpp[i][0]} of the type ${lpp[i][1]}.`);
      
    } else {                                                                                          // Here begins the creation of the payload of a specific item in the lpp array
      
      if (typeof lpp[i][0] !== 'number') {
        console.log("The channel number is NaN!");
        continue;
      } else {
        if (!Number.isInteger(lpp[i][0])) {
          console.log("The channel number is not integer!");
          continue;
        } else {
          onePayload += lpp[i][0].toString(16).padStart(2, "0");                                      // Adding a channel
        }
      }
      

      onePayload += sensorInfo.type;                                                                  // Here we add the data type in Cayenne LPP to the payload

      
      let error = false;                                                                              // Variable to check if an error occurred during encoding

      for (let j = 2; j < lpp[i].length; j++) {                                                       // Cycle for encoding the specified values to be encoded (for example, encoding a temperature value of 27.5)

        error = false;
        const value = lpp[i][j];
  
        if (typeof value !== 'number') {
          console.log(`The value in channel ${lpp[i][0]} of the type ${lpp[i][1]} is not a number.`); // Check if a numeric data value has been entered
          error = true;
          break;
        }
  
        // Range and *
        let valueConversion: number;

        if (lpp[i][1] === 'addGPS') {                                                                 // GPS is encoded differently because it contains multiple multipliers and different max, min values for coordinates and for altitude
          if (j < 4) {
            if (!(value >= (sensorInfo.min_l_l ?? 1) && value <= (sensorInfo.max_l_l ?? 1))) {
              console.log(`Value ${value} in channel ${lpp[i][0]} of the type ${lpp[i][1]} is outside the ${sensorInfo.min_l_l} - ${sensorInfo.max_l_l} range!`);
              error = true;
              break;
            }
            valueConversion = Math.round(value * (sensorInfo.multipl_l_l ?? 1));                      // When the longitude/latitude value is in the range, we multiply it by a multiplier and turn the resulting value into an integer

          } else {
            if (!(value >= (sensorInfo.min_alt ?? 1) && value <= (sensorInfo.max_alt ?? 1))) {
              console.log(`Value ${value} in channel ${lpp[i][0]} of the type ${lpp[i][1]} is outside the ${sensorInfo.min_alt} - ${sensorInfo.max_alt} range!`);
              error = true;
              break;
            }
            valueConversion = Math.round(value * (sensorInfo.multipl_alt ?? 1));                      // When the altitude value is in the range, we multiply it by a multiplier and turn the resulting value into an integer
          }

        } else {                                                                                      // Encoding other data types
          if (!(value >= (sensorInfo.min ?? 1) && value <= (sensorInfo.max ?? 1))) {
            console.log(`Value ${value} in channel ${lpp[i][0]} of the type ${lpp[i][1]} is outside the ${sensorInfo.min} - ${sensorInfo.max} range!`);
            error = true;
            break;
          }
          valueConversion = Math.round(value * (sensorInfo.multipl ?? 1));                            // When the data value is in the range, we multiply it by a multiplier and turn the resulting value into an integer
        }

        // Signed conversion
        const sign = value < 0;                                                                       // Check if the value is negative
  
        if (sensorInfo.signed && sign) {                                                              // When the value is negative and the data type can be negative
          if (lpp[i][1] === 'addGPS') {
            valueConversion = Number(BigInt.asUintN(32, BigInt(valueConversion)));                    // Convert negative GPS values to positive using a 32-bit non-negative integer
          } else {
            valueConversion = Number(BigInt.asUintN(16, BigInt(valueConversion)));                    // Convert negative values to positive using a 16-bit non-negative integer
          }
        }
  
        const sizeHexFormat = (size: number) => valueConversion.toString(16).padStart(size * 2, '0').slice(-size * 2);  // Here the encoded number is converted to a hexadecimal string with the corresponding number of digits
        onePayload += sizeHexFormat(sensorInfo.size);                                                                   // The string is added to the channel and type in the onePayload variable
      }

      if (!error) {
        payload += onePayload;                                                                        // If there was no error while encoding one type of data, then we add the encoded data of one type to the total payload string
        onePayload = "";                                                                              // Clearing the onePayload variable for the next round of the cycle
      } else {
        onePayload = "";
      }
    }
  }

  return payload;                                                                                     // Returning the resulting payload string with encoded data in Cayenne LPP format
}


// A functional React component named SimplePanel
export const SimplePanel: React.FC<Props> = ({ options, data, width, height, onOptionsChange }) => {

  // Initialization of variable values to default values
  
  // Message alert box
  const [logMessage, setLogMessage] = useState("Fill in the necessary information and send the downlink.");
  const [alertVariant, setAlertVariant] = useState<'info' | 'error' | 'warning' | 'success'>('info');
  const [payloadMessage, setPayloadMessage] = useState("");

  // TTN server input
  const [ttnServer, setTTNServer] = useState(options.targetTTNServer ? options.targetTTNServer : 'https://eu1.cloud.thethings.network');

  // API key, Application name and End device name inputs
  const [isAPIKeyConfigured, setIsAPIKeyConfigured] = useState<boolean>(options.targetAPIkey !== '' && options.targetAPIkey !== undefined);
  const [appName, setAppName] = useState(options.targetAppName);
  const [endDeviceName, setEndDeviceName] = useState(options.targetEndDeviceName);

  // FPort, Priority, Insert mode and Confirmed downlinks inputs
  const [fPort, setFport] = useState("1");
  const [priority, setPriority] = useState('NORMAL');
  const [insertMode, setInsertMode] = useState('replace');
  const [confirmedDownlink, setConfirmedDownlink] = useState<boolean>(false);

  // Array of objects - Priority options
  const priorityOptions = [
    {label: 'Lowest', value: 'LOWEST',},
    {label: 'Low', value: 'LOW',},
    {label: 'Below normal', value: 'BELOW_NORMAL',},
    {label: 'Normal', value: 'NORMAL',},
    {label: 'Above normal', value: 'ABOVE_NORMAL',},
    {label: 'High', value: 'HIGH',},
    {label: 'Highest', value: 'HIGHEST',},
  ];

  // Array of objects - Insert mode options
  const insertModeOptions = [
    {label: 'Push to downlink queue', value: 'push',},
    {label: 'Replace downlink queue', value: 'replace',},
  ];

  // Password input
  const [password, setPassword] = useState("");
  
  // Light intensity settings
  // Threshold [lux] - checkbox and input
  const [checkThreshold, setCheckThreshold] = useState<boolean>(false);
  const [threshold, setThreshold] = useState("0");

  // Safe zone [lux] - checkbox and input
  const [checkSafeZone, setCheckSafeZone] = useState<boolean>(false);
  const [safeZone, setSafeZone] = useState("0");


  // Common settings
  // Send data every [s] - checkbox and input
  const [checkSendDataEvery, setCheckSendDataEvery] = useState<boolean>(false);
  const [sendDataEvery, setSendDataEvery] = useState("600");

  // Working mode - checkbox, cascader and cascader options
  const [checkWorkingMode, setCheckWorkingMode] = useState<boolean>(false);
  const [workingMode, setWorkingMode] = useState('0');
  const workingModeOptions = [
    {label: 'OFF', value: '0',},
    {label: 'ON', value: '1',},
    {label: 'Light intensity', value: '2',},
    {label: 'Time', value: '3',},
    {label: 'Light intensity in Time', value: '4',},
    {label: 'Sunset / sunrise times', value: '5',},
  ];

  // Number of samples - checkbox and input
  const [checkNumberOfSamples, setCheckNumberOfSamples] = useState<boolean>(false);
  const [numberOfSamples, setNumberOfSamples] = useState("10");

  // Timezone - checkbox, cascader and cascader options
  const [checkTimezone, setCheckTimezone] = useState<boolean>(false);
  const [timezone, setTimezone] = useState('2');
  const timezoneOptions = [
    {label: 'Central European Time', value: '0',},
    {label: 'United Kingdom', value: '1',},
    {label: 'UTC', value: '2',},
    {label: 'US Eastern Time Zone', value: '3',},
    {label: 'US Central Time Zone', value: '4',},
    {label: 'US Mountain Time Zone', value: '5',},
    {label: 'US Arizona', value: '6',},
    {label: 'US Pacific Time Zone', value: '7',},
    {label: 'Australia Eastern Time Zone', value: '8',},
  ];

  // Power grid [V] - checkbox, cascader and cascader options
  const [checkPowerGrid, setCheckPowerGrid] = useState<boolean>(false);
  const [powerGrid, setpowerGrid] = useState('0');
  const powerGridOptions = [
    {label: '230', value: '0',},
    {label: '400', value: '1',},
  ];

  // Reset and load - checkbox, cascader and cascader options
  const [checkResetAndLoad, setCheckResetAndLoad] = useState<boolean>(false);
  const [resetAndLoad, setResetAndLoad] = useState('1');
  const resetAndLoadOptions = [
    {label: 'Saved', value: '1',},
    {label: 'Default', value: '2',},
  ];

  // Send only selected - checkbox
  const [checkSendOnlySelected, setCheckSendOnlySelected] = useState<boolean>(false);
  // Send only selected - settings block checkboxes
  const [checkRelayState, setCheckRelayState] = useState<boolean>(true);
  const [checkNumberOfChanges, setCheckNumberOfChanges] = useState<boolean>(true);
  const [checkLightIntensity, setCheckLightIntensity] = useState<boolean>(true);
  const [checkBatteryVoltage, setCheckBatteryVoltage] = useState<boolean>(true);
  const [checkBatteryPercentage, setCheckBatteryPercentage] = useState<boolean>(true);
  const [checkBatteryTemperature, setCheckBatteryTemperature] = useState<boolean>(true);
  const [checkPowerLineVoltage, setCheckPowerLineVoltage] = useState<boolean>(true);
  const [checkPowerLineFrequency, setCheckPowerLineFrequency] = useState<boolean>(true);
  const [checkActiveEnergy, setCheckActiveEnergy] = useState<boolean>(true);
  const [checkCurrent, setCheckCurrent] = useState<boolean>(true);
  const [checkActivePower, setCheckActivePower] = useState<boolean>(true);
  const [checkPowerFactor, setCheckPowerFactor] = useState<boolean>(true);
  const [checkRTCTemperature, setCheckRTCTemperature] = useState<boolean>(true);
  const [checkSunrise, setCheckSunrise] = useState<boolean>(true);
  const [checkSunset, setCheckSunset] = useState<boolean>(true);


  // Switching times settings
  // On time 1 - checkbox, radio button and Time Of Day Picker
  const [checkOnTime1, setCheckOnTime1] = useState<boolean>(false);
  const [radioOnTime1, setRadioOnTime1] = useState('0');
  const [onTime1, setOnTime1] = useState<DateTime>(dateTime('2023-01-01 00:00:00'));

  // On time 2 - checkbox, radio button and Time Of Day Picker
  const [checkOnTime2, setCheckOnTime2] = useState<boolean>(false);
  const [radioOnTime2, setRadioOnTime2] = useState('0');
  const [onTime2, setOnTime2] = useState<DateTime>(dateTime('2023-01-01 00:00:00'));

  // On time 3 - checkbox, radio button and Time Of Day Picker
  const [checkOnTime3, setCheckOnTime3] = useState<boolean>(false);
  const [radioOnTime3, setRadioOnTime3] = useState('0');
  const [onTime3, setOnTime3] = useState<DateTime>(dateTime('2023-01-01 00:00:00'));

  // Off time 1 - checkbox, radio button and Time Of Day Picker
  const [checkOffTime1, setCheckOffTime1] = useState<boolean>(false);
  const [radioOffTime1, setRadioOffTime1] = useState('0');
  const [offTime1, setOffTime1] = useState<DateTime>(dateTime('2023-01-01 00:00:00'));

  // Off time 2 - checkbox, radio button and Time Of Day Picker
  const [checkOffTime2, setCheckOffTime2] = useState<boolean>(false);
  const [radioOffTime2, setRadioOffTime2] = useState('0');
  const [offTime2, setOffTime2] = useState<DateTime>(dateTime('2023-01-01 00:00:00'));

  // Off time 3 - checkbox, radio button and Time Of Day Picker
  const [checkOffTime3, setCheckOffTime3] = useState<boolean>(false);
  const [radioOffTime3, setRadioOffTime3] = useState('0');
  const [offTime3, setOffTime3] = useState<DateTime>(dateTime('2023-01-01 00:00:00'));


  // Sunset / sunrise settings - inputs
  const [latitude, setLatitude] = useState("0");
  const [longitude, setLongitude] = useState("0");


  // Functions and handlers bellow
  // ------------------------------
  
  function isValidHexPayload(payload: string): boolean {                          // Check if string is hexadecimal value
    const hexRegex = /^[0-9a-fA-F]+$/;
    return hexRegex.test(payload);
  }


  const sendPostRequest = async (lpp: Array<Array<number | string>>) => {         // Method for sending POST request
    
    if (!ttnServer || ttnServer.trim() === '') {                                      // Check if TTN server input string is not empty
      setAlertVariant('error');                                                       // If the string is empty, then set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage('TTN server is empty!');
      setPayloadMessage("");
      return;
    }

    if (!options.targetAPIkey || options.targetAPIkey.trim() === '') {                // Check if API key input string is not empty
      setAlertVariant('error');                                                       // If the string is empty, then set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage('API key is empty!');
      setPayloadMessage("");
      return;
    }

    if (!appName || appName.trim() === '') {                                          // Check if Application name input string is not empty
      setAlertVariant('error');                                                       // If the string is empty, then set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage('Application name is empty!');
      setPayloadMessage("");
      return;
    }

    if (!endDeviceName || endDeviceName.trim() === '') {                              // Check if End device input string is not empty
      setAlertVariant('error');                                                       // If the string is empty, then set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage('End device name is empty!');
      setPayloadMessage("");
      return;
    }

    if (password === '') {                                                            // Check if Password input is not empty
      setAlertVariant('error');                                                       // If the string is empty, then set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage('Settings password is empty!');
      setPayloadMessage("");
      return;
    }


    lpp.push([100, "addPower", parseInt(password, 10)]);                              // Add Password to lpp array
    const payloadBytes = encodeCayenneLPP(lpp);                                       // Encode lpp array in function encodeCayenneLPP() and store returned payload string in payloadBytes variable


    if (payloadBytes === '') {                                                        // Check if payloadBytes is not empty string
      setAlertVariant('error');                                                       // If is empty, then set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage('Payload is empty!');
      setPayloadMessage("");
      return;
    }

    if (!isValidHexPayload(payloadBytes)) {                                           // Check if payloadBytes is a hex value
      setAlertVariant('error');                                                       // If is not a hex value, then set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage('Payload must be a hex value.');
      setPayloadMessage("");
      return;
    }

    if (payloadBytes.length % 2 !== 0) {                                              // Check if payloadBytes is a complete hex value
      setAlertVariant('error');                                                       // If is not a complete hex value, then set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage('Payload must be a complete hex value');
      setPayloadMessage("");
      return;
    }
    
    // Construct the URL to which the POST request will be sent. The URL is composed of a string with the TTN server address, the application ID, the end device ID and the "push" or "replace" string
    // targetUrl = 'https://eu1.cloud.thethings.network/api/v3/as/applications/' + appName + '/devices/' + endDeviceName + '/down/' + insertMode;
    const targetUrl = ttnServer + '/api/v3/as/applications/' + appName + '/devices/' + endDeviceName + '/down/' + insertMode;

    const payloadBase64 = Buffer.from(payloadBytes, 'hex').toString('base64')     // Encoding bytes payload in base64 format
    
    const header = {                                                              // POST request header - Consists of authorization (using an API key), content type and user agent
      'Authorization': `Bearer ${options.targetAPIkey}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'my-integration/my-integration-version',
    };
    
    const data = {                                                                // POST request data - Data that contains the encoded payload in base64, the FPort number, information on whether we want to confirm the reception of the downlink and the priority with which the downlink should be sent
      "downlinks": [
        {
          "frm_payload": payloadBase64,
          "f_port": parseInt(fPort, 10),
          "confirmed": confirmedDownlink,
          "priority": priority
        }
      ]
    };

    try {
      const response = await fetch(targetUrl, {                                   // Send a POST request and store the response in the response variable
        method: 'POST',
        headers: header,
        body: JSON.stringify(data)
      });

      if (!response.ok) {                                                         // If the response status code is not 200 OK, then Error is thrown
        throw new Error(`HTTP error ${response.status}`);
      } else {                                                                    // The response status code is 200 OK
        setAlertVariant('success');                                               // Set Alert to the success variant, write a message with a success and write the payload to Alert
        setLogMessage(`Success: ${response.status}`);
        setPayloadMessage(`Payload: ${payloadBytes}`);
      }
    } catch (error) {
      setAlertVariant('error');                                                   // If Error is thrown, set Alert to the error variant, write a message with an error, do not write the payload and return from the function
      setLogMessage(`Error: ${(error as Error).message}`);
      setPayloadMessage("");
    }
  };


  const handleAPIKeyChange = (event: React.ChangeEvent<HTMLInputElement>) => {    // Handler for API key changes
    onOptionsChange({ ...options, targetAPIkey: event.target.value });
  };


  // The following handler is called by pressing the API key reset button
  const handleAPIkeyReset = () => {                                               // Handler for API key reset
    onOptionsChange({ ...options, targetAPIkey: '' });
    setIsAPIKeyConfigured(false);
  };


  // The following handler is called by pressing the Save TTS settings button
  const handleSaveTTS = () => {                                                   // Handler for saving TTS settings
    setIsAPIKeyConfigured(options.targetAPIkey !== '');

    onOptionsChange({
      ...options,
      targetAppName: appName,
      targetEndDeviceName: endDeviceName,
      targetTTNServer: ttnServer,
    });

    setAlertVariant('warning');                                                   // Set Alert to the warning variant, write a message with a warning and do not write the payload
    setLogMessage('TTS settings saved! Now please save the dashboard!');
    setPayloadMessage("");
  };


  // The following handler is called by pressing the Send light intensity settings button
  const handleDownlinkLightIntensity= () => { 
    const lpp: Array<Array<number | string>> = [];                               // lpp array
    
    if (checkThreshold){                                                         // Threshold [lux] - if checkbox checked => Add threshold to lpp array
      lpp.push([101, "addLuminosity", parseInt(threshold, 10)]);
    }

    if (checkSafeZone){                                                          // Safe zone [lux] - if checkbox checked => Add safeZone to lpp array
      lpp.push([102, "addLuminosity", parseInt(safeZone, 10)]);
    }

    sendPostRequest(lpp);                                                       // Call method for encode lpp and send payload
  };


  // The following handler is called by pressing the Send common settings button
  const handleDownlinkCommonSettings = () => { 

    const lpp: Array<Array<number | string>> = [];                              // lpp array

    if (((checkResetAndLoad === true) && (resetAndLoad === '1')) || (checkResetAndLoad === false)){     // If is Reset and load set to Default, there is no need to send any other settings
      
      if (checkSendDataEvery){                                                  // Send data every [s] - if checkbox checked => Add sendDataEvery to lpp array
        lpp.push([100, "addSmallTime", parseInt(sendDataEvery, 10)]);
      }

      if (checkWorkingMode){                                                    // Working mode - if checkbox checked => Add workingMode to lpp array
        lpp.push([101, "addDigitalInput", parseInt(workingMode, 10)]);
      }

      if (checkNumberOfSamples){                                                // Number of samples - if checkbox checked => Add numberOfSamples to lpp array
        lpp.push([100, "addPresence", parseInt(numberOfSamples, 10)]);
      }

      if (checkTimezone){                                                       // Timezone - if checkbox checked => Add checkTimezone to lpp array
        lpp.push([102, "addDigitalInput", parseInt(timezone, 10)]);
      }

      if (checkPowerGrid){                                                      // Power grid [V] - if checkbox checked => Add checkPowerGrid to lpp array
        lpp.push([103, "addDigitalInput", parseInt(powerGrid, 10)]);
      }

      // Send only selected
      if (checkSendOnlySelected){
        const sendingData1 = [0, 0, 0, 0, 0, 0, 0, 0];                          // Send only selected 1/2
        const sendingData2 = [0, 0, 0, 0, 0, 0, 0, 0];                          // Send only selected 2/2

        // Settings Data in sendingData1                If checked => set bit to 1
        sendingData1[7] = +checkRelayState;                                     // Relay state
        sendingData1[6] = +checkNumberOfChanges;                                // Number of changes
        sendingData1[5] = +checkLightIntensity;                                 // Light intensity
        sendingData1[4] = +checkBatteryVoltage;                                 // Battery voltage
        sendingData1[3] = +checkBatteryPercentage;                              // Battery percentage
        sendingData1[2] = +checkBatteryTemperature;                             // Battery temperature
        sendingData1[1] = +checkRTCTemperature;                                 // RTC temperature
        sendingData1[0] = +checkPowerLineVoltage;                               // Power line voltage

        // Settings Data in sendingData2
        sendingData2[7] = +checkPowerLineFrequency;                             // Power line frequency
        sendingData2[6] = +checkActiveEnergy;                                   // Active energy
        sendingData2[5] = +checkCurrent;                                        // Current
        sendingData2[4] = +checkActivePower;                                    // Active power
        sendingData2[3] = +checkPowerFactor;                                    // Power factor
        sendingData2[2] = +checkSunrise;                                        // Sunrise
        sendingData2[1] = +checkSunset;                                         // Sunset

        const resSendingData1 = parseInt(sendingData1.join(''), 2);             // Converting binary list to integer value
        const resSendingData2 = parseInt(sendingData2.join(''), 2);             // Converting binary list to integer value

        lpp.push([1, "addDigitalOutput", resSendingData1]);                     // Send only selected 1/2 - Add resSendingData1 to lpp array
        lpp.push([2, "addDigitalOutput", resSendingData2]);                     // Send only selected 1/2 - Add resSendingData2 to lpp array
      }

      if ((checkResetAndLoad === true) && (resetAndLoad === '1')){              // Reset Feather
        lpp.push([100, "addDigitalInput", parseInt(resetAndLoad, 10)]);         // 1 - reset Feather and load saved config from EEPROM
      }

    }else{
      if ((checkResetAndLoad === true) && (resetAndLoad === '2')){              // Reset Feather
        lpp.push([100, "addDigitalInput", parseInt(resetAndLoad, 10)]);         // 2 - reset and load default config from Feather
      }
    }

    sendPostRequest(lpp);                                                       // Call method for encode lpp and send payload
  };


  // Function to calculate seconds of day from hours, minutes and seconds
  function getTimeSecondsOfDay(isoString: string): number {
    const date = new Date(isoString);
    const secondsOfDay = (date.getHours()*3600)+(date.getMinutes()*60)+date.getSeconds();  
    
    return secondsOfDay;
  }

  // The following handler is called by pressing the Send switching times settings button
  const handleDownlinkSwitchingTimes = () => { 
    const lpp: Array<Array<number | string>> = [];                              // lpp array
    
    if (checkOnTime1){                                                          // On time 1 - if checkbox checked
      if (radioOnTime1 === '1'){                                                // Set time
        const setOnTime1 = getTimeSecondsOfDay(onTime1.toISOString());
        lpp.push([101, "addSmallTime", setOnTime1]);                            // Add setOnTime1 to lpp array

      }else{                                                                    // Time not set
        lpp.push([101, "addSmallTime", 100000]);                                // Add 100000 to lpp array
      }
    }

    if (checkOnTime2){                                                          // On time 2 - if checkbox checked
      if (radioOnTime2 === '1'){                                                // Set time
        const setOnTime2 = getTimeSecondsOfDay(onTime2.toISOString());
        lpp.push([103, "addSmallTime", setOnTime2]);

      }else{                                                                    // Time not set
        lpp.push([103, "addSmallTime", 100000]);
      }
    }

    if (checkOnTime3){                                                          // On time 3 - if checkbox checked
      if (radioOnTime3 === '1'){                                                // Set time
        const setOnTime3 = getTimeSecondsOfDay(onTime3.toISOString());
        lpp.push([105, "addSmallTime", setOnTime3]);

      }else{                                                                    // Time not set
        lpp.push([105, "addSmallTime", 100000]);
      }
    }

    if (checkOffTime1){                                                         // Off time 1 - if checkbox checked
      if (radioOffTime1 === '1'){                                               // Set time
        const setOffTime1 = getTimeSecondsOfDay(offTime1.toISOString());
        lpp.push([102, "addSmallTime", setOffTime1]);

      }else{                                                                    // Time not set
        lpp.push([102, "addSmallTime", 100000]);
      }
    }

    if (checkOffTime2){                                                         // Off time 2 - if checkbox checked
      if (radioOffTime2 === '1'){                                               // Set time
        const setOffTime2 = getTimeSecondsOfDay(offTime2.toISOString());
        lpp.push([104, "addSmallTime", setOffTime2]);

      }else{                                                                    // Time not set
        lpp.push([104, "addSmallTime", 100000]);
      }
    }

    if (checkOffTime3){                                                         // Off time 3 - if checkbox checked
      if (radioOffTime3 === '1'){                                               // Set time
        const setOffTime3 = getTimeSecondsOfDay(offTime3.toISOString());
        lpp.push([106, "addSmallTime", setOffTime3]);

      }else{                                                                    // Time not set
        lpp.push([106, "addSmallTime", 100000]);
      }
    }

    sendPostRequest(lpp);                                                       // Call method for encode lpp and send payload
  };

  
  // The following handler is called by pressing the Send switching times settings button
  const handleDownlinkSunsetRise = () => { 
    const lpp: Array<Array<number | string>> = [];
    lpp.push([101, "addGPS", parseFloat(latitude), parseFloat(longitude), 0.0]);

    sendPostRequest(lpp);                                                       // Call method for encode lpp and send payload
  };


  // Below is the section with the plugin graphics, where the elements are defined and the function calls that are bound to the elements and ranges are checked
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex:1, justifyContent: 'center', height, width, paddingTop: '1%', paddingRight: '1%', paddingLeft: '1%', paddingBottom: '1%'}}>

        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'top', marginLeft: '2%', marginRight: '2%'}}>
            <Alert title={logMessage.toString()} severity={alertVariant}>
              {payloadMessage.toString()}
            </Alert>
        </div>
            

        <div style={{ display: 'flex', marginLeft: '2%', marginRight: '1%'}}>                
            <Card style={{ marginRight: '1%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <FieldSet label="TTS settings" >
                    <div style={{ display: 'flex', alignItems: 'center' }}>   
                        <Field label="TTN server"style={{flex:1}}>
                            <Input 
                              value={ttnServer} 
                              name="ttnServer" 
                              placeholder="URL of the TTN cluster"
                              onChange={(e) => setTTNServer(e.currentTarget.value)} 
                            />
                        </Field>

                        <Field label="API key" style={{flex:1, marginLeft: '8%'}}>
                            <SecretInput 
                              value={options.targetAPIkey} 
                              name="apiKey" 
                              isConfigured={isAPIKeyConfigured}
                              placeholder="Enter API key"
                              onChange={(event: React.ChangeEvent<HTMLInputElement>) => handleAPIKeyChange(event)}
                              onReset={handleAPIkeyReset}
                            />  
                        </Field>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>                            
                        <Field label="Application name" style={{flex:1}}>
                            <Input 
                              value={appName} 
                              name="appName" 
                              placeholder="Application name"
                              onChange={(e) => setAppName(e.currentTarget.value)} 
                            />
                        </Field>

                        <Field label="End device name" style={{flex:1, marginLeft: '8%'}}>
                            <Input 
                              value={endDeviceName} 
                              name="endDeviceName" 
                              placeholder="End device name"
                              onChange={(e) => setEndDeviceName(e.currentTarget.value)} 
                            />
                        </Field>
                    </div>


                    <div style={{ display: 'flex', alignItems: 'center'}}>
                        <Button
                          onClick={handleSaveTTS}
                          style={{
                            flex: 1,
                            marginTop: '1%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >Save TTS settings
                        </Button>
                    </div>
                </FieldSet>
            </Card>


            <div style={{ display: 'flex', marginLeft: '2%', marginRight: '1%', flex:1, flexDirection: 'column'}}>           
                <Card style={{ marginLeft: '1%', marginRight: '1%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <FieldSet label="Downlink settings" >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Field label="FPort" style={{flex:1}}>
                                <Input 
                                  value={fPort} 
                                  name="fPort" 
                                  type="number" 
                                  min="1" 
                                  max="223"
                                  onChange={(e) => {
                                    const value = parseInt(e.currentTarget.value, 10);
                                    if (value >= 1 && value <= 223) {
                                      setFport(e.currentTarget.value);
                                    }
                                  }}
                                />
                            </Field>

                            <Field label="Priority" style={{flex:1, marginLeft: '8%'}}>
                                <Cascader
                                  options={priorityOptions}
                                  initialValue={priority}
                                  onSelect={(value) => setPriority(value)}
                                />
                            </Field>   
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Field label="Insert mode" style={{flex:1}}>
                                <Cascader
                                  options={insertModeOptions}
                                  initialValue={insertMode}
                                  onSelect={(value) => setInsertMode(value)}
                                />
                            </Field>

                            <Field style={{flex:1, marginLeft: '8%', marginTop: '4%', marginBottom: '2%' }}>
                                <div style={{ marginTop: '2%', marginBottom: '2%' }}>
                                    <Checkbox
                                      label="Confirmed downlink"
                                      value={confirmedDownlink}
                                      onChange={(event) => setConfirmedDownlink(event.currentTarget.checked)}
                                    />
                                </div>
                            </Field>
                        </div>
                    </FieldSet>
                </Card>
            </div>
        </div>


        <div style={{ display: 'flex', marginLeft: '2%', marginRight: '1%', marginTop: '1%', flexDirection: 'column'}}> 
            <label style={{ display: 'block', marginBottom: '1%', fontSize: '22px', flex: 1 }}>Downlinks</label>
        </div>


        <div style={{ display: 'flex', marginLeft: '2%', marginRight: '1%'}}>           
            <Card style={{marginRight: '1%', flex: 1 }}>
                <FieldSet label='Settings password' >
                        <Field label='Settings password' style={{flex:1 , marginLeft: '12%', marginTop: '10%'}}>
                            <Input 
                              value={password} 
                              name="password" 
                              type="password" 
                              inputMode="numeric"
                              pattern="[0-9]{4}"
                              min="0" 
                              max="9999"
                              onChange={(e) => {
                                const value = e.currentTarget.value;
                                if (value === '' || (value.length <= 4 && parseInt(value, 10) >= 0 && parseInt(value, 10) <= 9999)) {
                                  setPassword(value);
                                }
                              }}
                              onKeyPress={(e) => {
                                if (e.key < '0' || e.key > '9') {
                                  e.preventDefault();
                                }
                              }}
                            />
                        </Field>
                </FieldSet>
            </Card>


            <div style={{ display: 'flex', marginLeft: '2%', marginRight: '1%', flex:1, flexDirection: 'column'}}>           
                <Card style={{ marginLeft: '1%', marginRight: '1%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <FieldSet label="Light intensity settings" >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <Field style={{ paddingTop: '3%'}}>
                                <Checkbox
                                  value={checkThreshold}
                                  onChange={(event) => setCheckThreshold(event.currentTarget.checked)}
                                />
                            </Field>
                            <Field label="Threshold [lux]" style={{flex:1}}>
                                <Input 
                                  value={threshold} 
                                  name="threshold" 
                                  type="number" 
                                  min="0" 
                                  max="65535"
                                  onChange={(e) => {
                                    const value = parseInt(e.currentTarget.value, 10);
                                    if (value >= 0 && value <= 65535) {
                                      setThreshold(e.currentTarget.value);
                                    }
                                  }}
                                />
                            </Field>

                            <Field style={{ paddingTop: '3%', paddingLeft: '8%' }}>
                                <Checkbox
                                  value={checkSafeZone}
                                  onChange={(event) => setCheckSafeZone(event.currentTarget.checked)}
                                />
                            </Field>
                            <Field label="Safe zone [lux]" style={{ paddingRight: '2%', flex:1 }}>
                                <Input 
                                  value={safeZone} 
                                  name="safeZone" 
                                  type="number" 
                                  min="0" 
                                  max="65535"
                                  onChange={(e) => {
                                    const value = parseInt(e.currentTarget.value, 10);
                                    if (value >= 0 && value <= 65535) {
                                      setSafeZone(e.currentTarget.value);
                                    }
                                  }}
                                />
                            </Field>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center'}}>
                            <Button
                              onClick={handleDownlinkLightIntensity}
                              style={{
                                flex: 1,
                                marginTop: '1%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                            >Send light intensity settings
                            </Button>
                        </div>
                    </FieldSet>
                </Card>
            </div>
        </div>


        <div style={{ display: 'flex', marginLeft: '2%', marginRight: '1%'}}>           
            <Card style={{marginRight: '1%', flex: 1 }}>
                <FieldSet label="Common settings" >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Field style={{ paddingTop: '3%'}}>
                            <Checkbox
                              value={checkSendDataEvery}
                              onChange={(event) => setCheckSendDataEvery(event.currentTarget.checked)}
                            />
                        </Field>
                        <Field label="Send data every [s]" style={{flex:1}}>
                            <Input 
                              value={sendDataEvery} 
                              name="sendDataEvery" 
                              type="number" 
                              min="60" 
                              max="3600"
                              onChange={(e) => {
                                const value = parseInt(e.currentTarget.value, 10);
                                if (value >= 60 && value <= 3600) {
                                  setSendDataEvery(e.currentTarget.value);
                                }
                              }}
                            />
                        </Field>
                        <Field style={{ paddingTop: '3%', paddingLeft: '8%' }}>
                            <Checkbox
                              value={checkWorkingMode}
                              onChange={(event) => setCheckWorkingMode(event.currentTarget.checked)}
                            />
                        </Field>
                        <Field label="Working mode" style={{ paddingRight: '2%', flex:1 }}>
                            <Cascader
                              options={workingModeOptions}
                              initialValue={workingMode}
                              onSelect={(value) => setWorkingMode(value)}
                            />
                        </Field>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Field style={{ paddingTop: '3%'}}>
                            <Checkbox
                              value={checkNumberOfSamples}
                              onChange={(event) => setCheckNumberOfSamples(event.currentTarget.checked)}
                            />
                        </Field>
                        <Field label="Number of samples" style={{flex:1}}>
                            <Input 
                              value={numberOfSamples} 
                              name="numberOfSamples" 
                              type="number"
                              min="1" 
                              max="10"
                              onChange={(e) => {
                                const value = parseInt(e.currentTarget.value, 10);
                                if (value >= 1 && value <= 10) {
                                  setNumberOfSamples(e.currentTarget.value);
                                }
                              }}
                            />
                        </Field>
                        <Field style={{ paddingTop: '3%', paddingLeft: '8%' }}>
                            <Checkbox
                              value={checkTimezone}
                              onChange={(event) => setCheckTimezone(event.currentTarget.checked)}
                            />
                        </Field>
                        <Field label="Timezone" style={{ paddingRight: '2%', flex:1 }}>
                            <Cascader
                              options={timezoneOptions}
                              initialValue={timezone}
                              onSelect={(value) => setTimezone(value)}
                            />
                        </Field>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Field style={{ paddingTop: '3%'}}>
                            <Checkbox
                              value={checkPowerGrid}
                              onChange={(event) => setCheckPowerGrid(event.currentTarget.checked)}
                            />
                        </Field>
                        <Field label="Power grid [V]" style={{flex:1}}>
                            <Cascader
                              options={powerGridOptions}
                              initialValue={powerGrid}
                              onSelect={(value) => setpowerGrid(value)}
                            />
                        </Field>
                        <Field style={{ paddingTop: '3%', paddingLeft: '8%' }}>
                            <Checkbox
                              value={checkResetAndLoad}
                              onChange={(event) => setCheckResetAndLoad(event.currentTarget.checked)}
                            />
                        </Field>
                        <Field label="Reset and load" style={{ paddingRight: '2%', flex:1 }}>
                            <Cascader
                              options={resetAndLoadOptions}
                              initialValue={resetAndLoad}
                              onSelect={(value) => setResetAndLoad(value)}
                            />
                        </Field>
                    </div>

                    <label style={{ display: 'block', paddingLeft: '25px', marginTop: '1%', fontSize: '13px'}}>Send only selected</label>
                    <div style={{ display: 'flex', alignItems: 'center'}}>
                        <Checkbox 
                          style={{ flex:1}}
                          value={checkSendOnlySelected}
                          onChange={(event) => setCheckSendOnlySelected(event.currentTarget.checked)}
                        />
                        <PanelContainer style={{ display: 'flex', flexDirection: 'column', flex:1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2%', marginTop: '2%', marginRight: '2%'}}>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Relay state'
                                      value={checkRelayState}
                                      onChange={(event) => setCheckRelayState(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Number of changes'
                                      value={checkNumberOfChanges}
                                      onChange={(event) => setCheckNumberOfChanges(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Light intensity'
                                      value={checkLightIntensity}
                                      onChange={(event) => setCheckLightIntensity(event.currentTarget.checked)}
                                    />
                                </Field>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2%', marginRight: '2%'}}>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Battery voltage'
                                      value={checkBatteryVoltage}
                                      onChange={(event) => setCheckBatteryVoltage(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Battery percentage'
                                      value={checkBatteryPercentage}
                                      onChange={(event) => setCheckBatteryPercentage(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Battery temperature'
                                      value={checkBatteryTemperature}
                                      onChange={(event) => setCheckBatteryTemperature(event.currentTarget.checked)}
                                    />
                                </Field>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2%', marginRight: '2%'}}>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='RTC temperature'
                                      value={checkRTCTemperature}
                                      onChange={(event) => setCheckRTCTemperature(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Power line voltage'
                                      value={checkPowerLineVoltage}
                                      onChange={(event) => setCheckPowerLineVoltage(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Power line frequency'
                                      value={checkPowerLineFrequency}
                                      onChange={(event) => setCheckPowerLineFrequency(event.currentTarget.checked)}
                                    />
                                </Field>
                                
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2%', marginRight: '2%'}}>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Active energy'
                                      value={checkActiveEnergy}
                                      onChange={(event) => setCheckActiveEnergy(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Current'
                                      value={checkCurrent}
                                      onChange={(event) => setCheckCurrent(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Active power'
                                      value={checkActivePower}
                                      onChange={(event) => setCheckActivePower(event.currentTarget.checked)}
                                    />
                                </Field>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '2%', marginRight: '2%'}}>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Power factor'
                                      value={checkPowerFactor}
                                      onChange={(event) => setCheckPowerFactor(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Sunrise'
                                      value={checkSunrise}
                                      onChange={(event) => setCheckSunrise(event.currentTarget.checked)}
                                    />
                                </Field>
                                <Field style={{ flex:1}}>
                                    <Checkbox 
                                      label='Sunset'
                                      value={checkSunset}
                                      onChange={(event) => setCheckSunset(event.currentTarget.checked)}
                                    />
                                </Field>
                            </div>
                        </PanelContainer>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center'}}>
                        <Button
                          onClick={handleDownlinkCommonSettings}
                          style={{
                            flex: 1,
                            marginTop: '7%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                          }}
                        >Send common settings
                        </Button>
                    </div>
                </FieldSet>
            </Card>

            <div style={{ display: 'flex', marginLeft: '2%', marginRight: '1%', flex:1, flexDirection: 'column'}}>   
                <Card style={{ marginLeft: '1%', marginRight: '1%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <FieldSet label="Switching times settings" >
                        <div style={{ display: 'flex', alignItems: 'center' }}>                            
                            <Field style={{paddingRight: '2%'}}>
                                <Checkbox 
                                  label='On time 1:'
                                  value={checkOnTime1}
                                  onChange={(event) => setCheckOnTime1(event.currentTarget.checked)}
                                />
                            </Field>
                            <Field style={{flex:1, paddingRight: '2%'}}>
                                <RadioButtonGroup
                                  options={[
                                    { label: 'Time not set', value: '0' },
                                    { label: 'Set time:', value: '1' },
                                  ]}
                                  value={radioOnTime1}
                                  onChange={(value) => setRadioOnTime1(value)}
                                />
                            </Field>
                            <Field style={{flex:1,  paddingRight: '2%'}}>
                                <div>
                                    <TimeOfDayPicker
                                      value={onTime1} 
                                      onChange={setOnTime1}  
                                      showSeconds={true} 
                                    />
                                </div>
                            </Field>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>                            
                            <Field style={{paddingRight: '2%'}}>
                                <Checkbox 
                                  label='On time 2:'
                                  value={checkOnTime2}
                                  onChange={(event) => setCheckOnTime2(event.currentTarget.checked)}
                                />
                            </Field>
                            <Field style={{flex:1, paddingRight: '2%'}}>
                                <RadioButtonGroup
                                  options={[
                                    { label: 'Time not set', value: '0' },
                                    { label: 'Set time:', value: '1' },
                                  ]}
                                  value={radioOnTime2}
                                  onChange={(value) => setRadioOnTime2(value)}
                                />
                            </Field>
                            <Field style={{flex:1,  paddingRight: '2%'}}>
                                <div>
                                    <TimeOfDayPicker
                                      value={onTime2} 
                                      onChange={setOnTime2}  
                                      showSeconds={true} 
                                    />
                                </div>
                            </Field>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>                            
                            <Field style={{paddingRight: '2%'}}>
                                <Checkbox 
                                  label='On time 3:'
                                  value={checkOnTime3}
                                  onChange={(event) => setCheckOnTime3(event.currentTarget.checked)}
                                />
                            </Field>
                            <Field style={{flex:1, paddingRight: '2%'}}>
                                <RadioButtonGroup
                                  options={[
                                    { label: 'Time not set', value: '0' },
                                    { label: 'Set time:', value: '1' },
                                  ]}
                                  value={radioOnTime3}
                                  onChange={(value) => setRadioOnTime3(value)}
                                />
                            </Field>
                            <Field style={{flex:1,  paddingRight: '2%'}}>
                                <div>
                                    <TimeOfDayPicker
                                      value={onTime3} 
                                      onChange={setOnTime3}  
                                      showSeconds={true} 
                                    />
                                </div>
                            </Field>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>                            
                            <Field style={{paddingRight: '2%'}}>
                                <Checkbox 
                                  label='Off time 1:'
                                  value={checkOffTime1}
                                  onChange={(event) => setCheckOffTime1(event.currentTarget.checked)}
                                />
                            </Field>
                            <Field style={{flex:1, paddingRight: '2%'}}>
                                <RadioButtonGroup
                                  options={[
                                    { label: 'Time not set', value: '0' },
                                    { label: 'Set time:', value: '1' },
                                  ]}
                                  value={radioOffTime1}
                                  onChange={(value) => setRadioOffTime1(value)}
                                />
                            </Field>
                            <Field style={{flex:1,  paddingRight: '2%'}}>
                                <div>
                                    <TimeOfDayPicker
                                      value={offTime1} 
                                      onChange={setOffTime1}  
                                      showSeconds={true} 
                                    />
                                </div>
                            </Field>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>                            
                            <Field style={{paddingRight: '2%'}}>
                                <Checkbox 
                                  label='Off time 2:'
                                  value={checkOffTime2}
                                  onChange={(event) => setCheckOffTime2(event.currentTarget.checked)}
                                />
                            </Field>

                            <Field style={{flex:1, paddingRight: '2%'}}>
                                <RadioButtonGroup
                                  options={[
                                    { label: 'Time not set', value: '0' },
                                    { label: 'Set time:', value: '1' },
                                  ]}
                                  value={radioOffTime2}
                                  onChange={(value) => setRadioOffTime2(value)}
                                />
                            </Field>
                            <Field style={{flex:1,  paddingRight: '2%'}}>
                                <div>
                                    <TimeOfDayPicker
                                      value={offTime2} 
                                      onChange={setOffTime2}  
                                      showSeconds={true} 
                                    />
                                </div>
                            </Field>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center' }}>                            
                            <Field style={{paddingRight: '2%'}}>
                                <Checkbox 
                                  label='Off time 3:'
                                  value={checkOffTime3}
                                  onChange={(event) => setCheckOffTime3(event.currentTarget.checked)}
                                />
                            </Field>

                            <Field style={{flex:1, paddingRight: '2%'}}>
                                <RadioButtonGroup
                                  options={[
                                    { label: 'Time not set', value: '0' },
                                    { label: 'Set time:', value: '1' },
                                  ]}
                                  value={radioOffTime3}
                                  onChange={(value) => setRadioOffTime3(value)}
                                />
                            </Field>
                            <Field style={{flex:1,  paddingRight: '2%'}}>
                                <div>
                                    <TimeOfDayPicker
                                      value={offTime3} 
                                      onChange={setOffTime3}  
                                      showSeconds={true} 
                                    />
                                </div>
                            </Field>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center'}}>
                            <Button
                              onClick={handleDownlinkSwitchingTimes}
                              style={{
                                flex: 1,
                                marginTop: '1%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                          >Send switching times settings
                          </Button>
                        </div>
                    </FieldSet>
                </Card>


                <Card style={{ marginLeft: '1%', marginRight: '1%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <FieldSet label="Sunset / sunrise settings" >
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <label style={{ display: 'block', marginBottom: '3%', marginRight: '1%', fontSize: '12px'}}>Latitude</label>
                            <Field style={{flex:1}}>
                                <Input 
                                  value={latitude} 
                                  name="latitude" 
                                  type="number"
                                  step={0.0001}
                                  min="-90" 
                                  max="90"
                                  onChange={(e) => {
                                    const value = parseFloat(e.currentTarget.value);
                                    if (value >= -90 && value <= 90) {
                                      setLatitude(e.currentTarget.value);
                                    }
                                  }}
                                />
                            </Field>

                            <label style={{ display: 'block', marginBottom: '3%', marginLeft: '8%', marginRight: '1%', fontSize: '12px'}}>Longitude</label>
                            <Field style={{ paddingRight: '2%', flex:1 }}>
                                <Input 
                                  value={longitude} 
                                  name="longitude" 
                                  type="number"
                                  step={0.0001} 
                                  min="-180" 
                                  max="180"
                                  onChange={(e) => {
                                    const value = parseFloat(e.currentTarget.value);
                                    if (value >= -180 && value <= 180) {
                                      setLongitude(e.currentTarget.value);
                                    }
                                  }}
                                />
                            </Field>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center'}}>
                            <Button
                              onClick={handleDownlinkSunsetRise}
                              style={{
                                flex: 1,
                                marginTop: '1%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                              }}
                              >Send sunset / sunrise settings
                            </Button>
                        </div>
                    </FieldSet>
                </Card>
            </div>
        </div>
    </div>
  );
};
