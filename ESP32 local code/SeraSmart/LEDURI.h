#ifndef LED_H
#define LED_H

#include <Arduino.h>

class LEDURI
{
  private:
    int pin;
  public:
    LEDURI(int p);
    void begin();
    void porneste();
    void opreste();
};

#endif