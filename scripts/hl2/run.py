#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
from hl2.com import *

INSTRUCTION_INTERVAL = 50
EOL                  = '\r\n'
BACKSPACE            = '\x08'
BREAK                = '\x03'

class HepiaLight2Uploader(HepiaLight2Communicator):
    def __init__(self, path):
        super().__init__()
        with open(path, 'rb') as fp :
            self.lines = fp.readlines()

    def send_line(self, line):
        command = ''
        indentation = 0

        for i in range(len(line)):
            if line[i] != ' ':
                indentation = -1 if i % 4 else i
                break

        if indentation < self.last_indentation:
            nb_backspace = int((self.last_indentation - indentation) / 4)
            for i in range(nb_backspace):
                command += BACKSPACE
            if indentation == 0:
                command += EOL

        self.last_indentation = indentation

        command += line.strip()
        command += EOL
        self.put_string(command)

    def send_file(self):
        self.put_string(BREAK)
        self.last_indentation = 0
        for line in self.lines:
            if (line and line != b'\n'):
                self.send_line(line.decode())
                time.sleep(INSTRUCTION_INTERVAL / 1000)
        self.send_line('')
