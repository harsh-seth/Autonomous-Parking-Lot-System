#include <LiquidCrystal.h>

LiquidCrystal lcd(6,7,5,4,3,2); 
int trigger=10;
int echo=11;
float duration=0, distance=0, timeout=38000;

/*
	* LiquidCrystal(rs, enable, d4, d5, d6, d7) 
	* rs: the number of the Arduino pin that is connected to the RS pin on the LCD
	* rw: the number of the Arduino pin that is connected to the RW pin on the LCD (optional)
	* enable: the number of the Arduino pin that is connected to the enable pin on the LCD
	* d0, d1, d2, d3, d4, d5, d6, d7: the numbers of the Arduino pins that are connected to the corresponding data pins on the LCD. d0, d1, d2, and d3 are optional; if omitted, the LCD will be controlled using only the four data lines (d4, d5, d6, d7).
*/ 


void setup() {
	lcd.begin(16,2);
	pinMode(trigger,OUTPUT);
	pinMode(echo,INPUT);
	lcd.print("Initializing...");
	delay(200);
}

void loop() {
	lcd.clear();
	analogWrite(9, 10); //for the contrast
	digitalWrite(trigger,LOW);
	delayMicroseconds(2);
	digitalWrite(trigger,HIGH);
	delayMicroseconds(10);
	digitalWrite(trigger,LOW);
	duration=pulseIn(echo, HIGH, timeout);
	// calculate distance in centimeters
	distance=duration*344/20000;
	if( distance == 0 ) {
		lcd.print("target out of");
		lcd.setCursor(0,1);
		lcd.print("reach"); 
	} else { 
		lcd.print("Dist: ");
		lcd.print(distance);
		lcd.print(" cm");
		lcd.setCursor(0,1);
		lcd.print("Dist: ");
		lcd.print(distance*0.393701);
		lcd.print(" inch");
	}
	delay(1000);
}

