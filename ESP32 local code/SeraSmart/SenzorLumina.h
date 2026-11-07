#ifndef S_LUMINA_H
#define S_LUMINA_H

#include <Arduino.h>

class SenzorLumina{
  private:
    int pin;
    const int valmin=0;
    const int valmax=4095;
  public:
    SenzorLumina(int p);
    void begin();
    float CitesteLux(); // procent estimat 0-100, NU lux
};
#endif // S_LUMINA_H

