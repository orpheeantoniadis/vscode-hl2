from utime import *

f = open('hello.txt', 'w+')
f.close()

counter = 0

for i in range(15):
    with open('hello.txt', 'a') as file:
        for j in range(10):
            lenght = file.write("hello\n")
            counter += 1
            print(counter)
