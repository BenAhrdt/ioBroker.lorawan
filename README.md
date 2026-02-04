![Logo](admin/lorawan.png)
# ioBroker.lorawan

[![NPM version](https://img.shields.io/npm/v/iobroker.lorawan.svg)](https://www.npmjs.com/package/iobroker.lorawan)
[![Downloads](https://img.shields.io/npm/dm/iobroker.lorawan.svg)](https://www.npmjs.com/package/iobroker.lorawan)
![Number of Installations](https://iobroker.live/badges/lorawan-installed.svg)
![Number of Installations](https://iobroker.live/badges/lorawan-stable.svg)
![Test and Release](https://github.com/BenAhrdt/ioBroker.lorawan/workflows/Test%20and%20Release/badge.svg)
[![Donate](https://img.shields.io/badge/paypal-donate%20|%20spenden-blue.svg)](https://paypal.me/besc83)

[![NPM](https://nodei.co/npm/iobroker.lorawan.png?downloads=true)](https://nodei.co/npm/iobroker.lorawan/)

## lorawan adapter for ioBroker
The adapter communicates bidirectionally with LoraWan devices via LoRaWAN Network Server via MQTT protocol.
“The Thinks Network” and “Chirpstack” are supported now, more could follow later. 
Adapter was created in collaboration with Joerg Froehner LoraWan@hafenmeister.com

The documentation Wiki is here: https://github.com/BenAhrdt/ioBroker.lorawan/wiki
<br/>
For now there is documentation in English here: https://wiki.hafenmeister.de

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* (BenAhrdt) more informations about devices wich are sendet ToIob

### 1.20.44 (2026-02-04)
* (BenAhrdt) add possibility to see devices wiche are sendet ToIob

### 1.20.43 (2026-02-03)
* (BenAhrdt) add value.power.active and value.power.reactive ...

### 1.20.42 (2026-02-03)
* (BenAhrdt) adisplay the id name in form (name1, name2, name3)
* (BenAhrdt) add more iconassigns in order to role detection

### 1.20.41 (2026-02-02)
* (BenAhrdt) update device information and icons

### 1.20.40 (2026-02-02)
* (BenAhrdt) update Form Width in Device Details

### 1.20.39 (2026-02-01)
* (BenAhrdt) update DeviceProfile

### 1.20.38 (2026-02-01)
* (BenAhrdt) add min / max to form

### 1.20.37 (2026-02-01)
* (BenAhrdt) show Values (at bridge device) and Downlinks (at lorawan device) in Device Details flexible

### 1.20.36 (2026-01-31)
* (BenAhrdt) add more details to lorawan and bridged devices
* (BenAhrdt) change some logging

### 1.20.35 (2026-01-31)
* (BenAhrdt) display actual device values for foreign devices

### 1.20.34 (2026-01-30)
* (BenAhrdt) starup bridge device with battery value

### 1.20.33 (2026-01-30)
* (BenAhrdt) first step of role detectiopn in bridged devices

### 1.20.32 (2026-01-30)
* (BenAhrdt) change icon for default

### 1.20.31 (2026-01-30)
* (BenAhrdt) Add colors to DeviceInfo and Details to Bridge Devices

### 1.20.30 (2026-01-30)
* (BenAhrdt) Devices sorted alphabetically for Device Manager

### 1.20.29 (2026-01-30)
* (BenAhrdt) bugfix entity type

### 1.20.28 (2026-01-30)
* (BenAhrdt) showing experimental foreign devices

### 1.20.27 (2026-01-29)
* (BenAhrdt) bugfix rolehandling

### 1.20.26 (2026-01-29)
* (BenAhrdt) bring objectstore and deviceManager functions in new structure for future devices

### 1.20.25 (2026-01-28)
* (BenAhrdt) improve number of role detection

### 1.20.24 (2026-01-28)
* (BenAhrdt) change info Form to Detail button

### 1.20.23 (2026-01-28)
* (BenAhrdt) change role display and icons

### 1.20.22 (2026-01-27)
* (BenAhrdt) change preasure quere to pressure

### 1.20.21 (2026-01-27)
* (BenAhrdt) set Details to informations and add icons for weateher station / humidity

### 1.20.20 (2026-01-27)
* (BenAhrdt) icon assign changed

### 1.20.19 (2026-01-27)
* (BenAhrdt) bugfix incon set

### 1.20.18 (2026-01-27)
* (BenAhrdt) bugfix nameing incomingTopic

### 1.20.17 (2026-01-27)
* (BenAhrdt) implement Device details

### 1.20.16 (2026-01-27)
* (BenAhrdt) add informations to device Manager

### 1.20.15 (2026-01-26)
* (BenAhrdt) sort output for informations

### 1.20.14 (2026-01-26)
* (BenAhrdt) insert node

### 1.20.13 (2026-01-26)
* (BenAhrdt) remove nod from crypto

### 1.20.12 (2026-01-26)
* (BenAhrdt) check for update

### 1.20.11 (2026-01-26)
* (BenAhrdt) improve device Manager icons and Buttons

### 1.20.10 (2026-01-26)
* (BenAhrdt) return to root getCnageInfo

### 1.20.9 (2026-01-26)
* (BenAhrdt) experimental for form

### 1.20.8 (2026-01-26)
* (BenAhrdt) changes in objectStore

### 1.20.7 (2026-01-25)
* (BenAhrdt) bugfix correct writing of indicators

### 1.20.6 (2026-01-25)
* (BenAhrdt) updateing assignhandler und modifying indicators and informations

### 1.20.5 (2026-01-25)
* (BenAhrdt) bugfixing updating object Store with not alowed id

### 1.20.4 (2026-01-25)
* (BenAhrdt) experimental to debug in live system

### 1.20.3 (2026-01-25)
* (BenAhrdt) bugfix device Manager

### 1.20.2 (2026-01-25)
* (BenAhrdt) bugfix device Manager and objectStore device checks

### 1.20.1 (2026-01-25)
* (BenAhrdt) bugfix device Manager

### 1.20.0 (2026-01-25)
* (BenAhrdt) add first Steps of device Manager

### Older entries
[here](OLD_CHANGELOG.md)

## License
MIT License

Copyright (c) 2025-2026 BenAhrdt <bsahrdt@gmail.com>  
Copyright (c) 2025-2026 Joerg Froehner <LoraWan@hafenmeister.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## DISCLAIMER
The rights of the trademarks and company names,
remain with their owners and have no relation to this adapter.
The fairuse policy must continue to be adhered to by the operator of the adapter.
If this repository is forked, it must be cited as the source.

LoRa® is a registered trademark or service
mark of Semtech Corporation or its affilantes.

LoRaWAN® is a licensed mark.
