

# coding: utf-8

# In[1]:


# Tested on Ubuntu 18.04 run with sudo access
import serial
import time
import requests


# In[1]:


server_url = "https://whispering-wildwood-83333.herokuapp.com"
authenticate_path = "/authenticate"
post_request_path = "/toggleBooking"


# In[2]:


def get_auth_token():    
    res = requests.post(server_url + authenticate_path,{'username':'terminal2','password':'terminal1234'})
    return res.json()['auth_token']

def get_class(length):
    for i in range(len(class_boundaries)-1):
        if(length >= class_boundaries[i] and length < class_boundaries[i+1]):
            return i

def makeRequestServer(auth_token, client_token, len_class):
    req_body = {'auth_token': auth_token,'client_auth_token':client_token, 'size': len_class}
    res = requests.post( server_url + post_request_path, req_body)
    res_json = res.json()
    res_status = res_json["status"]
    if  res_status in ["bookParkingOK", "freeParkingOK"]:
        print(res_json["message"])
    else:
        print("Problem at site: ", res_json["message"])       


# In[3]:


#The following line is for serial over GPIO
port = '/dev/ttyACM1'

sensor_distance = 200
class_boundaries = [150,165,180,200]

ard = serial.Serial(port,9600,timeout=5)


# In[4]:


terminal_token = get_auth_token()
print("Terminal started at this lot. Listening to all incoming user requests.")
while (1):  
	payload = ard.readline()
	if(payload.decode() != ""):
		payload = payload.decode().strip().split(',')
		measurement = int(payload[0])
		client_auth_token = payload[1]
		vehicle_width = sensor_distance - measurement
		length_class = get_class(vehicle_width)
		# print(payload)
		makeRequestServer(terminal_token, client_auth_token, length_class)
