/**
 * class to handle assignments in case of the state name and folder
 */
class assignhandlerClass {
    /**
     * @param adapter data of the adapter (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;

        this.assign = {
            Alarm: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.error',
                        },
                    },
                },
            },
            Battery: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            BatteryPercent: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.battery',
                            unit: '%',
                        },
                    },
                },
            },
            BatteryVoltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            batteryVoltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            BatV: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            BrokenSensor: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.error',
                        },
                    },
                },
            },
            CalibrationFailed: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.maintenance',
                        },
                    },
                },
            },
            ChildLock: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'switch.setting',
                        },
                    },
                },
            },
            ChildLockWhenOffline: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'switch.setting',
                        },
                    },
                },
            },
            Contact: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor',
                        },
                    },
                },
            },
            DoorOpen: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.door',
                        },
                    },
                },
            },
            ExternalTemperature: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level',
                        },
                    },
                },
            },
            ExtSensorTemperature: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                },
            },
            Gustspeed: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.speed',
                            unit: 'm/s',
                        },
                    },
                },
            },
            Hum_SHT: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.humidity',
                            unit: '%',
                        },
                    },
                },
            },
            Humidity: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.humidity',
                            unit: '%',
                        },
                    },
                },
            },
            Intervall: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.timer',
                        },
                    },
                },
            },
            KeepAliveTime: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: 'min',
                        },
                    },
                },
            },
            Light: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.brightness',
                            unit: 'Lux',
                        },
                    },
                },
            },
            LoRa_Voltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            LowBat: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.maintenance',
                        },
                    },
                },
            },
            Mode: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.mode.thermostat',
                            states: {
                                0: 'AUTO',
                                1: 'MANUAL',
                                2: 'VACATION',
                            },
                        },
                    },
                },
            },
            Mode2: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'switch.setting',
                        },
                    },
                },
            },
            MotorPosition: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.valve',
                            unit: 'INC',
                        },
                    },
                },
            },
            MotorRange: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: 'INC',
                        },
                    },
                },
            },
            NotAttachedBackplate: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.maintenance',
                        },
                    },
                },
            },
            Open: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor',
                        },
                    },
                },
            },
            Opened: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.window',
                        },
                    },
                },
            },
            OpenDoor: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.door',
                        },
                    },
                },
            },
            OpenWindow: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.window',
                        },
                    },
                },
            },
            OpenWindowDetection: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'switch.setting',
                        },
                    },
                },
            },
            Pressure: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.pressure',
                            unit: 'mBar',
                        },
                    },
                },
            },
            Rainfall: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.rain',
                            unit: 'mm',
                        },
                    },
                },
            },
            RelativeHumidity: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.humidity',
                            unit: '%',
                        },
                    },
                },
            },
            SensorTemperature: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            SetAutoMode: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'switch.setting',
                        },
                    },
                },
            },
            Soilconductivity: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value',
                            unit: 'µs/cm',
                        },
                    },
                },
            },
            Soilmoisture: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value',
                            unit: 'vol-%',
                        },
                    },
                },
            },
            Soiltemperature: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Supply_Voltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            TargetTemperature: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.temperature',
                            unit: '°C',
                        },
                    },
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                    'uplink.decoded.HeatingEvents.0': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                    'uplink.decoded.HeatingEvents.1': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                    'uplink.decoded.HeatingEvents.2': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                    'uplink.decoded.HeatingEvents.3': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                    'uplink.decoded.HeatingEvents.4': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                    'uplink.decoded.HeatingEvents.5': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                    'uplink.decoded.HeatingEvents.6': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                    'uplink.decoded.HeatingEvents.7': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                },
            },
            TargetTemperatureFloat: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                },
            },
            TempC_DS: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            TempC_SHT: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Temperature: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Timestamp: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'date',
                        },
                    },
                },
            },
            Uvi: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.uv',
                        },
                    },
                },
            },
            ValveOpenness: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.valve',
                            unit: '%',
                        },
                    },
                },
            },
            value: {
                approvedFolders: {
                    'uplink.decoded.battery_voltage': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'mV',
                        },
                    },
                    'uplink.decoded.heating_control.room_temperature': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Value: {
                approvedFolders: {
                    'uplink.decoded.battery_voltage': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'mV',
                        },
                    },
                    'uplink.decoded.heating_control.room_temperature': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Volt: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            Voltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            voltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            WaterLeakStatus: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.alarm.flood',
                        },
                    },
                },
            },
            Winddirection: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.direction.wind',
                            unit: '°',
                        },
                    },
                },
            },
            WindowOpen: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.window',
                        },
                    },
                },
            },
            Windspeed: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.speed',
                            unit: 'm/s',
                        },
                    },
                },
            },
        };
    }

    /*********************************************************************
     * ********************* Execution of Assigns  ***********************
     * ******************************************************************/

    /**
     * @param id id wich is assignable
     * @param value value of the assignable id
     * @param assigndata datastructure to assign
     * @param options options to assign (eg. common)
     */
    executeAssign(id, value, assigndata, options) {
        const activeFunction = 'executeAssign';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            // check folder
            const baseInfo = this.adapter.getBaseDeviceInfo(id);
            const subfolder = id.slice(
                baseInfo.objectStartDirectory.length + 1,
                id.length - baseInfo.changedState.length - 1,
            );
            if (assigndata.approvedFolders && assigndata.approvedFolders[subfolder]) {
                return assigndata.approvedFolders[subfolder].assignfunction(
                    id,
                    value,
                    assigndata.approvedFolders[subfolder],
                    options,
                );
            }
            return value;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ******************* Assign of common values ***********************
     * ******************************************************************/

    /**
     * @param id id wich is assignable
     * @param value value of the assignable id
     * @param assigndata datastructure to assign
     * @param options options to assign (eg. common)
     */
    commonAssign(id, value, assigndata, options) {
        for (const element in assigndata.common) {
            options.common[element] = assigndata.common[element];
        }
        return value;
    }
}

module.exports = assignhandlerClass;
