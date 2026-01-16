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

For Documentation use the doc folder.
For now there is documentation in English here: https://wiki.hafenmeister.de

## Changelog
<!--
	Placeholder for the next version (at the beginning of the line):
	### **WORK IN PROGRESS**
-->
### **WORK IN PROGRESS**
* (BenAhrdt) bugfix await this.ObjectExists

### 1.19.31 (2026-01-16)
* (BenAhrdt) add try catch for adding filter (strage bug)

### 1.19.30 (2026-01-16)
* (BenAhrdt) add simulation of Position for cover

### 1.19.29 (2026-01-16)
* (BenAhrdt) bugfix tilt min & max

### 1.19.28 (2026-01-16)
* (BenAhrdt) add logging possibility info, debug, warn, error to internal logging

### 1.19.27 (2026-01-15)
* (BenAhrdt) setting internal logging to debug path in bridge and query the json entries

### 1.19.26 (2026-01-15)
* (BenAhrdt) build internal logging

### 1.19.25 (2026-01-14)
* (BenAhrdt) handle promise rejection before publish

### 1.19.24 (2026-01-14)
* (BenAhrdt) assign Filter at startup
* (BenAhrdt) bugfix assign color temperature id in case of no color is configed

### 1.19.23 (2026-01-13)
* (BenAhrdt) more debuglogging in foreignDiscover

### 1.19.22 (2026-01-13)
* (BenAhrdt) change Check getForeigenObjectAsync to foreignObjectExists (chek config objects)

### 1.19.21 (2026-01-13)
* (BenAhrdt) add color Termperature mode to foreign light config

### 1.19.20 (2026-01-12)
* (BenAhrdt) bugfix virtual ending

### 1.19.19 (2026-01-12)
* (BenAhrdt) change id building of more then one spezial entity (same type) in one device
* (BenAhrdt) add state of cover in type number (limit switch) with common states.

### 1.19.18 (2026-01-11)
* (BenAhrdt) bugfix startwith

### 1.19.17 (2026-01-11)
* (BenAhrdt) Change assign of cover logic command in case of number

### 1.19.16 (2026-01-11)
* (BenAhrdt) bugfix Foreign Cover (getForeignState)

### 1.19.15 (2026-01-11)
* (BenAhrdt) add new bugfixes cover

### 1.19.14 (2026-01-11)
* (BenAhrdt) bugfixes cover

### 1.19.13 (2026-01-11)
* (BenAhrdt) first test with number for cover config

### 1.19.12 (2026-01-05)
* (BenAhrdt) bug with git credentials

### 1.19.11 (2026-01-05)
* (BenAhrdt) add role button to bridge devices

### 1.19.10 (2026-01-05)
* (BenAhrdt) bugfix reading state

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
