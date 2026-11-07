#ifndef S_UMIDITATESOL_H
#define S_UMIDITATESOL_H

#include <Arduino.h>

class SenzorUmiditateSol
{
  private:
    int pin;
    const int umed=1100; // CALIBRATE on real wet soil (ESP32 ADC)
    const int uscat=3100; // CALIBRATE on real dry soil (ESP32 ADC)
  public:
    SenzorUmiditateSol(int p);
    void begin();
    int CitireUmiditateSol(); // in procente
};

#endif // S_UMIDITATESOL_H