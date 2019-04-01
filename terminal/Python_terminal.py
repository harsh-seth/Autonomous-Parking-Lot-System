import serial
import time
port = '/dev/ttyACM2' #port on which Serial input from arduino is read


ard = serial.Serial(port,9600,timeout=5)
while (1):  
    length = ard.readline() # read everything in the input buffer
    accesstoken = ard.readline()
    if(length.decode()!=""):
        print(length.decode())
    if(accesstoken.decode()!=""):
        print(accesstoken.decode())
