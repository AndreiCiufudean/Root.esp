#ifndef MOSFET_H
#define MOSFET_H

#include <Arduino.h>

class Mosfet
{
  private:
    int pin;
  public:
    Mosfet(int p);
    void begin();
    void porneste();
    void opreste();
};

#endif MOSFET_H