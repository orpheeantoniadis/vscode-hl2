#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import binascii
import time
from hl2.com import *

MAX_FIRMWARE_SIZE = 0x58000
SEND_BUFFER_SIZE  = 256

class HepiaLight2Programmer(HepiaLight2Communicator):
    def __init__(self, firmware_path):
        super().__init__()
        with open(firmware_path, 'rb') as firmware_file :
            self.firmware = bytearray(firmware_file.read(MAX_FIRMWARE_SIZE))
            self.firmware_length = os.path.getsize(firmware_path)
            
    def handshake(self):
        self.put_char('r')
        self.wait_char('r')
        
    def wait_ok(self):
        self.wait_char('o')
        
    def send_firmware(self):
        self.put_int(self.firmware_length)
        self.wait_ok()
        data_send = 0
        while data_send < self.firmware_length:
            buffer = self.firmware[data_send:data_send+SEND_BUFFER_SIZE]
            error = False
            self.put_char('d')
            self.wait_ok()
            self.put_int(binascii.crc32(buffer))
            self.wait_ok()
            self.put_array(buffer)
            while self.get_char() != 'o' :
                if self.get_char() == 'e' :
                    error = True
                    break
            if not error :
                data_send += len(buffer)
                
    def send_checksum(self):
        self.put_char('c')
        self.put_int(binascii.crc32(self.firmware))
        
    def start(self):
        self.usb.write('update()\r\n'.encode())
        self.usb.close()
        time.sleep(2)
        self.usb.open()
        self.handshake()
        self.send_firmware()
        self.send_checksum()
        self.deinit()