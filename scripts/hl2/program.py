#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import binascii
import time
from hl2.com import *

MAX_FIRMWARE_SIZE = 0x58000
DATA_CHUNK_SIZE   = 256

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
        error = False
        while self.get_char() != 'o' :
            if self.get_char() == 'e' :
                error = True
                break
        return error

    def send_size(self):
        error = True
        while error:
            self.put_int(self.firmware_length)
            error = self.wait_ok()

    def send_data(self, data):
        error = True
        data_checksum = binascii.crc32(data)
        while error:
            self.put_char('d')
            error = self.wait_ok()
            if not error:
                self.put_int(data_checksum)
                error = self.wait_ok()
                if not error:
                    self.put_array(data)
                    error = self.wait_ok()

    def send_firmware(self):
        self.send_size()
        data_send = 0
        while data_send < self.firmware_length:
            buffer = self.firmware[data_send:data_send+DATA_CHUNK_SIZE]
            self.send_data(buffer)
            data_send += len(buffer)

    def send_checksum(self):
        error = True
        firmware_checksum = binascii.crc32(self.firmware)
        while error:
            self.put_char('c')
            error = self.wait_ok()
            if not error:
                self.put_int(firmware_checksum)
                error = self.wait_ok()
        
    def start(self):
        self.usb.write('update()\r\n'.encode())
        self.usb.close()
        time.sleep(2)
        self.usb.open()
        self.handshake()
        self.send_firmware()
        self.send_checksum()
        self.deinit()