#!/usr/bin/env python
# -*- coding: utf-8 -*-

import sys
import os
import serial
import struct
import binascii
import time
from serial.tools import list_ports

VID = 0x1FC9
PID = 0x0083

class HepiaLight2Communicator:
    def __init__(self):
        self.port = None
        self.usb = None
        device_list = list_ports.comports()
        for device in device_list:
            if (device.vid == VID and device.pid == PID):
                self.port = device.device
                break
        if self.port != None:
            self.usb = serial.Serial(self.port)
            print("hepiaLight2 connected at port {}".format(self.port))
        else:
            print("No hepiaLight2 connected")
        
    def deinit(self):
        self.usb.close()
        
    def put_char(self, char):
        self.usb.write(char.encode())

    def put_string(self, string):
        com.usb.write(string.encode())
        
    def put_int(self, int):
        self.usb.write(struct.pack('>I', int))
        
    def put_array(self, data):
        self.usb.write(data)
        
    def get_char(self):
        return self.usb.read().decode()
        
    def wait_char(self, char):
        while self.get_char() != char :
            pass
            
if __name__ == "__main__":
    if len(sys.argv) <= 1:
        com = HepiaLight2Communicator()
    else :
        string = sys.argv[1]
        com = HepiaLight2Communicator()
        if com.usb != None:
            com.put_string(string)
    if com.usb != None:      
        com.deinit()
