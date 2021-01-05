// INSPIRED BY https://github.com/benelgiac/PyVisca3/blob/master/pyviscalib/visca.py
// 
//    PyVisca-3 Implementation of the Visca serial protocol in python3
//    based on PyVisca (Copyright (C) 2013  Florian Streibelt
//    pyvisca@f-streibelt.de).
//
//    Author: Giacomo Benelli benelli.giacomo@aerialtronics.com
//
//    This program is free software; you can redistribute it &&/or modify
//    it under the terms of the GNU General Public License as published by
//    the Free Software Foundation, version 2 only.
//
//    This program is distributed in the hope that it will be useful,
//    but WITHOUT ANY WARRANTY; without even the implied warranty of
//    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//    GNU General Public License for more details.
//
//    You should have received a copy of the GNU General Public License
//    along with this program; if not, write to the Free Software
//    Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301
//    USA

// PyVisca-3 by Giacomo Benelli <benelli.giacomo@gmail.com>

// For this JavaScript version, we eliminate all synchronous reads to the socket
// in favor of using callbacks.

const { ViscaController } = require('./controller');
module.exports = { ViscaController };
