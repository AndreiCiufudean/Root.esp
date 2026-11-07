#pragma once
#define DHT11 11
class DHT {public:DHT(int,int){} void begin(){} float readTemperature(){return 22.5f;} float readHumidity(){return 50.f;}};
