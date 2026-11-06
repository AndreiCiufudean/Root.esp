#ifndef DHT11_H
#define DHT11_h

#include <Arduino.h>
#include <DHT.h>

class SenzorDHT11
{
  private:
    int pin;
    DHT dht;
  public:
    SenzorDHT11(int p, int tip=DHT11);
    void begin();
    int CitireTemperatura();
    int CitireUmiditate();
};

#endif DHT11_H