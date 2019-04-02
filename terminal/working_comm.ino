#include <SoftwareSerial.h>

SoftwareSerial mySerial(2,3); // RX, TX
//const int btPower = 8;
String readString;
const int trigPin1 = 12;
const int echoPin1 = 13;
const int trigPin2 = 4;
const int echoPin2 = 5;
long duration1;
int distance1;
long duration2;
int distance2;
void setup()  
{
//  pinMode(btPower,OUTPUT);
  //digitalWrite(btPower,LOW);
  pinMode(trigPin1, OUTPUT); // Sets the trigPin as an Output
  pinMode(echoPin1, INPUT); // Sets the echoPin as an Input
  pinMode(trigPin2, OUTPUT); // Sets the trigPin as an Output
  pinMode(echoPin2, INPUT); // Sets the echoPin as an Input
  Serial.begin(9600);  // initialize serial communications at 9600 bps
  mySerial.begin(9600);
}

void loop()
{
  
    if (mySerial.available() >0)
    {
      readString  = mySerial.readString(); //makes the string readString
    

  // Clears the trigPin
  digitalWrite(trigPin1, LOW);
  delayMicroseconds(2);
  // Sets the trigPin on HIGH state for 10 micro seconds
  digitalWrite(trigPin1, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin1, LOW);
  // Reads the echoPin, returns the sound wave travel time in microseconds
  duration1 = pulseIn(echoPin1, HIGH);
  // Calculating the distance
  distance1 = duration1*0.034/2;
  // Clears the trigPin
  digitalWrite(trigPin2, LOW);
  delayMicroseconds(2);
  // Sets the trigPin on HIGH state for 10 micro seconds
  digitalWrite(trigPin2, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin2, LOW);
  // Reads the echoPin, returns the sound wave travel time in microseconds
  duration2 = pulseIn(echoPin2, HIGH);
  // Calculating the distance
  distance2 = duration2*0.034/2;
  // Prints the distance on the Serial Monitor

  String distance = String(distance1+distance2);
  String payLoad = (distance + "," + readString);
  Serial.println(payLoad);
//  delay(500);
//  digitalWrite(btPower,HIGH);
//  delay(500);
//  digitalWrite(btPower,LOW);
  delay(500);

  // serial write section
  //Serial.flush();
    }
}
